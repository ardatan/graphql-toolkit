import { Source, isDocumentString, parseGraphQLSDL, asArray, printSchemaWithDirectives } from '@graphql-toolkit/common';
import { isSchema, Kind, parse } from 'graphql';
import isGlob from 'is-glob';
import { LoadTypedefsOptions } from '../load-typedefs';
import { loadFile } from './load-file';
import { stringToHash, useStack, StackNext } from '../utils/helpers';
import { useCustomLoader } from '../utils/custom-loader';
import { useQueue } from '../utils/queue';

type AddSource = (data: { pointer: string; source: Source; noCache?: boolean }) => void;
type AddGlob = (data: { pointer: string; pointerOptions: any }) => void;
type AddToQueue<T> = (fn: () => Promise<T> | T) => void;

export async function collectSources<TOptions>({
  pointerOptionMap,
  options,
}: {
  pointerOptionMap: {
    [key: string]: any;
  };
  options: LoadTypedefsOptions<Partial<TOptions>>;
}): Promise<Source[]> {
  const sources: Source[] = [];
  const globs: string[] = [];
  const globOptions: any = {};
  const queue = useQueue<void>({ concurrency: 50 });
  const unixify = await import('unixify').then(m => m.default || m);

  const addSource: AddSource = ({
    pointer,
    source,
    noCache,
  }: {
    pointer: string;
    source: Source;
    noCache?: boolean;
  }) => {
    sources.push(source);

    if (!noCache) {
      options.cache[pointer] = source;
    }
  };

  const collect = useStack(collectDocumentString, collectGlob, collectCustomLoader, collectFallback);

  const addGlob: AddGlob = ({ pointerOptions, pointer }) => {
    globs.push(pointer);
    Object.assign(globOptions, pointerOptions);
  };

  for (const pointer in pointerOptionMap) {
    const pointerOptions = {
      ...(pointerOptionMap[pointer] ?? {}),
      unixify,
    };

    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      addGlob,
      queue: queue.add,
    });
  }

  if (globs.length) {
    if (options.ignore) {
      const ignoreList = asArray(options.ignore)
        .map(g => `!(${g})`)
        .map<string>(unixify);

      if (ignoreList.length > 0) {
        globs.push(...ignoreList);
      }
    }

    const { default: globby } = await import('globby');
    const paths = await globby(globs, { absolute: true, ...options, ignore: [] });
    const collectFromGlobs = useStack(collectCustomLoader, collectFallback);

    for (let i = 0; i < paths.length; i++) {
      const pointer = paths[i];

      collectFromGlobs({
        pointer,
        pointerOptions: globOptions,
        pointerOptionMap,
        options,
        addSource,
        addGlob: () => {
          throw new Error(`I don't accept any new globs!`);
        },
        queue: queue.add,
      });
    }
  }

  await queue.runAll();

  return sources;
}

type CollectOptions<T> = {
  pointer: string;
  pointerOptions: any;
  options: LoadTypedefsOptions<Partial<T>>;
  pointerOptionMap: Record<string, any>;
  addSource: AddSource;
  addGlob: AddGlob;
  queue: AddToQueue<void>;
};

function addResultOfCustomLoader({
  pointer,
  result,
  addSource,
}: {
  pointer: string;
  result: any;
  addSource: AddSource;
}) {
  if (isSchema(result)) {
    addSource({
      source: {
        location: pointer,
        schema: result,
        document: parse(printSchemaWithDirectives(result)),
      },
      pointer,
      noCache: true,
    });
  } else if (result.kind && result.kind === Kind.DOCUMENT) {
    addSource({
      source: {
        document: result,
        location: pointer,
      },
      pointer,
    });
  } else if (result.document) {
    addSource({
      source: {
        location: pointer,
        ...result,
      },
      pointer,
    });
  }
}

function collectDocumentString<T>(
  { pointer, pointerOptions, options, addSource, queue }: CollectOptions<T>,
  next: StackNext
) {
  if (isDocumentString(pointer)) {
    return queue(async () => {
      const source = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, {
        ...options,
        ...pointerOptions,
      });

      addSource({
        source,
        pointer,
      });
    });
  }

  next();
}

function collectGlob<T>({ pointer, pointerOptions, addGlob }: CollectOptions<T>, next: StackNext) {
  if (isGlob(pointerOptions.unixify(pointer))) {
    return addGlob({
      pointer: pointerOptions.unixify(pointer),
      pointerOptions,
    });
  }

  next();
}

function collectCustomLoader<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(async () => {
      const loader = await useCustomLoader(pointerOptions.loader, options.cwd);
      const result = await loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (!result) {
        return;
      }

      addResultOfCustomLoader({ pointer, result, addSource });
    });
  }

  next();
}

function collectFallback<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
  return queue(async () => {
    const source = await loadFile(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (source) {
      addSource({ source, pointer });
    }
  });
}
