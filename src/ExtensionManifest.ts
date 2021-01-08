export interface ExtensionManifest {
  /** Name of the extension */
  name: string

  /** Some description for the extension*/
  description: string

  /** Contribution points */
  contributes: {
    /**
     * Integrations are popup windows that appear when clicking on a file menu
     * or the "New item" menu.
     */
    integrations: {
      [integrationName: string]: {
        /**
         * Specify an array of file extensions (`.png`) or MIME types (`image/png`).
         * `*` accepts all files, and `image/*` accepts all files with MIME type beginning with `image/`.
         * See: https://html.spec.whatwg.org/multipage/input.html#attr-input-accept
         *
         * If an empty array is passed, then the integration will appear instead
         * in the "New item" menu.
         */
        accept: string[]
        /**
         * The text to display on the menu.
         */
        title: string
        /**
         * URL to the integration window.
         * Learn more: https://tmp-docs.spacet.me/extensions-api.html#integrations-api
         */
        url: string
      }
    }
  }
}
