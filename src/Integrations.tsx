import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getFilesDatabase } from './db'
import { FileItem } from './Files'

export function openWith(file: FileItem, url: string) {
  const sessionId = uuidv4()
  sessionStorage[`session:${sessionId}`] = JSON.stringify({
    openedFile: file._id,
    allowedFiles: [file._id],
  })
  window.open(url + '#tmpsessionid=' + sessionId)
}

export function IntegrationsWorker() {
  useEffect(() => {
    window.addEventListener('message', async (e) => {
      const fromWindow = (e.source as unknown) as Window
      if (e.data.method === 'tmp.getFile') {
        const sessionId = e.data.params.sessionId
        const session = sessionStorage[`session:${sessionId}`]
        if (!session) {
          return
        }
        const sessionState = JSON.parse(session)
        const db = getFilesDatabase()
        const file = await db.getAttachment(sessionState.openedFile, 'blob')
        fromWindow.postMessage(
          {
            jsonrpc: '2.0',
            id: e.data.id,
            result: { blob: file },
          },
          e.origin
        )
      }
    })
  }, [])
  return null
}