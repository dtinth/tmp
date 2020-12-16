import Head from 'next/head'
import { useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import { getDatabase } from '../src/db'
import Files from '../src/Files'

export default function Home() {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient
  useEffect(() => {
    const transfer = async (dataTransfer: DataTransfer) => {
      const db = getDatabase()
      await Promise.all(
        Array.from(dataTransfer.files).map(async (file) => {
          const result = await db.post({
            name: file.name,
            size: file.size,
            added: new Date().toJSON(),
            type: file.type,
            _attachments: {
              blob: {
                content_type: file.type,
                data: file,
              },
            },
          })
          console.log(result)
        })
      )
      queryClientRef.current.invalidateQueries()
    }
    const onPaste = (e: ClipboardEvent): void => {
      transfer(e.clipboardData)
      e.preventDefault()
    }
    const onDrop = (e: DragEvent): void => {
      transfer(e.dataTransfer)
      e.preventDefault()
    }
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }
    document.addEventListener('paste', onPaste)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    return () => {
      document.removeEventListener('paste', onPaste)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
    }
  }, [])
  return (
    <div className="p-6">
      <Head>
        <title>tmp</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <strong>Welcome to your web-based local file storage.</strong> Just drop
      or paste in files and images, and they will appear here.
      <Files />
    </div>
  )
}
