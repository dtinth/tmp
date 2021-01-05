import axios from 'axios'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useQuery } from 'react-query'
import { getExtensionsDatabase } from './db'

function ClientOnly({ children }) {
  const [isComponentMounted, setIsComponentMounted] = useState(false)
  useEffect(() => setIsComponentMounted(true), [])
  if (!isComponentMounted) {
    return null
  }
  return children
}

export default function Settings() {
  return (
    <div className="mt-6 max-w-xl">
      <h2 className="text-#d7fc70 font-bold">Settings</h2>

      <ClientOnly>
        <ErrorBoundary fallback={<div>Error!</div>}>
          <Suspense fallback="Loading...">
            <ExtensionsSettings />
          </Suspense>
        </ErrorBoundary>
      </ClientOnly>
    </div>
  )
}

async function addExtension(url: string) {
  const { data: manifest } = await axios.get(getManifestUrl(url), {
    responseType: 'json',
  })
  console.log(manifest)
}

function getManifestUrl(url: string): string {
  return url.replace(/\?.*/, '').replace(/\/?$/, '/tmp-manifest.json')
}

function ExtensionsSettings() {
  const extensions = useExtensions()
  const newUrlInput = useRef<HTMLInputElement>()
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = newUrlInput.current.value
    if (!url) {
      alert('Please enter a URL')
      return
    }
    try {
      await addExtension(url)
    } catch (error) {
      alert('Unable to add extension: ' + error)
      console.error(error)
    }
  }
  return (
    <div className="flex items-baseline mb-4 flex-wrap">
      <div className="w-full md:w-1/3">
        <span className="block font-bold md:text-right mb-1 md:mb-0 pr-4">
          Extension URLs
        </span>
      </div>
      <div className="w-full md:w-2/3">
        {extensions.length > 0 && (
          <ul>
            {extensions.map((extension) => (
              <li key={extension._id} className="mb-2">
                {extension.url}
              </li>
            ))}
          </ul>
        )}
        <form className="flex" onSubmit={onSubmit}>
          <div className="flex-auto">
            <input
              ref={newUrlInput}
              type="url"
              placeholder="URL"
              className="block w-full border py-1 px-2 rounded bg-#090807 border-#454443 hover:border-#656463 shadow placeholder-#8b8685"
            />
          </div>
          <button className="flex-none block border border-#454443 py-1 px-2 rounded bg-#090807 text-#d7fc70 ml-1">
            Add
          </button>
        </form>
      </div>
    </div>
  )
}

function useExtensions() {
  return useQuery(
    'extensions',
    async () => {
      const extensionsDb = getExtensionsDatabase()
      const docs = await extensionsDb.allDocs({ include_docs: true })
      return docs.rows.flatMap((row) => (row.doc ? [row.doc] : []))
    },
    { suspense: true }
  ).data
}
