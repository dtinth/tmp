import PouchDB from 'pouchdb'
import { ExtensionManifest } from './ExtensionManifest'

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

export interface ExtensionEntry {
  url: string
  manifest?: ExtensionManifest
  core: boolean
  updatedAt: string
  latestFetch: {
    error?: string
    fetchedAt: string
  }
}

export type FilesDb = PouchDB.Database<FileDbEntry>
export type ShareTargetDb = PouchDB.Database<ShareTargetEntry>
export type ExtensionsDb = PouchDB.Database<ExtensionEntry>

let filesDb: FilesDb | undefined
let shareTargetDb: ShareTargetDb | undefined
let extensionsDb: ExtensionsDb | undefined

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

export function getExtensionsDatabase() {
  if (!extensionsDb) {
    extensionsDb = new PouchDB('extensions', { auto_compaction: true })
    Object.assign(window, { extensionsDb })
  }
  return extensionsDb
}
