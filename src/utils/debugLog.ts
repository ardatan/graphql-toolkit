export function debugLog(...args: any[]): void {
  if (process && process.env && process.env.DEBUG) {
    console.log(...args);
  }
}