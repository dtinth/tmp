import { ExtensionManifest } from './ExtensionManifest'

export const builtinExtension: ExtensionManifest = {
  name: 'Built-in',
  description: 'The built-in extension provides a few built-in integrations.',
  contributes: {
    integrations: {
      jsonViewer: {
        title: 'JSON Viewer',
        accept: ['application/json', '.json', '.ndjson', '.bmson'],
        url: 'https://jsonviewer.glitch.me/',
      },
      videoPlayer: {
        title: 'Video player',
        accept: ['video/*'],
        url: 'https://vdo.glitch.me/',
      },
    },
  },
}
