import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'

function TriggerTooltip({ data, onClick, display, className, placement, dataLength }) {
    const renderTooltip = (props) => (
        <Tooltip id='button-tooltip' {...props}>{display}</Tooltip>
    )

    return (
        <OverlayTrigger placement={placement} delay={{ show: 10, hide: 10 }} overlay={renderTooltip} className='textWrapper'>
            <span variant='success' className={className} onClick={onClick}>
                {data.length > dataLength ? `${data?.slice(0, dataLength)}...` : data}
            </span>
        </OverlayTrigger>
    )
}

export default TriggerTooltip
