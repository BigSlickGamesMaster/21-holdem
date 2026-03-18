import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'

function NotFound() {
    const navigate = useNavigate()
    return (
        <div className='not-found'>
            <div className='page_not_found'>Oops! Something went wrong.</div>
            <span>404</span>
            <Button onClick={() => navigate('/')}><FontAwesomeIcon icon={faHouse} /></Button>
        </div>
    )
}

export default NotFound
