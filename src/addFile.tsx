import { FileDbEntry } from './db'
import { getType } from 'mime'

export async function addFile(
  db: PouchDB.Database<FileDbEntry>,
  blob: Blob,
  name: string,
  added = new Date().toJSON()
) {
  const type = getType(name) || 'application/octet-stream'
  return await db.post({
    name: name,
    size: blob.size,
    added: added,
    type: type,
    _attachments: {
      blob: {
        content_type: type,
        data: new Blob([blob], { type }),
      },
    },
  })
}
