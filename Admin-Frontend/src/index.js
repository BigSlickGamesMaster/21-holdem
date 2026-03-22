import React from 'react'
import ReactDOM from 'react-dom/client'

import App from 'App'
import 'bootstrap/scss/bootstrap.scss'
import 'assets/scss/main.scss'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'react-loading-skeleton/dist/skeleton.css'
import 'react-datepicker/dist/react-datepicker.css'
// import 'react-datetime/css/react-datetime.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <App />
    <ToastContainer stacked />
  </React.StrictMode>
)
