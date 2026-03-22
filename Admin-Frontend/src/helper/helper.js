import { queryClient } from 'App'
let nav

export function setNav(n) {
  nav = n
}

export function navigationTo(link) {
  nav(link)
}

export function removeToken() {
  localStorage.clear('')
  sessionStorage.clear('')
}

export function toaster(message, type) {
  queryClient.defaultOptions.message(message, type)
}

export function getDirtyFormValues(dirtyFields, allValues) {
  if (dirtyFields === true || Array.isArray(dirtyFields)) return allValues
  return Object.fromEntries(Object.keys(dirtyFields).map((key) => [key, getDirtyFormValues(dirtyFields[key], allValues[key])]))
}

// * IT WILL CONVERT CURRENCY VALUE INTO LAKH, CRORE, ETC.
export function formatNumber (num) {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + ' Cr'
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2) + ' Lakh'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + ' K'
  } else {
    return num
  }
}

export const fileToDataUri = (file) => {
  return new Promise((resolve) => {
    if (typeof file === 'string') {
      // If file is a URL, fetch it and convert to Blob
      fetch(file)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve(e.target.result)
          }
          reader.readAsDataURL(blob)
        })
        .catch((error) => {
          console.error('Error fetching or converting URL to Blob: ', error)
          resolve(null) // Handle the error as needed
        })
    } else if (file instanceof Blob) {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      console.error('Invalid file type. It should be a Blob or a URL string.')
      resolve(null) // Handle the error as needed
    }
  })
}
