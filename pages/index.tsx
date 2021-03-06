import Head from 'next/head'
import { useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import { getFilesDatabase, getShareTargetDatabase } from '../src/db'
import Files from '../src/Files'
import useFileImporter from '../src/useFileImporter'
import { addFile } from '../src/addFile'
import { IntegrationsWorker } from '../src/Integrations'
import Settings from '../src/Settings'

export default function Home() {
  const importFiles = useFileImporter()
  useEffect(() => {
    const transfer = async (dataTransfer: DataTransfer) => {
      return importFiles(Array.from(dataTransfer.files))
    }
    const onPaste = (e: ClipboardEvent): void => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.nodeName)
      ) {
        return
      }
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
      or paste in files and images, and they will appear here.{' '}
      <a href="https://tmp-docs.spacet.me" className="text-#ffffbb">
        Learn more.
      </a>
      <Files />
      <Settings />
      <ShareTargetWorker />
      <IntegrationsWorker />
    </div>
  )
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
