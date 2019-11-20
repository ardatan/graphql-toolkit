import { file, FileCallback } from 'tmp'

export const createTmpFile = (options: any) => new Promise<{ name: string, cleanupCallback: Function }>((resolve, reject) => {
  const callback: FileCallback = (err: Error, filename: string, cleanupCallback: any) => {
    if (err) {
      reject(err)
    }
    else {
      resolve({
        cleanupCallback,
        name: filename,
      })
    }
  }

  file(options, callback)
})
