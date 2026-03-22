/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'

function TriggerTooltip ({ data, onClick, display, className, style }) {
    const renderTooltip = (props) => (<Tooltip id='button-tooltip' {...props}>{display}</Tooltip>)

    return (
        <OverlayTrigger placement='top' delay={{ show: 10, hide: 10 }} overlay={renderTooltip} className='textWrapper' >
            <span variant='success' className={className} onClick={onClick} style={style}>
                {data.length > 10 ? `${data?.slice(0, 10)}...` : data}
            </span>
        </OverlayTrigger>
    )
}

export default TriggerTooltip
