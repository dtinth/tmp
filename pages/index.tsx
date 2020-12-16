import Head from 'next/head'
import { useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import {
  FileDbEntry,
  getFilesDatabase,
  getShareTargetDatabase,
} from '../src/db'
import Files from '../src/Files'

export default function Home() {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient
  useEffect(() => {
    const transfer = async (dataTransfer: DataTransfer) => {
      const db = getFilesDatabase()
      try {
        await Promise.all(
          Array.from(dataTransfer.files).map(async (file) => {
            const result = await addFile(db, file, file.name)
            console.log(result)
          })
        )
      } finally {
        queryClientRef.current.invalidateQueries()
      }
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
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/tmp_512.png" />
      </Head>
      <strong>Welcome to your web-based local file storage.</strong> Just drop
      or paste in files and images, and they will appear here.
      <Files />
      <ShareTargetWorker />
    </div>
  )
}

async function addFile(
  db: PouchDB.Database<FileDbEntry>,
  blob: Blob,
  name: string,
  added = new Date().toJSON()
) {
  return await db.post({
    name: name,
    size: blob.size,
    added: added,
    type: blob.type,
    _attachments: {
      blob: {
        content_type: blob.type,
        data: blob,
      },
    },
  })
}

function ShareTargetWorker() {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient
  useEffect(() => {
    ;(async () => {
      const filesDb = getFilesDatabase()
      const shareTargetDb = getShareTargetDatabase()
      const docs = await shareTargetDb.allDocs({
        include_docs: true,
        attachments: true,
        binary: true,
      })
      try {
        await Promise.all(
          docs.rows.map(async (row) => {
            const { doc } = row
            if (!doc) return
            try {
              if (doc._attachments) {
                await Promise.all(
                  Object.entries(doc._attachments).map(async ([key, blob]) => {
                    await addFile(filesDb, (blob as any).data, key, doc.added)
                  })
                )
              }
            } finally {
              await shareTargetDb.remove({
                _id: doc._id,
                _rev: doc._rev,
              })
            }
          })
        )
      } finally {
        queryClientRef.current.invalidateQueries()
      }
    })()
  }, [])
  return null
}
