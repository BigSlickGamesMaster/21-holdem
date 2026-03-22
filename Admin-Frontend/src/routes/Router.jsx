import { lazy } from 'react'
import { route } from 'shared/constants/AllRoutes'

const PublicRoute = lazy(() => import('routes/PublicRoutes'))
const PrivateRoute = lazy(() => import('routes/PrivateRoutes'))

// public Routes Files

const Login = lazy(() => import('views/auth/login'))
const ForgotPassword = lazy(() => import('views/auth/forgot-password'))
const ResetPassword = lazy(() => import('views/auth/reset-password'))

// Private Routes Files
const Profile = lazy(() => import('views/profile'))
const ChangePassword = lazy(() => import('views/profile/changePassword'))
const Dashboard = lazy(() => import('views/dashboard'))
// const TransactionStats = lazy(() => import('views/dashboard/transactionStats'))
// const Statistics = lazy(() => import('views/dashboard/statistics'))

// user routes
const UserManagement = lazy(() => import('views/user'))
const AddUserPage = lazy(() => import('views/user/add'))
const EditUserPage = lazy(() => import('views/user/edit'))
const ViewUserPage = lazy(() => import('views/user/view'))
// const KYCListPage = lazy(() => import('views/user/kycDetails'))

//proto routes
const ProtoManagement = lazy(() => import('views/proto'))
const AddProtoPage = lazy(() => import('views/proto/add'))

// games Log
const GameLogs = lazy(() => import('views/gmeLogs/GameLogs'))
const ViewGameLogs = lazy(() => import('views/gmeLogs/view/index'))

// Finance Management
// const DepositManagement = lazy(() => import('views/finance/deposit'))
const FinanceManagement = lazy(() => import('views/finance/FinanceManagement'))
// const Withdraw = lazy(() => import('views/finance/withdraw'))

// Settings

const Settings = lazy(() => import('views/settings'))

const RoutesDetails = [
  {
    defaultRoute: '',
    Component: PublicRoute,
    props: {},
    isPrivateRoute: false,
    children: [
      { path: '/login', Component: Login, exact: true },
      { path: route.forgotPassword, Component: ForgotPassword, exact: true },
      {
        path: route.resetPassword(':token'),
        Component: ResetPassword,
        exact: true,
      },
    ],
  },
  {
    defaultRoute: '',
    Component: PrivateRoute,
    props: {},
    isPrivateRoute: true,
    children: [
      { path: route.editProfile, Component: Profile, exact: true },
      { path: route.changePassword, Component: ChangePassword, exact: true },
      { path: route.dashboard, Component: Dashboard, exact: true },
      // { path: route.transactionStats, Component: TransactionStats, exact: true },
      // { path: route.statistics, Component: Statistics, exact: true },

      { path: route.userManagement, Component: UserManagement, exact: true },
      { path: route.addUser, Component: AddUserPage, exact: true },
      { path: route.viewUser(':id'), Component: ViewUserPage, exact: true },
      { path: route.editUser(':id'), Component: EditUserPage, exact: true },

      // { path: route.kycList, Component: KYCListPage, exact: true },
      // {
      // 	path: route.viewUser(':id', ':type'),
      // 	Component: AddUserPage,
      // 	exact: true,
      // },
      { path: route.protoManagement, Component: ProtoManagement, exact: true },
      { path: route.addProto, Component: AddProtoPage, exact: true },
      { path: route.editProto(':id', ':type'), Component: AddProtoPage, exact: true },
      { path: route.viewProto(':id', ':type'), Component: AddProtoPage, exact: true },

      { path: route.gameLogs, Component: GameLogs, exact: true },
      { path: route.viewGameLogs(':id', ':type'), Component: ViewGameLogs, exact: true },
      { path: route.financeManagement, Component: FinanceManagement, exact: true },
      // { path: route.depositManagement, Component: DepositManagement, exact: true },
      // { path: route.withdraw, Component: Withdraw, exact: true },

      { path: route.settings, Component: Settings, exact: true },
    ],
  },
]

export default RoutesDetails
