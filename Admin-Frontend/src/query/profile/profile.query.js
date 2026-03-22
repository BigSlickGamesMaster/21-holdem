import axios from '../../axios'

export async function profile() {
  return await axios.get('/profile')
}

export async function UpdateProfile(profileData) {
  return await axios.put('/profile/edit', profileData)
}
