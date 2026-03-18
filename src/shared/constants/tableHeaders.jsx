export const TransactionListColumn = [
    { name: 'Sr.no', isSort: false },
    { name: 'Transaction Status', internalName: 'eStatus', type: -1, isSort: false },
    { name: 'Type', internalName: 'eType', type: -1, isSort: false },
    { name: 'Amount', internalName: 'nAmount', type: -1, isSort: false },
    { name: 'Transaction Mode', internalName: 'eMode', type: -1, isSort: false },
    { name: 'CreatedDate', internalName: 'dCreatedDate', type: -1, isSort: false },
]

// Transaction Status Filter
export const eTransactionTypeFilter = [
    // { value: 'user', label: 'User' },
    { value: 'game', label: 'Game' },
    { value: 'IAP', label: 'In App Purchase' },
    { value: 'DR', label: 'Daily Rewards' },
]

// Transaction Status Filter
export const eTransactionStatusFilter = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Success', label: 'Success' },
    { value: 'Failed', label: 'Failed' }
]