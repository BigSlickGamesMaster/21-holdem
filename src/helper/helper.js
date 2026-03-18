import { queryClient } from '../App'
import { removeCookie } from '../shared/utils'
let nav

export function setNav(n) {
  nav = n
}

export function navigationTo(link) {
  nav(link)
}

export function removeToken() {
  removeCookie('sAuthToken')
}

export function toaster(message, type) {
  queryClient.defaultOptions.message(message, type)
}

export function getDirtyFormValues(dirtyFields, allValues) {
  if (dirtyFields === true || Array.isArray(dirtyFields)) return allValues
  return Object.fromEntries(Object.keys(dirtyFields).map((key) => [key, getDirtyFormValues(dirtyFields[key], allValues[key])]))
}

export const fileToDataUri = (file) => {
  return new Promise((resolve) => {
    if (typeof file === 'string') {
      // If file is a URL, fetch it and convert to Blob
      fetch(file)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch((error) => {
          console.error('Error fetching or converting URL to Blob: ', error);
          resolve(null); // Handle the error as needed
        });
    } else if (file instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      console.error('Invalid file type. It should be a Blob or a URL string.');
      resolve(null); // Handle the error as needed
    }
  });
}

export const urlToFile = async (url) => {
  const fileUrl = url

  try {
    const response = await fetch(fileUrl)
    const blob = await response.blob();

    const downloadedFile = new File([blob], 'example.bundle', { type: blob?.type });
    return downloadedFile
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

export async function getImageFileFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the image. Status: ${response.status}`);
    }
    const blob = await response.blob();
    const imageFile = new File([blob], 'image.png', { type: blob.type });

    return imageFile;
  } catch (error) {
    console.error('Error occurred while fetching the image:', error);
  }
}

export const MonthNames = [
  { label: 'Jan', value: 0 },
  { label: 'Feb', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Apr', value: 3 },
  { label: 'May', value: 4 },
  { label: 'Jun', value: 5 },
  { label: 'Jul', value: 6 },
  { label: 'Aug', value: 7 },
  { label: 'Sep', value: 8 },
  { label: 'Oct', value: 9 },
  { label: 'Nov', value: 10 },
  { label: 'Dec', value: 11 },
]

export function formatDate(dateString) {
  if (dateString === undefined) return '-'
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const minutes = date.getMinutes().toString().padStart(2, '0');
  const formattedDate = `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;

  return formattedDate;
}