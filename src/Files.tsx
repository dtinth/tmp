import { useQuery, useQueryClient } from 'react-query'
import { FileDbEntry, FilesDb, getFilesDatabase } from './db'
import FileIcon from './FileIcon'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import bytes from 'bytes'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuSeparator,
  useMenuState,
} from 'reakit/Menu'
import triggerDownload from 'downloadjs'
import classNames from 'classnames'
import useFileImporter from './useFileImporter'
import { useActiveExtensions } from './Extensions'
import { openWith, newWith } from './Integrations'

if (typeof HTMLElement !== undefined) {
  import('@github/time-elements')
}

export default function Files() {
  const { isLoading, error, data } = useFiles()
  if (isLoading) {
    return <div className="italic text-#8b8685">Loading</div>
  }
  return <FileList files={data} />
}

export interface FileItem extends FileDbEntry {
  _rev: string
  _id: string
  _attachments: {
    blob: {
      digest: string
    }
  }
}

function useFiles(): { isLoading: any; error: any; data: any } {
  return useQuery('files', async () => {
    const db = getFilesDatabase()
    const docs = await db.allDocs({ include_docs: true })
    return docs.rows
      .flatMap((row) => {
        return row.doc ? [row.doc] : []
      })
      .sort((a, b) => (a.added < b.added ? 1 : -1))
  })
}

enum FileActionGroup {
  Open = 'open',
  OpenWith = 'open-with',
  Download = 'download',
  Share = 'share',
  SaveAs = 'save-as',
  Delete = 'delete',
  Rename = 'rename',
}

interface FileAction {
  group: FileActionGroup
  label: string
  when?: (file: FileItem) => boolean
  action?: (context: FileActionContext) => Promise<void>
}

interface NewAction {
  label: string
  action?: () => Promise<void>
}

interface FileActionContext {
  file: FileItem
  blob: Blob
  blobUrl: string
  updateDb: (cb: (db: FilesDb) => Promise<void | boolean>) => Promise<void>
}

/**
 * List of file types that can be opened directly using browser.
 */
const openable = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/ico'])

const fileActions: FileAction[] = [
  {
    group: FileActionGroup.Open,
    label: 'Open with browser',
    action: async ({ blobUrl }) => {
      window.open(blobUrl, '_blank')
    },
    when: (file) => openable.has(file.type),
  },
  {
    group: FileActionGroup.Download,
    label: 'Download',
    action: async ({ file, blob }) => {
      triggerDownload(blob, file.name, blob.type)
    },
  },
  {
    group: FileActionGroup.Share,
    label: 'Share',
    when: () => !!navigator.share,
    action: async ({ file, blob }) => {
      const files = [new File([blob], file.name, { type: blob.type })]
      return (navigator as any).share({ files })
    },
  },
  {
    group: FileActionGroup.Share,
    label: 'Copy to clipboard',
    when: () => typeof (navigator?.clipboard as any)?.write === 'function',
    action: async ({ file, blob }) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])
    },
  },
  {
    group: FileActionGroup.SaveAs,
    label: 'Save as',
    when: () => 'showSaveFilePicker' in window,
    action: async ({ file, blob }) => {
      const extnameMatch = file.name.match(/\.\w+$/)
      const handle = await (window as any).showSaveFilePicker({
        types: [
          {
            description: file.type,
            accept: { [file.type]: extnameMatch ? [extnameMatch[0]] : [] },
          },
        ],
      })
      const stream = await handle.createWritable()
      try {
        await stream.write(blob)
      } finally {
        await stream.close()
      }
    },
  },
  {
    group: FileActionGroup.Delete,
    label: 'Delete',
    action: async ({ file, updateDb }) => {
      updateDb(async (db) => {
        await db.remove({
          _id: file._id,
          _rev: file._rev,
        })
      })
    },
  },
  {
    group: FileActionGroup.Rename,
    label: 'Rename',
    action: async ({ file, updateDb }) => {
      const name = prompt('New name', file.name)
      if (!name) {
        return
      }
      updateDb(async (db) => {
        const doc = await db.get(file._id)
        doc.name = name
        await db.put(doc)
      })
    },
  },
]

function useNewActions() {
  const activeExtensions = useActiveExtensions()
  return useMemo(() => {
    const actions: NewAction[] = []
    for (const extension of activeExtensions) {
      for (const [k, v] of Object.entries(
        extension.contributes.integrations || []
      )) {
        if (v.accept && v.accept.length > 0) continue
        actions.push({
          label: v.title,
          action: async () => {
            newWith(v.url)
          },
        })
      }
    }
    return actions
  }, [activeExtensions])
}

function useFileActions(file: FileItem) {
  const activeExtensions = useActiveExtensions()
  return useMemo(() => {
    const actions = [...fileActions]
    for (const extension of activeExtensions) {
      for (const [k, v] of Object.entries(
        extension.contributes.integrations || []
      )) {
        actions.push({
          group: FileActionGroup.OpenWith,
          label: v.title,
          when: (file) =>
            (v.accept || []).some((pattern) => {
              if (pattern === '*' || pattern === '*/*') {
                return true
              }
              if (pattern.startsWith('.')) {
                return (file.name.match(/\.\w+$/) || [])[0] === pattern
              }
              if (pattern.endsWith('/*')) {
                return file.type.startsWith(pattern.slice(0, -1))
              }
              if (pattern.includes('/')) {
                return file.type === pattern
              }
              return false
            }),
          action: async ({ file }) => {
            openWith(file, v.url)
          },
        })
      }
    }
    return actions.filter((action) => !action.when || action.when(file))
  }, [file, activeExtensions])
}

function FileList(props: { files: FileItem[] }) {
  return (
    <div>
      <ul>
        <NewItemView />
        {[...props.files].map((file) => (
          <FileView key={file._id} file={file} />
        ))}
      </ul>
    </div>
  )
}

function FileView(props: { file: FileItem }) {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient
  const menu = useMenuState()
  const { file } = props
  const fileActions = useFileActions(file)
  const [blobInfo, setBlobInfo] = useState({
    blob: null as Blob | null,
    url: '',
  })
  const blobUrl = blobInfo.url
  const blobDigest = file._attachments.blob.digest
  useEffect(() => {
    let canceled = false
    let onCancel = () => {}
    ;(async () => {
      const db = getFilesDatabase()
      const blob = ((await db.getAttachment(
        file._id,
        'blob'
      )) as unknown) as Blob
      if (canceled) return
      const blobUrl = URL.createObjectURL(blob)
      setBlobInfo({ blob, url: blobUrl })
      onCancel = () => {
        URL.revokeObjectURL(blobUrl)
      }
    })()
    return () => {
      canceled = true
      onCancel()
    }
  }, [blobDigest])
  const renderMenuItem = (text: string, action?: () => void) => {
    return (
      <MenuItem
        {...menu}
        disabled={!action}
        onClick={action}
        className={classNames(
          'block w-full text-left px-2 py-1 focus:bg-#454443',
          !action && 'text-#656463'
        )}
      >
        {text}
      </MenuItem>
    )
  }
  const renderGroup = (name: FileActionGroup) => {
    return fileActions
      .filter((action) => action.group === name)
      .map((action) =>
        renderMenuItem(
          action.label,
          action.action &&
            blobUrl &&
            (() => (
              menu.hide(),
              action.action({
                file,
                blob: blobInfo.blob,
                blobUrl,
                updateDb: async (f) => {
                  const db = getFilesDatabase()
                  const shouldRefresh = await f(db)
                  if (shouldRefresh !== false) {
                    queryClientRef.current.invalidateQueries()
                  }
                },
              })
            ))
        )
      )
  }
  return (
    <li
      data-file-id={file._id}
      data-file-hash={file._attachments.blob.digest}
      data-file-rev={file._rev}
      data-file-name={file.name}
      data-file-type={file.type}
      data-file-size={file.size}
      data-file-added={file.added}
    >
      <MenuButton
        {...menu}
        className="flex items-center my-1 text-left"
        draggable={!!blobUrl}
        onDragStart={(e) => {
          e.dataTransfer.setData(
            'DownloadURL',
            [file.type, file.name, blobUrl].join(':')
          )
        }}
      >
        <div className="flex-none mr-1">
          <FileIcon name={file.name} />
        </div>
        <div className="flex-auto p-2">
          <h2 className="leading-tight">{file.name}</h2>
          <p className="text-#8b8685 text-xs">
            {file.type} &middot; {bytes(file.size)} &middot;{' '}
            <relative-time dateTime={file.added} title={file.added}>
              {file.added}
            </relative-time>
          </p>
        </div>
      </MenuButton>
      <Menu
        {...menu}
        aria-label="File actions"
        className="bg-#090807 border border-#656463"
      >
        {renderGroup(FileActionGroup.Open)}
        {renderGroup(FileActionGroup.Download)}
        {renderGroup(FileActionGroup.SaveAs)}
        {renderGroup(FileActionGroup.Share)}
        {renderGroup(FileActionGroup.OpenWith)}
        <MenuSeparator />
        {renderGroup(FileActionGroup.Delete)}
        {renderGroup(FileActionGroup.Rename)}
      </Menu>
    </li>
  )
}

function NewItemView(props: {}) {
  const menu = useMenuState()
  const newActions = useNewActions()
  const importFiles = useFileImporter()
  const renderMenuItem = (text: string, action?: () => void) => {
    return (
      <MenuItem
        {...menu}
        disabled={!action}
        onClick={action}
        className={classNames(
          'block w-full text-left px-2 py-1 focus:bg-#454443',
          !action && 'text-#656463'
        )}
      >
        {text}
      </MenuItem>
    )
  }
  return (
    <li>
      <MenuButton {...menu} className="flex items-center my-1 text-left">
        <div className="flex-none mr-1 text-#8b8685">
          <div
            className="text-xl"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            [+]
          </div>
        </div>
        <div className="flex-auto p-2">
          <h2 className="leading-tight">New item</h2>
          <p className="text-#8b8685 text-xs">Create or import files</p>
        </div>
      </MenuButton>
      <Menu
        {...menu}
        aria-label="File actions"
        className="bg-#090807 border border-#656463"
      >
        {renderMenuItem('Select files from your device', async () => {
          const { fileOpen } = await import('browser-nativefs')
          const files = await fileOpen({
            multiple: true,
            mimeTypes:
              navigator.userAgent.includes('Safari/') &&
              !navigator.userAgent.includes('Chrome/')
                ? // Sending `undefined` causes Safari to open an file picker,
                  // with no options to choose images. To fix this I must send
                  // and array with a string with a single space. Not sure why
                  // but it works :/
                  [' ']
                : // Chrome, on the other hand, errors out on the above,
                  // complaining "Invalid type:"
                  undefined,
          })
          await importFiles(files)
        })}
        {newActions.map((action, index) => (
          <React.Fragment key={index}>
            {renderMenuItem(action.label, action.action)}
          </React.Fragment>
        ))}
      </Menu>
    </li>
  )
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'relative-time': React.DetailedHTMLProps<
        React.TimeHTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}
