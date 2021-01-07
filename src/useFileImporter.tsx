import { useCallback, useRef } from 'react'
import { getFilesDatabase } from './db'
import { addFile } from './addFile'
import { queryClient } from './GlobalReactQueryClient'

export default function useFileImporter() {
  return useCallback(async function importFiles(files: File[]) {
    const db = getFilesDatabase()
    try {
      await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await addFile(db, file, file.name)
        })
      )
    } finally {
      queryClient.invalidateQueries('files')
    }
  }, [])
}
