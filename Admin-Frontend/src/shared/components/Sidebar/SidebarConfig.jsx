import { iconGamePad, iconHome, iconTV, iconUser, topic, iconLayers, gear, iconChartColumn } from 'assets/images/icons'

import { route } from 'shared/constants/AllRoutes'

export const sidebarConfig = [
  {
    path: route.dashboard,
    icon: iconHome,
    title: 'Dashboard',
  },
  {
    path: route.userManagement,
    icon: iconUser,
    title: 'User Management',
  },
  {
    path: route.protoManagement,
    icon: iconGamePad,
    title: 'Game Management',
    children: [
      {
        path: route.protoManagement,
        icon: iconTV,
        title: 'Table Management',
      },
      {
        path: route.gameLogs,
        icon: iconLayers,
        title: 'Game Logs',
      },
      {
        path: route.financeManagement,
        icon: topic,
        title: 'Transactions List',
      },
      {
        path: route.changeRequests,
        icon: iconChartColumn,
        title: 'Change Requests',
      },
    ],
  },
  {
    path: route.settings,
    icon: gear,
    title: 'Settings',
  },
]
