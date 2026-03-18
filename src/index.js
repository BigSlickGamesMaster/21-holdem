import React from 'react'
import ReactDOM from 'react-dom/client'

import App from 'App'
import 'bootstrap'
import 'react-datepicker/dist/react-datepicker.module.css';
import 'react-toastify/dist/ReactToastify.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'assets/scss/main.scss'

import { ToastContainer } from 'react-toastify'
import reportWebVitals from 'reportWebVitals'
import NetworkStatus from 'shared/components/NetworkStatus';

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
    <>
        <React.StrictMode>
            <NetworkStatus />
            <App />
            <ToastContainer stacked />
        </React.StrictMode>
    </>
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
