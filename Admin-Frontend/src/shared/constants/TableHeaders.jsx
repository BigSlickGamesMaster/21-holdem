export const userTableColumns = [
  { name: 'Sr No.', isSort: false },
  { name: 'Username', internalName: 'sUserName', type: 1, isSort: false },
  { name: 'Email ID', internalName: 'sEmail', type: 1, isSort: false },
  // { name: 'Mobile No.', internalName: 'sMobile', type: 1, isSort: false },
  { name: 'Chips', internalName: 'nChips', type: 1, isSort: false },
  { name: 'Created Date & Time', internalName: 'dCreatedDate', isSort: false },
  { name: 'Status', internalName: 'eStatus', isSort: false },
  { name: 'Actions', isSort: false },
]

export const protoTableColumns = [
  { name: 'Sr No.', isSort: false },
  { name: 'Name', internalName: 'sName', type: 1, isSort: false },
  { name: 'Max. Player', internalName: 'nMaxPlayer', type: 1, isSort: false },
  { name: 'Min. buy in', internalName: 'nMinBuyIn', type: 1, isSort: false },
  // { name: 'Max. buy in', internalName: 'nMaxBuyIn', type: 1, isSort: false },
  { name: 'Turn Time (in sec.)', internalName: 'nTurnTime', type: 1, isSort: false },
  // { name: 'Max Table Amount (in )', internalName: 'nMaxTableAmount', type: 1, isSort: false },
  // { name: 'Min Bet (in )', internalName: 'nMinBet', type: 1, isSort: false },
  // { name: 'Max Bet (in )', internalName: 'nMaxBet', type: 1, isSort: false },
  // { name: 'Winning Amount (in )', internalName: 'aWinningAmount', type: 1, isSort: false },
  // { name: 'Turn Time (in sec.)', internalName: 'nTurnTime', type: 1, isSort: false },
  // { name: 'Game Time (in sec.)', internalName: 'nGameTime', type: 1, isSort: false },
  { name: 'Created Date & Time', internalName: 'dCreatedDate', isSort: false },
  { name: 'Status', internalName: 'eState', isSort: false },
  { name: 'Actions', isSort: false },
]

export const gameLogs = [
  { name: 'Sr No.', isSort: false },
  { name: 'Board Id', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'Game Type', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'No. of Players', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'Winner', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'Winner Amount', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'Created Date', internalName: 'dCreatedDate', isSort: false },
  { name: 'Status', internalName: 'gameLogs', type: 1, isSort: false },
  { name: 'Actions', isSort: false },
]

export const financeColumns = [
  { name: 'Sr No.', isSort: false },
  { name: 'Transaction ID', internalName: 'sUserName', isSort: false },
  // { name: 'User ID', internalName: 'iUserId', isSort: false },
  { name: 'User Name', internalName: 'sUserName', isSort: false },
  // { name: 'Email Address', internalName: 'sEmail', isSort: false },
  // { name: 'Mobile No.', internalName: 'sMobile', isSort: false },
  { name: 'Category', internalName: 'eCategory', isSort: false },
  { name: 'Amount (in/out)', internalName: 'nAmount', isSort: false },
  { name: 'Type', internalName: 'eType', isSort: false },
  { name: 'Status', internalName: 'eStatus', isSort: false },
  { name: 'Created Date & Time', internalName: 'dCreatedDate', isSort: false },
  { name: 'Actions', isSort: false },
]

export const changeRequestColumns = [
  { name: 'ID', isSort: false },
  { name: 'Title', isSort: false },
  { name: 'Module', isSort: false },
  { name: 'Priority', isSort: false },
  { name: 'Status', isSort: false },
  { name: 'Target Release', isSort: false },
  { name: 'Updated', isSort: false },
]

export const depositColumns = [
  { name: 'Sr No.', isSort: false },
  { name: 'User ID', internalName: 'iUserId', isSort: false },
  { name: 'User Name', internalName: 'sUserName', isSort: false },
  // { name: 'Email Address', internalName: 'sEmail', isSort: false },
  { name: 'Transaction ID', internalName: 'sTransactionId', isSort: false },
  { name: 'Amount', internalName: 'nAmount', isSort: false },
  { name: 'Status', internalName: 'eStatus', isSort: false },
  { name: 'Actions', isSort: false },
]

export const KYCVerificationListColumn = [
  { name: 'Sr No.', isSort: true },
  { name: 'User ID', internalName: 'iUserID', type: 1, isSort: false },
  { name: 'User Name', internalName: 'sUserName', type: 1, isSort: false },
  { name: 'PAN Verified', internalName: 'isPanVerified', type: 1, isSort: false },
  { name: 'Aadhaar Verified', internalName: 'isAadhaarVerified', type: 1, isSort: false },
  { name: 'Actions', isSort: false },
]

export const withDrawColumns = [
  { name: 'Sr No.', isSort: false },
  { name: 'Request ID', internalName: 'id', isSort: false },
  { name: 'User ID', internalName: 'iUserId', isSort: false },
  { name: 'User Name', internalName: 'sUserName', isSort: false },
  // { name: 'Email Address', internalName: 'sEmail', isSort: false },
  // { name: 'Mobile No.', internalName: 'sMobile', isSort: false },
  { name: 'Amount', internalName: 'nAmount', isSort: false },
  { name: 'Status', internalName: 'eStatus', isSort: false },
  { name: 'Transaction ID', internalName: 'sTransactionId', isSort: false },
  { name: 'Actions', isSort: false },
]

export const genderList = [
  { name: 'Male', value: 'male' },
  { name: 'Female', value: 'female' },
  { name: 'Others', value: 'unspecified' },
]

export const docColumns = [{ label: 'Aadhaar Card', value: 'aadhaar' }]

export const versionSettingColumns = [
  { name: 'Index', isSort: false },
  { name: 'Version', internalName: 'sVersion', type: 1, isSort: false },
  // { name: 'Minimum Version', internalName: 'sMinimumVersion', type: 1, isSort: false },
  { name: 'Game Pack', internalName: 'eGamePack', type: 1, isSort: false },
  { name: 'Type', internalName: 'eType', type: 1, isSort: false },
  // { name: 'Url', internalName: 'sUrl', type: 1, isSort: false },
  { name: 'Force Update', internalName: 'bForceUpdate', type: 1, isSort: false },
  { name: 'Action', isSort: false },
]
