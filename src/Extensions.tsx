import axios from 'axios'
import { useQuery } from 'react-query'
import { builtinExtension } from './BuiltinExtension'
import { getExtensionsDatabase } from './db'
import { queryClient } from './GlobalReactQueryClient'

const queryExtensions = async () => {
  const extensionsDb = getExtensionsDatabase()
  const docs = await extensionsDb.allDocs({ include_docs: true })
  return docs.rows.flatMap((row) => (row.doc ? [row.doc] : []))
}

export function useExtensions() {
  return useQuery('extensions', queryExtensions, { suspense: true }).data
}

export function useActiveExtensions() {
  return [
    builtinExtension,
    ...(useQuery('extensions', queryExtensions).data || []).flatMap((e) =>
      e.manifest ? [e.manifest] : []
    ),
  ]
}

export async function addExtension(url: string) {
  const { data: manifest } = await axios.get(getManifestUrl(url), {
    responseType: 'json',
  })
  if (!manifest.name) {
    throw new Error('Invalid manifest: Missing "name" property.')
  }
  if (typeof manifest.name !== 'string') {
    throw new Error('Invalid manifest: "name" property is not a string.')
  }
  if (!manifest.contributes) {
    throw new Error('Invalid manifest: Missing "contributes" property.')
  }
  if (typeof manifest.contributes !== 'object') {
    throw new Error(
      'Invalid manifest: "contributes" property is not an object.'
    )
  }
  const extensionsDb = getExtensionsDatabase()
  const _id = `extension/${url}`
  await extensionsDb.put({
    _id,
    url,
    manifest,
    latestFetch: {
      fetchedAt: new Date().toJSON(),
    },
  })
  queryClient.invalidateQueries('extensions')
  console.log(manifest)
}

export async function deleteExtension(id: string) {
  const extensionsDb = getExtensionsDatabase()
  await extensionsDb.remove(await extensionsDb.get(id))
  queryClient.invalidateQueries('extensions')
}

function getManifestUrl(url: string): string {
  return url.replace(/\?.*/, '').replace(/\/?$/, '/tmp-manifest.json')
}
