import { Suspense, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ExtensionEntry } from './db'
import {
  addExtension,
  deleteExtension,
  setExtensionDisabledFlag,
  updateExistingExtension,
  useExtensions,
} from './Extensions'

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
    <div className="mt-8 max-w-xl">
      <h2 className="text-#d7fc70 font-bold border-b border-#656463 mb-2">
        Settings
      </h2>

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
      <div className="w-full md:w-1/4">
        <span className="block font-bold md:text-right mb-1 md:mb-0 pr-4">
          Extensions
        </span>
      </div>
      <div className="w-full md:w-3/4">
        {extensions.length > 0 && (
          <ul>
            {extensions.map((extension) => (
              <li key={extension._id} className="mb-2">
                <ExtensionView
                  extension={extension}
                  onDelete={
                    extension.core
                      ? undefined
                      : () => {
                          if (
                            confirm('Do you want to delete this extension?')
                          ) {
                            deleteExtension(extension._id)
                          }
                        }
                  }
                  onReload={() => {
                    updateExistingExtension(extension._id)
                  }}
                  onSetDisabled={(disabled) => {
                    setExtensionDisabledFlag(extension._id, disabled)
                  }}
                />
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

function ExtensionView(props: {
  extension: PouchDB.Core.ExistingDocument<ExtensionEntry>
  onDelete?: () => void
  onReload: () => void
  onSetDisabled: (disabled: boolean) => void
}) {
  const { extension, onDelete, onReload, onSetDisabled } = props
  return (
    <div>
      <div className="flex items-baseline">
        <div className="flex-none mr-2">
          <input
            type="checkbox"
            checked={!extension.disabled}
            onChange={(e) => onSetDisabled(!e.target.checked)}
          />
        </div>
        <div
          className={
            'flex-auto truncate ' +
            (extension.disabled ? 'opacity-70 line-through' : 'text-#bbeeff')
          }
        >
          {extension.manifest?.name || extension.url}
        </div>
        <div className="flex-none">
          {!!onDelete && (
            <button className="ml-2 text-sm text-#8b8685" onClick={onDelete}>
              ❌
            </button>
          )}
          <button className="ml-2 text-sm text-#8b8685" onClick={onReload}>
            🔄
          </button>
        </div>
      </div>
      <div className="text-sm">
        {extension.manifest?.description || '(no description given)'}
      </div>
      <div className="truncate text-#8b8685 text-sm">{extension.url}</div>
      <div className="truncate text-#8b8685 text-xs">
        Updated{' '}
        <relative-time
          dateTime={extension.updatedAt}
          title={extension.updatedAt}
          key={extension.updatedAt}
        >
          {extension.updatedAt}
        </relative-time>
      </div>
    </div>
  )
}
