import { FileDbEntry } from './db'

export async function addFile(
  db: PouchDB.Database<FileDbEntry>,
  blob: Blob,
  name: string,
  added = new Date().toJSON()
) {
  return await db.post({
    name: name,
    size: blob.size,
    added: added,
    type: blob.type,
    _attachments: {
      blob: {
        content_type: blob.type,
        data: blob,
      },
    },
  })
}
