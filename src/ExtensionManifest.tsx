export interface ExtensionManifest {
  name: string
  description: string
  contributes: {
    integrations: {
      [integrationName: string]: {
        // https://html.spec.whatwg.org/multipage/input.html#attr-input-accept
        accept: string[]
        title: string
        url: string
      }
    }
  }
}
