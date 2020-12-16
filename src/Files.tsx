import { useQuery } from 'react-query'
import { FileDbEntry, getDatabase } from './db'
import FileIcon from './FileIcon'
import { useCallback } from 'react'
import bytes from 'bytes'

if (typeof window !== undefined) {
  import('@github/time-elements')
}

export default function Files() {
  const { isLoading, error, data } = useQuery('files', async () => {
    const db = getDatabase()
    const docs = await db.allDocs({ include_docs: true })
    return docs.rows.flatMap((row) => {
      return row.doc ? [row.doc] : []
    })
  })

  if (isLoading) {
    return <div className="italic text-#8b8685">Loading</div>
  }
  return <FileList files={data} />
}

interface FileItem extends FileDbEntry {
  _id: string
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
    const db = getDatabase()
    const blob = await db.getAttachment(file._id, 'blob')
    window.open(URL.createObjectURL(blob), '_blank')
  }, [file])
  return (
    <li data-file-id={file._id} className="flex items-center p-1">
      <div className="mr-2 flex-none">
        <FileIcon name={file.name} />
      </div>
      <a
        className="flex-auto"
        onClick={open}
        ref={(a) => a && (a.href = 'javascript://' + file.name)}
      >
        {file.name}
      </a>
      <div className="">
        {file.type} / {bytes(file.size)} /{' '}
        <relative-time dateTime={file.added} title={file.added}>
          {file.added}
        </relative-time>
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
