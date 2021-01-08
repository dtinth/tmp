import axios from 'axios'
import { useQuery } from 'react-query'
import { getExtensionsDatabase } from './db'
import { queryClient } from './GlobalReactQueryClient'

let firstTimeQuery = true

const coreExtensionUrls = [
  '/core-extensions/json-viewer/',
  '/core-extensions/vdo-player/',
  'https://dtinth.github.io/tmp-photopea/',
  'https://tmp-webrtc.spacet.me/',
]

const refreshAllExtensions = async () => {
  const extensionsDb = getExtensionsDatabase()
  const results = await extensionsDb.allDocs({ include_docs: true })
  const alreadyAddedUrls = new Set(results.rows.map((r) => r.doc.url))
  const actions: (() => Promise<void>)[] = []

  const coreExtensionsUrlsToAdd = coreExtensionUrls.filter(
    (url) => !alreadyAddedUrls.has(url)
  )
  for (const url of coreExtensionsUrlsToAdd) {
    actions.push(() => addExtension(url, false))
  }
  for (const row of results.rows) {
    actions.push(() => updateExistingExtension(row.id))
  }

  try {
    await Promise.all(actions.map((a) => a()))
  } catch (error) {
    console.error('Refresh failed', error)
  } finally {
    queryClient.invalidateQueries('extensions')
  }
}

const queryExtensions = async () => {
  const extensionsDb = getExtensionsDatabase()
  const results = await extensionsDb.allDocs({ include_docs: true })
  if (firstTimeQuery) {
    firstTimeQuery = false
    setTimeout(() => {
      refreshAllExtensions()
    })
  }
  return results.rows.flatMap((row) => (row.doc ? [row.doc] : []))
}

export function useExtensions() {
  return useQuery('extensions', queryExtensions, { suspense: true }).data
}

export function useActiveExtensions() {
  return [
    ...(useQuery('extensions', queryExtensions).data || []).flatMap((e) =>
      e.manifest ? [e.manifest] : []
    ),
  ]
}

async function fetchExtensionManifest(url: string) {
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
  return manifest
}

export async function addExtension(url: string, shouldInvalidate = true) {
  const manifest = await fetchExtensionManifest(url)
  const extensionsDb = getExtensionsDatabase()
  const _id = `extension/${url}`
  await extensionsDb.put({
    _id,
    url,
    manifest,
    core: coreExtensionUrls.includes(url),
    disabled: false,
    updatedAt: new Date().toJSON(),
    latestFetch: {
      fetchedAt: new Date().toJSON(),
    },
  })
  if (shouldInvalidate) {
    queryClient.invalidateQueries('extensions')
  }
}

export async function deleteExtension(id: string, shouldInvalidate = true) {
  const extensionsDb = getExtensionsDatabase()
  await extensionsDb.remove(await extensionsDb.get(id))
  if (shouldInvalidate) {
    queryClient.invalidateQueries('extensions')
  }
}

export async function updateExistingExtension(
  id: string,
  shouldInvalidate = true
) {
  const extensionsDb = getExtensionsDatabase()
  const doc = await extensionsDb.get(id)

  // Remove removed core extensions
  if (doc.core && !coreExtensionUrls.includes(doc.url)) {
    return deleteExtension(id, shouldInvalidate)
  }

  // Update manifest
  try {
    const manifest = await fetchExtensionManifest(doc.url)
    if (JSON.stringify(doc.manifest) !== JSON.stringify(manifest)) {
      doc.manifest = manifest
      doc.updatedAt = new Date().toJSON()
    }
    doc.latestFetch = {
      fetchedAt: new Date().toJSON(),
    }
  } catch (error) {
    console.error('Unable to reload extension', id)
    doc.latestFetch = {
      fetchedAt: new Date().toJSON(),
      error: String(error),
    }
  }
  await extensionsDb.put(doc)

  if (shouldInvalidate) {
    queryClient.invalidateQueries('extensions')
  }
}

export async function setExtensionDisabledFlag(id: string, disabled: boolean) {
  const extensionsDb = getExtensionsDatabase()
  const doc = await extensionsDb.get(id)
  doc.disabled = disabled
  await extensionsDb.put(doc)
  queryClient.invalidateQueries('extensions')
}

function getManifestUrl(url: string): string {
  return url.replace(/\?.*/, '').replace(/\/?$/, '/tmp-manifest.json')
}
