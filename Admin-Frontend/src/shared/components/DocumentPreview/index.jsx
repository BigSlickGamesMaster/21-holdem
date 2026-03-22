/* eslint-disable react/prop-types */
import React from 'react'

const DocumentPreview = ({ watch, name, fn, buttonName, imgHover }) => {
    return (
        <>
            {watch(name) ? <>
                <div className="document-preview-group">
                    <div className='img-over' onClick={fn}>{imgHover}</div>
                    {watch(name) && (
                        typeof (watch(name)) !== 'string'
                            ? <div className="document-preview"> <img src={URL.createObjectURL(watch(name))} alt='altImage' /> </div>
                            : <div className="document-preview"><img src={watch(name)} alt='altImage' /> </div>)}
                </div>
            </> : <span>{buttonName}</span>}
        </>
    )
}

export default DocumentPreview
