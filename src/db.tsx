import PouchDB from 'pouchdb'

export interface FileDbEntry {
  name: string
  size: number
  added: string
  type: string
}

export interface ShareTargetEntry {
  added: string
  url: string | null
  text: string | null
  title: string | null
}

export type FilesDb = PouchDB.Database<FileDbEntry>
export type ShareTargetDb = PouchDB.Database<ShareTargetEntry>

let filesDb: FilesDb | undefined
let shareTargetDb: ShareTargetDb | undefined

export function getFilesDatabase() {
  if (!filesDb) {
    filesDb = new PouchDB('files', { auto_compaction: true })
    Object.assign(window, { filesDb })
  }
  return filesDb
}

export function getShareTargetDatabase() {
  if (!shareTargetDb) {
    shareTargetDb = new PouchDB('sharetarget', { auto_compaction: true })
    Object.assign(window, { shareTargetDb })
  }
  return shareTargetDb
}
