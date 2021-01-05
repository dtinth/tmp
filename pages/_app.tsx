import '../styles/globals.css'

import { QueryClientProvider } from 'react-query'
import { queryClient } from '../src/GlobalReactQueryClient'

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  )
}

export default MyApp
