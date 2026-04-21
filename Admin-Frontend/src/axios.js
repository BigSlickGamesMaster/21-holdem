import axios from 'axios'
import { removeToken } from '../src/helper/helper'

function withAdminApiPrefix(url = '') {
  const normalizedUrl = url.replace(/\/+$/, '')
  if (!normalizedUrl) return '/api/v1/admin'
  if (normalizedUrl.endsWith('/api/v1/admin')) return normalizedUrl
  return `${normalizedUrl}/api/v1/admin`
}

export function setUrl(url = process.env.REACT_APP_API_ENDPOINT, options = { prod: false }) {
  if (options.prod) return withAdminApiPrefix(process.env.REACT_APP_API_ENDPOINT)
  if (process.env.NODE_ENV === 'development') return withAdminApiPrefix(url)
  return withAdminApiPrefix(process.env.REACT_APP_API_ENDPOINT)
}
const Axios = axios.create({
  // just set prod to true for using production server
  baseURL: setUrl('if you have ip then paste it here', { prod: true }),
})

Axios.interceptors.request.use(
  req => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!req.headers.Authorization && token) {
      req.headers.Authorization = token
      return req
    }
    return req
  },
  err => {
    return Promise.reject(err)
  }
)
Axios.interceptors.response.use(
  res => {
    return res
  },
  err => {
    if (err?.response && err?.response?.status === 401) {
      removeToken()
      // navigationTo({ to: '/login', replace: true })
      window.location.href = '/login'
      window.location.reload()
      return Promise.reject(err)
    }
    return Promise.reject(err)
  }
)

export default Axios
