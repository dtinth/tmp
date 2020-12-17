import { useQuery } from 'react-query'
import { FileDbEntry, getFilesDatabase } from './db'
import FileIcon from './FileIcon'
import React, { useCallback, useEffect, useState } from 'react'
import bytes from 'bytes'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuSeparator,
  useMenuState,
} from 'reakit/Menu'
import triggerDownload from 'downloadjs'

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
  const [blobUrl, setBlobUrl] = useState('')
  const blobDigest = file._attachments.blob.digest
  useEffect(() => {
    let canceled = false
    let onCancel = () => {}
    ;(async () => {
      const db = getFilesDatabase()
      const blob = await db.getAttachment(file._id, 'blob')
      if (canceled) return
      const blobUrl = URL.createObjectURL(blob)
      setBlobUrl(blobUrl)
      onCancel = () => {
        URL.revokeObjectURL(blobUrl)
      }
    })()
    return () => {
      canceled = true
      onCancel()
    }
  }, [blobDigest])
  const open = useCallback(async () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank')
    } else {
      const db = getFilesDatabase()
      const blob = await db.getAttachment(file._id, 'blob')
      window.open(URL.createObjectURL(blob), '_blank')
    }
  }, [file, blobUrl])
  const download = useCallback(async () => {
    const db = getFilesDatabase()
    const blob = ((await db.getAttachment(file._id, 'blob')) as unknown) as Blob
    triggerDownload(blob, file.name, blob.type)
  }, [file])
  const renderMenuItem = (text: string, action: () => void) => {
    return (
      <MenuItem
        {...menu}
        onClick={action}
        className="block w-full text-left px-2 py-1 focus:bg-#454443"
      >
        {text}
      </MenuItem>
    )
  }
  return (
    <li
      data-file-id={file._id}
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
        {renderMenuItem('Open with browser', open)}
        {renderMenuItem('Download', download)}
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
