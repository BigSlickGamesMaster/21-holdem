import axios from 'axios'
import { removeToken } from '../src/helper/helper'

function getDefaultAdminApiOrigin() {
  return ''
}

function withAdminApiPrefix(url = '') {
  const normalizedUrl = url.replace(/\/+$/, '')
  if (!normalizedUrl) return '/api/v1/admin'
  if (normalizedUrl.endsWith('/api/v1/admin')) return normalizedUrl
  return `${normalizedUrl}/api/v1/admin`
}

export function setUrl(url = process.env.REACT_APP_API_ENDPOINT || getDefaultAdminApiOrigin()) {
  return withAdminApiPrefix(String(url || '').trim())
}

const Axios = axios.create({
  baseURL: setUrl(process.env.REACT_APP_API_ENDPOINT),
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
