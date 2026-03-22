/* eslint-disable react/prop-types */
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

const CustomFileInputLabel = ({ target, show, setShow, label, tooltip }) => {
    const renderTooltip = (props) => {
        return (
            <Tooltip id="kyc-tooltip" {...props}>
                <span style={{ fontSize: '10px', display: 'block' }}>{tooltip}</span>
            </Tooltip>
        )
    }

    return (
        <>
            <label>{label}<span className='inputStar'>*</span></label>
            <OverlayTrigger
                delay={{ show: 250, hide: 400 }}
                overlay={renderTooltip}
            >
                <span ref={target} onClick={() => setShow(!show)} className='information'><FontAwesomeIcon icon={faCircleInfo} color='var(--primary-color)' size='lg' /></span>
            </OverlayTrigger>
        </>
    )
}

export default CustomFileInputLabel
