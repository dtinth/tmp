import { useQuery } from 'react-query'
import { FileDbEntry, getFilesDatabase } from './db'
import FileIcon from './FileIcon'
import { useCallback } from 'react'
import bytes from 'bytes'

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
  const { file } = props
  const open = useCallback(async () => {
    const db = getFilesDatabase()
    const blob = await db.getAttachment(file._id, 'blob')
    window.open(URL.createObjectURL(blob), '_blank')
  }, [file])
  return (
    <li data-file-id={file._id} className="flex items-center my-1">
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
