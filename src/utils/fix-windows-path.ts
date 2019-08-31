import { sep } from 'path';

export const fixWindowsPath = (path: string) => path.split('\\').join(sep);
