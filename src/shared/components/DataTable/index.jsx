import PropTypes from 'prop-types'
import React, { Suspense, useState } from 'react'
import { Button, Form, Spinner, Table } from 'react-bootstrap'
import Select from 'react-select'
import Search from '../Search/index'
import { parseParams } from 'shared/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDownWideShort, faArrowUpShortWide } from '@fortawesome/free-solid-svg-icons'

const CustomPagination = React.lazy(() => import('shared/components/CustomPagination'))

function DataTable({
    children,
    bulkAction,
    component,
    columns,
    showEntriesCount,
    showIDSearch,
    idSearchPlaceholder,
    showSearchFilter,
    sortEvent,
    isLoading,
    totalRecord,
    pagination,
    header,
    headerEvent,
    checkbox,
    selectAllEvent,
    pageChangeEvent,
    selectAllValue,
    actionColumn,
    tabs,
    tabEvent,
    dataLength,
    ...rest
}) {
    // eslint-disable-next-line no-restricted-globals
    const params = parseParams(location.search)
    const [pageLimit, setPageLimit] = useState({ label: 10, value: 10 })
    return (
        <div className='data-table-content'>
            <div className='data-table-filter-grp'>
                {showEntriesCount && (
                    <Form.Group className='bulk-action only-border form-group mb-0 d-flex align-items-center'>
                        <Select
                            options={[10, 20, 30, 40, 50, 100].map((e) => ({ label: e, value: e }))}
                            value={[{ label: pageLimit.label || 10, value: pageLimit.value || 10 }]}
                            className='react-select-container only-border sm'
                            classNamePrefix="react-select"
                            isSearchable={false}
                            onChange={(e) => {
                                setPageLimit({
                                    label: e.value,
                                    value: e.value
                                })
                                headerEvent('rows', e.value)
                            }}
                        // menuIsOpen={true}
                        />
                    </Form.Group>
                )}
                {component}
                {showSearchFilter && (
                    <div className='search-box'>
                        <Search searchEvent={(e) => headerEvent('search', e)} />
                    </div>
                )}
                {showIDSearch && (
                    <div className='search-box'>
                        <Search searchEvent={(e) => headerEvent('search', e)} isIDSearch={showIDSearch} setPlaceholder={idSearchPlaceholder} />
                    </div>
                )}
            </div>
            <div className='data-table-body'>
                <Table className='table-borderless' responsive>
                    <thead>
                        <tr>
                            {checkbox && (
                                <th className='checkbox'>
                                    <Form.Check
                                        type='checkbox'
                                        id='All'
                                        name='selectAll'
                                        className='form-check m-0'
                                        onChange={selectAllEvent}
                                        checked={selectAllValue?.length ? selectAllValue?.every((item) => item.value) : false}
                                        label='&nbsp;'
                                    />
                                </th>
                            )}
                            {columns?.map((column, index) => {
                                return (
                                    <th key={index}>
                                        <span onClick={column?.isSort ? () => sortEvent(column) : null}>
                                            {column.name}
                                            {column?.isSort && column.type === 1 && <span className='sort-icon'><FontAwesomeIcon icon={faArrowUpShortWide} /></span>}
                                            {column?.isSort && column.type === -1 && <span className='sort-icon'><FontAwesomeIcon icon={faArrowDownWideShort} /></span>}
                                        </span>
                                    </th>
                                )
                            })}
                            {/* {actionColumn && <th className='text-end'>{useIntl().formatMessage({ id: 'actions' })}</th>} */}
                        </tr>
                    </thead>
                    <tbody>
                        {children}
                        {(totalRecord === 0 && !isLoading) && (
                            <tr>
                                <td colSpan={columns.length + (checkbox ? 2 : 1)} className='no-data-msg'>
                                    No Data Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                {isLoading && <div className='loading-spinner d-flex p-3 justify-content-center align-items-center'><Spinner animation="border" variant='primary' /></div>}
            </div>
            <div className='data-table-pagination-grp'>
                <div className='data-table-enteries'>
                    Showing {dataLength} out of {totalRecord} entries
                </div>
                {pagination && (
                    <Suspense fallback={<div />}>
                        <CustomPagination
                            currentPage={pagination.currentPage}
                            totalCount={totalRecord}
                            pageSize={pagination.pageSize}
                            onPageChange={pageChangeEvent}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    )
}
export default DataTable