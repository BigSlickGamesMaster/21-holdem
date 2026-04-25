export const route = {
  login: '/',
  forgotPassword: '/forgot-password',
  resetPassword: token => `/reset-password/${token}`,
  changePassword: '/change-password',

  editProfile: '/profile',
  dashboard: '/dashboard',
  // transactionStats: '/transaction-stats',
  // statistics: '/statistics',

  userManagement: '/user-management',
  addUser: '/user-management/add',
  editUser: id => `/user-management/edit/${id}`,
  viewUser: id => `/user-management/view/${id}`,

  // kycList: '/kyc-list',

  protoManagement: '/table-management',
  addProto: '/table-management/add',
  editProto: (id, type) => `/table-management/${type}/${id}`,
  viewProto: (id, type) => `/table-management/${type}/${id}`,

  gameLogs: '/game-logs',
  viewGameLogs: (id, type) => `/game-logs/${type}/${id}`,

  financeManagement: '/transactions',
  // depositManagement: '/deposit',
  // withdraw: '/withdraw',
  changeRequests: '/change-requests',
  addChangeRequest: '/change-requests/add',

  settings: '/settings',
  analytics: '/analytics',
}
