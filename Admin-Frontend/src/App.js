import { removeToken } from 'helper/helper'
import React, { Suspense, useEffect } from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from 'react-query'
import { Loader } from 'shared/components/Loader'
const AllRoutes = React.lazy(() => import('routes'))

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      onSettled: (_d, e) => {
        if (e?.response?.status === 401) {
          //|| e?.response?.status === 404
          removeToken()
        }
        if (e?.message === 'Network Error') {
          queryClient.invalidateQueries('toast')
          queryClient.setQueryData('message', () => ({ message: e?.message, type: 'error' }))
        }
        if (e?.response?.status > 300) {
          queryClient.invalidateQueries('toast')
          queryClient.setQueryData('message', () => ({
            message: e?.response?.data.message || e?.response?.data || e?.message,
            type: 'error',
          }))
        }
      },
    },
    message: (msg, type) => {
      queryClient.invalidateQueries('toast')
      queryClient.setQueryData('message', () => ({ message: msg, type }))
    },
  },
  mutationCache: new MutationCache({
    onError: (e, query) => {
      if (!query?.disableToast)
        if (e?.message === 'Network Error') {
          queryClient.defaultOptions.message(e?.message, 'error')
        } else if (e?.response?.status === 500) {
          queryClient.defaultOptions.message(e?.message, 'warning')
        } else if (e?.response?.status > 300 && e?.response?.status < 500) {
          queryClient.defaultOptions.message(e?.response?.data.message || e?.message, 'error')
        } else if (e?.response?.status <= 500) {
          queryClient.defaultOptions.message(e?.response?.data.message || e?.message, 'warning')
        }
    },
  }),
})

function App() {
  useEffect(() => {
    // console.log = function () {}
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Loader />}>
        <AllRoutes />
      </Suspense>
    </QueryClientProvider>
  )
}

export default App
