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

let filesDb: PouchDB.Database<FileDbEntry> | undefined
let shareTargetDb: PouchDB.Database<ShareTargetEntry> | undefined

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
