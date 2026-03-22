import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import { parseParams } from 'shared/utils'
// import { useNavigate } from 'react-router-dom'
import iconSearch from '../../../assets/images/icons/search.svg'
function Search({ size, searchEvent, className, disabled }) {
  const refEdit = useRef(null)
  // const navigate = useNavigate()
  const [timer, setTimer] = useState(null)
  // eslint-disable-next-line no-restricted-globals
  const params = parseParams(location.search)
  function handleChange(e) {
    e.target.value = e.target.value?.trimStart()
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
    }
    setTimer(
      setTimeout(() => {
        searchEvent(e.target.value)
      }, 500)
    )
  }

  useEffect(() => {
    if (params?.search === '' || !params?.search) {
      refEdit.current.value = ''
    }
  }, [params?.search])

  // useEffect(() => {
  //   return history.listen((e) => {
  //     const newParams = parseParams(e.search)
  //     if (refEdit.current) {
  //       if (newParams.sSearch) refEdit.current.value = newParams.sSearch
  //       else refEdit.current.value = ' '
  //     }
  //   })
  // }, [history])
  return (
    <Form.Group className={`form-group ${className}`}>
      <label className='search_icon'>
        <img src={iconSearch} alt='search icon' />
      </label>
      <Form.Control
        type='search'
        placeholder='Search...'
        size={size || 'sm'}
        onChange={handleChange}
        defaultValue={params.search || ''}
        ref={refEdit}
        disabled={disabled}
      />
    </Form.Group>
  )
}
Search.propTypes = {
  size: PropTypes.string,
  className: PropTypes.string,
  searchEvent: PropTypes.func,
  disabled: PropTypes.bool
}
export default Search
