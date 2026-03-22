import React, { memo, useState } from 'react'
import PropTypes from 'prop-types'
import { useQuery, useQueryClient } from 'react-query'
import { Toast, ToastContainer } from 'react-bootstrap'
import Cancel from 'assets/images/Cancel'

function Toaster({ limit }) {
  const [messages, setMessages] = useState([])
  const queryClient = useQueryClient()

  function handleMultiToast(toast) {
    const newMessages = [...messages]
    toast.timeout = () =>
      setTimeout(() => {
        setMessages((messages) => messages?.filter((message) => message?.id !== toast?.id))
      }, 3500)

    if (newMessages?.length >= limit) {
      const removedMessage = newMessages.shift()
      clearTimeout(removedMessage.timeout)
    }
    newMessages.push(toast)
    setMessages(newMessages)
    toast.timeout()
  }

  function handleClose(id) {
    const message = messages?.find((message) => message?.id === id)
    clearTimeout(message.timeout)
    setMessages((message) => message?.filter((message) => message?.id !== id))
  }

  useQuery('toast', () => setMessages([]), {
    onSuccess: () => {
      handleMultiToast({
        id: new Date().getTime(),
        message: queryClient.getQueryData('message')?.message,
        type: queryClient.getQueryData('message')?.type || 'success',
        isOpen: true
      })
    }
  })

  function toastStyle(toastType) {
    const backgroundColor = {
      success: '#27b98d',
      error: '#ff5658',
      warning: '#ffad0d'
    }

    return { color: '#fff', backgroundColor: backgroundColor[toastType] }
  }
  return (
    <ToastContainer position='top-end' className='mt-2 position-fixed'>
      {messages.map(({ message, id, type, isOpen }) => {
        return (
          message &&
          isOpen && (
            <Toast
              show={isOpen}
              key={id}
              onClose={() => handleClose(id)}
              style={{
                backgroundColor: toastStyle(type)?.backgroundColor,
                border: `1px solid ${toastStyle(type)?.color}`,
                boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                userSelect: 'none',
                color: toastStyle(type)?.color,
                marginBottom: '10px',
                marginRight: '10px',
                width: 'fit-content'
              }}
            >
              <Toast.Body className='d-flex justify-content-between align-items-center '>
                <div className='d-flex align-items-center'>{message}</div>
                <div onClick={() => handleClose(id)} className='ms-3'>
                  <Cancel fill={toastStyle(type).color} />
                </div>
              </Toast.Body>
            </Toast>
          )
        )
      })}
    </ToastContainer>
  )
}

export default memo(Toaster)

Toaster.propTypes = {
  limit: PropTypes.number
}
