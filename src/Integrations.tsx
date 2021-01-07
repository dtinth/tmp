import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { addFile } from './addFile'
import { getFilesDatabase } from './db'
import { FileItem } from './Files'
import { queryClient } from './GlobalReactQueryClient'
import { JsonRpcDefinition, JsonRpcPayloadChecker } from './JsonRpc'

interface RpcInterface extends JsonRpcDefinition {
  'tmp/getOpenedFile': {
    params: {
      sessionId: string
    }
    result: {
      blob: Blob
      file: {
        _rev: string
        _id: string
        name: string
        type: string
      }
    }
  }
  'tmp/newFile': {
    params: {
      sessionId: string
      name: string
      blob: Blob
    }
    result: {}
  }
}

const rpc = new JsonRpcPayloadChecker<RpcInterface>()

export function openWith(file: FileItem, url: string) {
  const sessionId = uuidv4()
  sessionStorage[`session:${sessionId}`] = JSON.stringify({
    openedFile: file._id,
    allowedFiles: [file._id],
  })
  window.open(url + '#tmpsessionid=' + sessionId)
}

export function newWith(url: string) {
  const sessionId = uuidv4()
  sessionStorage[`session:${sessionId}`] = JSON.stringify({
    canSave: true,
  })
  window.open(url + '#tmpsessionid=' + sessionId)
}

export function IntegrationsWorker() {
  useEffect(() => {
    window.addEventListener('message', async (e) => {
      const fromWindow = (e.source as unknown) as Window

      if (rpc.isMethodCall(e.data, 'tmp/getOpenedFile')) {
        const sessionId = e.data.params.sessionId
        const session = sessionStorage[`session:${sessionId}`]
        if (!session) return
        const sessionState = JSON.parse(session)
        const db = getFilesDatabase()
        const doc = await db.get(sessionState.openedFile, {
          binary: true,
          attachments: true,
        })
        fromWindow.postMessage(
          rpc.replyResult(e.data, {
            blob: (doc._attachments.blob as any).data,
            file: {
              _rev: doc._rev,
              _id: doc._id,
              name: doc.name,
              type: doc.type,
            },
          }),
          e.origin
        )
        return
      }

      if (rpc.isMethodCall(e.data, 'tmp/newFile')) {
        if (!(e.data.params.blob instanceof Blob)) return
        if (!e.data.params.name || typeof e.data.params.name !== 'string') {
          return
        }
        const sessionId = e.data.params.sessionId
        const session = sessionStorage[`session:${sessionId}`]
        if (!session) return
        // const sessionState = JSON.parse(session)
        const db = getFilesDatabase()
        await addFile(db, e.data.params.blob, e.data.params.name)
        queryClient.invalidateQueries('files')
        fromWindow.postMessage(rpc.replyResult(e.data, {}), e.origin)
        return
      }
    })
  }, [])
  return null
}
