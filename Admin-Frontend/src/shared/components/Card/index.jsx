/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import Card from 'react-bootstrap/Card'
import './style.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function Cards ({ cardtext, cardtitle, cardIcon, className }) {
  return (
    <Card className='dash-card'>
      <Card.Body>
        <div>
          <Card.Text>{cardtext}</Card.Text>
          <Card.Title>{cardtitle}</Card.Title>
        </div>
        <div>
          <FontAwesomeIcon icon={cardIcon} className={className} />
        </div>
      </Card.Body>
    </Card>
  )
}

Card.propTypes = {
  cardtext: PropTypes.string,
  cardtitle: PropTypes.string,
  cardIcon: PropTypes.string
}
