import React from "react"
import { Spinner } from "react-bootstrap"

const CommonSpinner = () => {
  return (
    <div className="common-spinner">
      {new Array(4).fill("").map((item) => (
        <Spinner animation="grow" key={item} />
      ))}
    </div>
  )
}

export default CommonSpinner
