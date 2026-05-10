import { lazy } from 'react'
import { route } from 'shared/constants/AllRoutes'

const PublicRoute = lazy(() => import('routes/PublicRoutes'))
const PrivateRoute = lazy(() => import('routes/PrivateRoutes'))
const GuestRoute = lazy(() => import('routes/GuestRoutes'))

const Register = lazy(() => import('views/auth/register'))
const Login = lazy(() => import('views/auth/login'))
const GuestLanding = lazy(() => import('views/guest'))
const GuestGame = lazy(() => import('views/guest/game'))
const Dashboard = lazy(() => import('views/dashboard/index'))
const PrivateTable = lazy(() => import('views/dashboard/privateTable'))
const Profile = lazy(() => import('views/profile/index'))
const Transactions = lazy(() => import('views/transactions/index'))
const Game = lazy(() => import('views/game'))
const HowToPlay = lazy(() => import('views/cms/howToPlay'))
const GameRule = lazy(() => import('views/cms/gameRule'))
const PrivacyPolicy = lazy(() => import('views/cms/privacyPolicy'))
const TermsConditions = lazy(() => import('views/cms/termsConditions'))
const About = lazy(() => import('views/cms/about'))
const Contact = lazy(() => import('views/cms/contact'))
const DailyRewards = lazy(() => import('views/dailyRewards/index'))
const Shop = lazy(() => import('views/shop/index'))

const RoutesDetails = [
    {
        defaultRoute: '',
        Component: PublicRoute,
        props: {},
        isPrivateRoute: false,
        children: [
            { path: '/login', Component: Login, exact: true },
            { path: '/register', Component: Register, exact: true },
            { path: '/about-us', Component: About, exact: true },
            { path: '/contact', Component: Contact, exact: true },
        ]
    },
    {
        defaultRoute: '',
        Component: GuestRoute,
        props: {},
        isPrivateRoute: false,
        children: [
            { path: '/guest', Component: GuestLanding, exact: true },
            { path: '/guest/game', Component: GuestGame, exact: true },
        ]
    },
    {
        defaultRoute: '',
        Component: PrivateRoute,
        props: {},
        isPrivateRoute: true,
        children: [
            { path: '/lobby', Component: Dashboard, exact: true },
            { path: '/private-table', Component: PrivateTable, exact: true },
            { path: '/profile', Component: Profile, exact: true },
            { path: '/transactions', Component: Transactions, exact: true },
            { path: '/game', Component: Game, exact: true },
            { path: '/how-to-play', Component: HowToPlay, exact: true },
            { path: '/game-rule', Component: GameRule, exact: true },
            { path: '/privacy-policy', Component: PrivacyPolicy, exact: true },
            { path: '/terms-conditions', Component: TermsConditions, exact: true },
            { path: '/daily-rewards', Component: DailyRewards, exact: true },
            { path: '/shop', Component: Shop},
        ]
    }
]

export default RoutesDetails
