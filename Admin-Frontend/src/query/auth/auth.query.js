import axios from '../../axios'

export async function login({ sEmail, sPassword }) {
  return await axios.post('/auth/login', {
    sEmail,
    sPassword,
  })
}

export async function forgotPassword({ sEmail }) {
  return await axios.post('/auth/password/forgot', {
    sEmail,
  })
}

export async function resetPassWord({ sNewPassword, token }) {
  return await axios.post(
    `/auth/password/reset/${token}`,
    { sPassword: sNewPassword },
    {
      headers: {
        authorization: token,
      },
    }
  )
}

export async function logout() {
  return await axios.get(`/profile/logout`)
}

export async function changePassWord({ sPassword, sNewPassword }) {
  return await axios.post(`/profile/change/password`, { sPassword, sNewPassword })
}

export async function checkToken(token) {
  return await axios.post(`/auth/verify-forgotpassword-maillink/${token}`)
}
