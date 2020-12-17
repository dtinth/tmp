import { useCallback, useRef } from 'react'
import { useQueryClient } from 'react-query'
import { getFilesDatabase } from './db'
import { addFile } from '../pages/index'

export default function useFileImporter() {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient

  return useCallback(async function importFiles(files: File[]) {
    const db = getFilesDatabase()
    try {
      await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await addFile(db, file, file.name)
        })
      )
    } finally {
      queryClientRef.current.invalidateQueries()
    }
  }, [])
}
