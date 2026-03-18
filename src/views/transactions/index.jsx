import { formatDate } from "helper/helper";
import { getTransactions } from "query/transactions.query";
import React, { useCallback, useRef, useState } from "react";
import { useQuery } from "react-query";
import { useLocation } from "react-router-dom";
import DataTable from "shared/components/DataTable";
import TransactionFilter from "shared/components/TransactionFilter";
import { TransactionListColumn } from "shared/constants/tableHeaders";
import { appendParams, formatIndianNumber, parseParams } from "shared/utils";

const Transactions = () => {
    const location = useLocation()
    const parsedData = parseParams(location.search)
    const params = useRef(parseParams(location.search))

    function getRequestParams(e) {
        const data = e ? parseParams(e) : params.current
        return {
            eMode: data?.eMode || '',
            eStatus: data?.eStatus || '',
            pageNumber: +data?.pageNumber?.[0] || 1,
            start: (+data?.pageNumber?.[0] - 1) || 0,
            search: data?.search || '',
            limit: data?.limit || 10,
            sort: data?.sort ?? '',
            orderBy: +data?.orderBy === 1 ? 'asc' : 'desc',
        }
    }

    const [requestParams, setRequestParams] = useState(getRequestParams())
    const [data, setData] = useState(null)

    // List
    const { isLoading, isFetching } = useQuery(['transactionList', requestParams], () => getTransactions(requestParams), {
        select: (data) => data?.data?.data[0],
        onSuccess: (response) => {
            setData(response);
        },
        onError: (err) => {
            if (err?.response?.data?.code === 404) {
                setData(null);
            }
        }
    });

    function getSortedColumns(KYCListColumn, urlData) {
        return KYCListColumn?.map((column) => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
    }
    const [columns, setColumns] = useState(getSortedColumns(TransactionListColumn, parsedData))

    function handleSort(field) {
        let selectedFilter;
        const filter = columns.map((data) => {
            if (data?.internalName === field.internalName) {
                data.type = +data.type === 1 ? -1 : 1;
                selectedFilter = data;
            } else {
                data.type = 1;
            }
            return data;
        });
        setColumns(filter);
        const params = {
            ...requestParams,
            page: 0,
            sort: selectedFilter?.internalName,
            orderBy: selectedFilter.type === 1 ? 'asc' : 'desc'
        };
        setRequestParams(params);
        appendParams({
            sort: selectedFilter.type !== 0 ? selectedFilter.internalName : '',
            orderBy: selectedFilter.type
        });
    }

    const handleHeaderEvent = useCallback((name, value) => {
        switch (name) {
            case 'rows':
                setRequestParams({ ...requestParams, limit: Number(value), pageNumber: 1 });
                appendParams({ limit: Number(value), pageNumber: 1 });
                break;
            case 'search':
                setRequestParams({ ...requestParams, search: value, pageNumber: 1 });
                appendParams({ pageNumber: 1 });
                break;
            default: break;
        }
    }, [requestParams, setRequestParams]);

    const handlePageEvent = useCallback((page) => {
        setRequestParams({ ...requestParams, pageNumber: page, start: page - 1 });
    }, [requestParams, setRequestParams]);

    return (
        <div className="transactions">
            <div className="transactions-container">
                <h2 className="transactions-title">MY TRANSACTIONS</h2>
                <DataTable
                    columns={columns}
                    showEntriesCount={true}
                    // showSearchFilter={true}
                    sortEvent={handleSort}
                    headerEvent={(name, value) => handleHeaderEvent(name, value)}
                    totalRecord={data?.count[0]?.totalData || 0}
                    pageChangeEvent={handlePageEvent}
                    component={<TransactionFilter defaultValue={requestParams} setRequestParams={setRequestParams} />}
                    pagination={{ currentPage: requestParams.pageNumber, pageSize: requestParams.limit }}
                    dataLength={data?.transactions?.length || 0}
                >
                    {data && data?.transactions?.map((transaction, index) => {
                        return (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td className="text-capitalize">
                                    {
                                        transaction?.eStatus === 'Success' ? <span className='status tag green'>Success</span>
                                            : transaction?.eStatus === 'Failed' ? <span className='status tag red'>Failed</span>
                                                : transaction?.eStatus === 'Pending' ? <span className='status tag yellow'>Pending</span> :
                                                    <span>-</span>
                                    }
                                </td>
                                <td className="text-capitalize">
                                    {
                                        transaction?.eType === 'credit' ? <span className='status tag green'>Credit</span>
                                            : transaction?.eType === 'debit' ? <span className='status tag red'>Debit</span> : <span>-</span>
                                    }
                                </td>
                                <td>₹ {formatIndianNumber(transaction?.nAmount) ?? '0'}</td>
                                <td className="text-capitalize">{transaction?.eMode === "IAP" ? 'In App Purchase' : transaction?.eMode === "DR" ? 'Daily Rewards' : transaction?.eMode}</td>
                                <td>{transaction?.dCreatedDate ? formatDate(transaction?.dCreatedDate) : '-'}</td>
                            </tr>
                        );
                    })}
                </DataTable>
            </div>
        </div>
    )
}
export default Transactions;