// Will use the shortest indention as an axis
export const freeText = text => {
  if (text instanceof Array) {
    text = text.join('');
  }

  // This will allow inline text generation with external functions, same as ctrl+shift+c
  // As long as we surround the inline text with ==>text<==
  text = text.replace(/( *)==>((?:.|\n)*?)<==/g, (match, baseIndent, content) => {
    return content
      .split('\n')
      .map(line => `${baseIndent}${line}`)
      .join('\n');
  });

  const lines = text.split('\n');

  const minIndent = lines
    .filter(line => line.trim())
    .reduce((minIndent, line) => {
      const currIndent = line.match(/^ */)[0].length;

      return currIndent < minIndent ? currIndent : minIndent;
    }, Infinity);

  return lines
    .map(line => line.slice(minIndent))
    .join('\n')
    .trim()
    .replace(/\n +\n/g, '\n\n');
};

// foo_barBaz -> ['foo', 'bar', 'Baz']
export const splitWords = str => {
  return str.replace(/[A-Z]/, ' $&').split(/[^a-zA-Z0-9]+/);
};

// upper -> Upper
export const toUpperFirst = str => {
  return str.substr(0, 1).toUpperCase() + str.substr(1).toLowerCase();
};

// foo-bar-baz -> fooBarBaz
export const toCamelCase = str => {
  const words = splitWords(str);
  const first = words.shift().toLowerCase();
  const rest = words.map(toUpperFirst);

  return [first, ...rest].join('');
};
