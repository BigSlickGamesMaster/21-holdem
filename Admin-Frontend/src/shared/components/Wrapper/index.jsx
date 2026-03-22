/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import './style.scss'

const Wrapper = ({ children, style, className }) => {
  return (
    <section className={`wrapper ${className}`} style={style}>
      {children}
    </section>
  )
}

Wrapper.propTypes = {
  children: PropTypes.node
}
export default Wrapper
