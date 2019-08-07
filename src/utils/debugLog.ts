export function debugLog(...args: any[]): void {
  if (process && process.env && process.env.DEBUG && !process.env.GQL_TOOLKIT_NODEBUG) {
    console.log(...args);
  }
}
