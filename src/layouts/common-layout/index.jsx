import React, { Suspense } from 'react'
import { Spinner } from 'react-bootstrap'
import Footer from 'shared/components/Footer'
import HeaderPublic from 'shared/components/Header/Public'

const CommonLayout = ({ children }) => {
    return (
        <>
            <HeaderPublic />
            <div className="common-layout">
                <div className='container-fluid'>
                    <Suspense fallback={
                        <div className='d-flex align-items-center justify-content-center top-0 left-0 position-fixed h-100 w-100'>
                            <Spinner animation='border' size='sm' variant='success' />
                        </div>
                    }>{children}</Suspense>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default CommonLayout