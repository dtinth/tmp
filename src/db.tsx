import PouchDB from 'pouchdb'

export interface FileDbEntry {
  name: string
  size: number
  added: string
  type: string
}

type Db = PouchDB.Database<FileDbEntry>

let filesDb: Db | undefined

export function getDatabase() {
  if (!filesDb) {
    filesDb = new PouchDB('files', { auto_compaction: true })
    Object.assign(window, { filesDb })
  }
  return filesDb
}
