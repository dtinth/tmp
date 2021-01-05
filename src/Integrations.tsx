import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getFilesDatabase } from './db'
import { FileItem } from './Files'
import { JsonRpcDefinition, JsonRpcPayloadChecker } from './JsonRpc'
import { ExtensionManifest } from './ExtensionManifest'

export const builtinExtension: ExtensionManifest = {
  name: 'Built-in',
  description: 'The built-in extension provides a few built-in integrations.',
  contributes: {
    integrations: {
      jsonViewer: {
        title: 'JSON Viewer',
        accept: ['application/json', '.json', '.ndjson', '.bmson'],
        url: 'https://jsonviewer.glitch.me/',
      },
      videoPlayer: {
        title: 'Video player',
        accept: ['video/*'],
        url: 'https://vdo.glitch.me/',
      },
    },
  },
}

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

export function IntegrationsWorker() {
  useEffect(() => {
    window.addEventListener('message', async (e) => {
      const fromWindow = (e.source as unknown) as Window
      if (rpc.isMethodCall(e.data, 'tmp/getOpenedFile')) {
        const sessionId = e.data.params.sessionId
        const session = sessionStorage[`session:${sessionId}`]
        if (!session) {
          return
        }
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
      }
    })
  }, [])
  return null
}
