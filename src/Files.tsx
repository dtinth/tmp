import { useQuery } from 'react-query'
import { FileDbEntry, getFilesDatabase } from './db'
import FileIcon from './FileIcon'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

interface FileItem extends FileDbEntry {
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
    return docs.rows.flatMap((row) => {
      return row.doc ? [row.doc] : []
    })
  })
}

interface FileAction {
  label: string
  action?: (file: FileItem, blob: Blob, blobUrl: string) => Promise<void>
}

const fileActions: FileAction[] = [
  {
    label: 'Open with browser',
    action: async (_file, _blob, blobUrl) => {
      window.open(blobUrl, '_blank')
    },
  },
  {
    label: 'Download',
    action: async (file, blob, _blobUrl) => {
      triggerDownload(blob, file.name, blob.type)
    },
  },
  {
    label: 'Save as',
    action: async (file, blob, _blobUrl) => {
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
  { label: 'Delete' },
  { label: 'Rename' },
]

function useFileActions(file: FileItem) {
  return fileActions
}

function FileList(props: { files: FileItem[] }) {
  return (
    <div>
      <ul>
        {[...props.files].map((file) => (
          <FileView key={file._id} file={file} />
        ))}
      </ul>
    </div>
  )
}

function FileView(props: { file: FileItem }) {
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
        {fileActions.map((action) =>
          renderMenuItem(
            action.label,
            action.action &&
              blobUrl &&
              (() => action.action(file, blobInfo.blob, blobUrl))
          )
        )}
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
