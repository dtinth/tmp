import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body className="bg-#353433 text-white">
          <Main />
          <NextScript />
          <footer className="mt-6 px-6 mb-2 text-xs text-#8b8685 text-right">
            built at {new Date().toJSON()} &middot;{' '}
            <a
              href="https://github.com/dtinth/tmp"
              target="_blank"
              rel="noopener"
            >
              source
            </a>
          </footer>
        </body>
      </Html>
    )
  }
}

export default MyDocument
