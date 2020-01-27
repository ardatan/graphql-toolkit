export function debugLog(...args: any[]): void {
  if (process && process.env && process.env.DEBUG && !process.env.GQL_TOOLKIT_NODEBUG) {
    // tslint:disable-next-line: no-console
    console.log(...args);
  }
}
