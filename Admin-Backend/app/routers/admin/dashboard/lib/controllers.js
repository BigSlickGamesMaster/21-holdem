/* eslint-disable prettier/prettier */
const { User, Transaction, PokerFinishGame, KYC } = require('../../../../models');

function getQuery(from = 'today', to = 'today') {
  const today = _.getDate();
  const todayWithoutTime = _.getLocalDate();
  // const zoneOffset = 19800000; // date.getTimezoneOffset() * 60 * 1000;
  // const today = new Date(date - zoneOffset);

  const dates = {
    today,
    todayWithoutTime,
    tomorrow: _.addDays(today, 1),
    yesterday: _.addDays(today, -1),
    lastweek: _.addDays(today, -7),
    lastmonth: _.addDays(today, -30),
    lastThreeMonth: _.addDays(today, -90),
    lastYear: _.addDays(today, -365),
  };

  return {
    $match: {
      $and: [
        {
          dCreatedDate: { $gte: dates[from] },
        },
        {
          dCreatedDate: { $lte: dates[to] },
        },
      ],
    },
  };
}

const controllers = {};

controllers.get = async (req, res) => {
  const body = _.pick(req.body, ['dStartDate', 'dEndDate']);
  const dStartDate = body.dStartDate ? new Date(body.dStartDate) : undefined;
  const dEndDate = body.dEndDate ? new Date(body.dEndDate) : undefined;

  const dateFilter =
    dStartDate && dEndDate
      ? {
          $and: [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lt: dEndDate } }],
        }
      : {};

  const userQuery = [
    {
      $match: {
        eUserType: 'user',
        ...dateFilter,
      },
    },
    {
      $project: {
        nChips: true,
        isEmailVerified: true,
        isMobileVerified: true,
        eStatus: true,
        eUserType: true,
      },
    },
    {
      $group: {
        _id: '-',
        nTotalUsers: { $sum: 1 },
        nTotalDeletedUsers: {
          $sum: { $cond: [{ $eq: ['$eStatus', 'd'] }, 1, 0] },
        },
        nTotalEmailVerifiedUsers: {
          $sum: {
            $cond: [
              {
                $eq: ['$isEmailVerified', true],
              },
              1,
              0,
            ],
          },
        },
        nTotalMobileVerifiedUsers: {
          $sum: {
            $cond: [
              {
                $eq: ['$isMobileVerified', true],
              },
              1,
              0,
            ],
          },
        },

        nTotalActiveUsers: {
          $sum: { $cond: [{ $eq: ['$eStatus', 'y'] }, 1, 0] },
        },
        nTotalUserBalance: { $sum: '$nChips' },
      },
    },
    {
      $project: {
        _id: false,
      },
    },
  ];

  const transactionQuery = [
    {
      $match: {
        ...dateFilter,
        // $or: [{ eStatus: { $eq: 'SUCCESS' } }, { eStatus: { $eq: 'approved' } }, { eStatus: { $eq: 'pending' } }],
        eStatus: { $in: ['success', 'approved', 'pending'] },
      },
    },
    {
      $addFields: {
        iDoneBy: { $ifNull: ['$iDoneBy', false] },
      },
    },
    {
      $group: {
        _id: '-',
        nUserPending: {
          $sum: {
            $cond: [
              {
                $and: [{ $eq: ['$eStatus', 'pending'] }, { $eq: ['$eType', 'debit'] }, { $eq: ['$iDoneBy', false] }],
              },
              '$nAmount',
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: false,
      },
    },
  ];

  const response = {
    nTotalUsers: 0,
    nTotalActiveUsers: 0,
    nTotalDeletedUsers: 0,
    nTotalEmailVerifiedUsers: 0,
    nTotalMobileVerifiedUsers: 0,
    nTotalUserBalance: 0,
    nUserPending: 0,
  };

  const queries = [User.aggregate(userQuery), Transaction.aggregate(transactionQuery)];

  const [[usersResult], [transactionResult]] = await Promise.all(queries);

  if (usersResult) {
    response.nTotalUsers = usersResult.nTotalUsers || 0;
    response.nTotalActiveUsers = usersResult.nTotalActiveUsers || 0;
    response.nTotalDeletedUsers = usersResult.nTotalDeletedUsers || 0;
    response.nTotalEmailVerifiedUsers = usersResult.nTotalEmailVerifiedUsers || 0;
    response.nTotalMobileVerifiedUsers = usersResult.nTotalMobileVerifiedUsers || 0;
    response.nTotalUserBalance = usersResult.nTotalUserBalance || 0;
  }

  if (transactionResult) {
    response.nUserPendingWithdrawal = transactionResult.nUserPending || 0;
  }

  return res.reply(messages.success(), response);
};

controllers.botRevenue = async (req, res) => {
  const match = {
    eUserType: 'bot',
    eStatus: { $ne: 'd' },
  };
  const query = [
    {
      $match: match,
    },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'iUserId',
        as: 'transaction',
      },
    },

    {
      $addFields: {
        transactions: {
          $reduce: {
            input: '$transaction',
            initialValue: { debit: 0, credit: 0 },
            in: {
              debit: {
                $sum: [
                  '$$value.debit',
                  {
                    $cond: [
                      {
                        $and: [{ $eq: ['$$this.eType', 'debit'] }, { $eq: ['$$this.eCategory', 'game'] }, { $eq: ['$$this.eMode', 'game'] }],
                      },
                      '$$this.nAmount',
                      0,
                    ],
                  },
                ],
              },
              credit: {
                $sum: [
                  '$$value.credit',
                  {
                    $cond: [
                      {
                        $and: [{ $eq: ['$$this.eType', 'credit'] }, { $eq: ['$$this.eCategory', 'game'] }, { $eq: ['$$this.eMode', 'game'] }],
                      },
                      '$$this.nAmount',
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        nBotProfit: {
          $cond: {
            if: { $eq: ['$transactions.debit', 0] },
            then: 0,
            else: {
              $subtract: ['$transactions.credit', '$transactions.debit'],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        nRevenueByBot: { $sum: '$nBotProfit' },
      },
    },
  ];

  const users = await User.aggregate(query);
  return res.reply(messages.success(), users);
};
controllers.totalRevenue = async (req, res) => {
  const matchQuery = { eBoardType: 'cash' };
  const addFields = {
    $addFields: { total: { $subtract: ['$nAmountIn', '$nAmountOut'] } },
  };
  const groupQuery = {
    $group: {
      _id: '',
      dCreatedDate: { $first: '$dCreatedDate' },
      nTotal: { $sum: { $cond: [{ $gt: ['$total', 0] }, '$total', 0] } },
    },
  };
  const project = { $project: { nTotal: 1 } };
  const query = [
    {
      $match: matchQuery,
    },
    addFields,
    {
      $facet: {
        nLastMonth: [getQuery('lastmonth', 'today'), groupQuery, project],
        nLastYear: [getQuery('lastYear', 'today'), groupQuery, project],
        nToday: [getQuery('todayWithoutTime', 'tomorrow'), groupQuery, project],
        nLastweek: [getQuery('lastweek', 'today'), groupQuery, project],
        nOverAll: [groupQuery, project],
      },
    },
  ];
  const revenue = await PokerGame.aggregate(query);
  return res.reply(messages.success(), revenue);
};
controllers.depositOverallCounting = async (req, res) => {
  const groupQuery = {
    $group: {
      _id: '$eStatus',
      nTotalDeposit: { $sum: '$nAmount' },
      nTotal: { $sum: 1 },
    },
  };
  const project = { $project: { _id: 1, nTotalDeposit: 1, nTotal: 1 } };
  const query = [
    {
      $match: {
        eType: 'credit',
        iDoneBy: { $exists: false },
        eCategory: 'bank',
      },
    },
    {
      $facet: {
        nToday: [getQuery('todayWithoutTime', 'tomorrow'), groupQuery, project],
        nLastMonth: [getQuery('lastmonth', 'today'), groupQuery, project],
        nLastWeek: [getQuery('lastweek', 'today'), groupQuery, project],
        nLastYear: [getQuery('lastYear', 'today'), groupQuery, project],
        nOverall: [groupQuery, project],
      },
    },
  ];

  const [stats] = await Transaction.aggregate(query);
  const arrObj = [
    { _id: 'success', nTotalWithdrawal: 0, nTotal: 0 },
    { _id: 'failed', nTotalWithdrawal: 0, nTotal: 0 },
    { _id: 'pending', nTotalWithdrawal: 0, nTotal: 0 },
  ];
  for (const [key, value] of Object.entries(stats)) {
    if (!value.length) {
      stats[key] = arrObj;
      continue; // eslint-disable-line no-continue
    }
    if (!value.find(s => s._id === 'failed')) stats[key].push(arrObj[1]);
    if (!value.find(s => s._id === 'pending')) stats[key].push(arrObj[2]);
    if (!value.find(s => s._id === 'success')) stats[key].push(arrObj[0]);
  }

  res.reply(messages.success(), stats);
};
controllers.withdrawalCounting = async (req, res) => {
  const matchQuery = {
    eType: 'debit',
    iDoneBy: { $exists: false },
    sDescription: { $ne: 'Bot chips entry' },
    eCategory: 'bank',
  };
  const project = { $project: { _id: 1, nTotalWithdrawal: 1, nTotal: 1 } };
  const groupQuery = {
    $group: {
      _id: '$eStatus',
      dCreatedDate: { $first: '$dCreatedDate' },
      nTotalWithdrawal: { $sum: '$nAmount' },
      nTotal: { $sum: 1 },
    },
  };
  const query = [
    {
      $match: matchQuery,
    },
    {
      $facet: {
        nToday: [getQuery('todayWithoutTime', 'tomorrow'), groupQuery, project],
        nLastMonth: [getQuery('lastmonth', 'today'), groupQuery, project],
        nLastweek: [getQuery('lastweek', 'today'), groupQuery, project],
        nLastYear: [getQuery('lastYear', 'today'), groupQuery, project],
        nOverall: [groupQuery, project],
      },
    },
  ];
  const [stats] = await Transaction.aggregate(query);
  const arrObj = [
    { _id: 'success', nTotalWithdrawal: 0, nTotal: 0 },
    { _id: 'failed', nTotalWithdrawal: 0, nTotal: 0 },
    { _id: 'pending', nTotalWithdrawal: 0, nTotal: 0 },
    { _id: 'rejected', nTotalWithdrawal: 0, nTotal: 0 },
  ];
  for (const [key, value] of Object.entries(stats)) {
    if (!value.length) {
      stats[key] = arrObj;
      continue; // eslint-disable-line no-continue
    }
    if (!value.find(s => s._id === 'failed')) stats[key].push(arrObj[1]);
    if (!value.find(s => s._id === 'pending')) stats[key].push(arrObj[2]);
    if (!value.find(s => s._id === 'success')) stats[key].push(arrObj[0]);
    if (!value.find(s => s._id === 'rejected')) stats[key].push(arrObj[3]);
  }

  res.reply(messages.success(), stats);
};
controllers.profit = async (req, res) => {
  try {
    const query = [
      {
        $match: {
          eBoardType: 'cash',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'iWinnerId',
          foreignField: '_id',
          as: 'winner',
        },
      },
      {
        $addFields: {
          total: {
            $subtract: ['$nAmountIn', '$nAmountOut'],
          },
        },
      },
      {
        $addFields: {
          bProfit: {
            $subtract: ['$nAmountOut', '$nBoardFee'],
          },
        },
      },
      {
        $unwind: {
          path: '$winner',
        },
      },
      {
        $match: {
          'winner.eStatus': 'y',
        },
      },
      {
        $group: {
          _id: null,
          botProfit: {
            $sum: {
              $cond: [
                {
                  $eq: ['$winner.eUserType', 'bot'],
                },
                '$bProfit',
                0,
              ],
            },
          },
          userProfit: {
            $sum: {
              $cond: [
                {
                  $eq: ['$winner.eUserType', 'user'],
                },
                '$total',
                0,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          totalGameProfit: {
            $add: ['$botProfit', '$userProfit'],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ];

    const profit = await PokerGame.aggregate(query);
    console.log('🚀 ~ controllers.profit= ~ profit:', profit);

    return res.reply(messages.success(), profit);
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:462 ~ controllers.profit= ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.tableTransaction = async (req, res) => {
  try {
    const body = _.pick(req.body, ['dStartDate', 'dEndDate']);
    const dStartDate = body.dStartDate ? _.getLocalDate(body.dStartDate) : undefined;
    const dEndDate = body.dEndDate ? _.getLocalDate(body.dEndDate) : undefined;
    if (dEndDate) dEndDate.setDate(dEndDate.getDate() + 1);
    const dateFilter =
      dStartDate && dEndDate
        ? {
            $and: [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lt: dEndDate } }, { eBoardType: 'cash' }, { eStatus: 'y' }],
          }
        : {};

    const query = [
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '-',
          nTotalClassicInAmount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'classic'] }, { $eq: ['$eStatus', 'y'] }],
                },
                '$nAmountIn',
                0,
              ],
            },
          },
          nTotalClassicOutAmount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'classic'] }, { $eq: ['$eStatus', 'y'] }],
                },
                '$nAmountOut',
                0,
              ],
            },
          },
          nTotalRushInAmount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'rush'] }, { $eq: ['$eStatus', 'y'] }],
                },
                '$nAmountIn',
                0,
              ],
            },
          },
          nTotalRushOutAmount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'rush'] }, { $eq: ['$eStatus', 'y'] }],
                },
                '$nAmountOut',
                0,
              ],
            },
          },
          nTotalAdminProfit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eMode', 'admin'] }, { $eq: ['$eStatus', 'y'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: false,
        },
      },
    ];

    const response = {
      nTotalClassicInAmount: 0,
      nTotalClassicOutAmount: 0,
      nTotalRushInAmount: 0,
      nTotalRushOutAmount: 0,
      nTotalAdminProfit: 0,
    };

    const adminProfitQuery = [
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '-',
          nTotalAdminProfit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eMode', 'admin'] }, { $eq: ['$eStatus', 'Success'] }, { $eq: ['$sDescription', 'Admin profit'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: false,
        },
      },
    ];
    const [adminProfit] = await Transaction.aggregate(adminProfitQuery);

    const [pokerGame] = await PokerFinishGame.aggregate(query);
    if (pokerGame) {
      response.nTotalClassicInAmount = pokerGame.nTotalClassicInAmount || 0;
      response.nTotalClassicOutAmount = pokerGame.nTotalClassicOutAmount || 0;
      response.nTotalRushInAmount = pokerGame.nTotalRushInAmount || 0;
      response.nTotalRushOutAmount = pokerGame.nTotalRushOutAmount || 0;
      response.totalInAmount = response.nTotalClassicInAmount + response.nTotalRushInAmount;
      response.totalOutAmount = response.nTotalClassicOutAmount + response.nTotalRushOutAmount;
      response.nTotalAdminProfit = adminProfit.nTotalAdminProfit || 0;
    }

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:558 ~ controllers.tableTransaction= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};
controllers.getList = async (req, res) => {
  try {
    const body = _.pick(req.body, ['dStartDate', 'dEndDate']);
    const dStartDate = body.dStartDate ? new Date(body.dStartDate) : undefined;
    const dEndDate = body.dEndDate ? new Date(body.dEndDate) : undefined;
    if (dEndDate) dEndDate.setDate(dEndDate.getDate() + 1);

    const dateFilter =
      dStartDate && dEndDate
        ? {
            $and: [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lt: dEndDate } }],
          }
        : {};

    const userQuery = [
      {
        $match: {
          // eUserType: 'user',
          ...dateFilter,
        },
      },
      {
        $project: {
          nChips: true,
          isEmailVerified: true,
          isMobileVerified: true,
          eStatus: true,
          eUserType: true,
        },
      },
      {
        $group: {
          _id: '-',
          nTotalUsers: {
            $sum: { $cond: [{ $eq: ['$eUserType', 'user'] }, 1, 0] },
          },
          nTotalDeletedUsers: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eUserType', 'user'] }, { $eq: ['$eStatus', 'd'] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalEmailVerifiedUsers: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eUserType', 'user'] }, { $eq: ['$isEmailVerified', true] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalMobileVerifiedUsers: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eUserType', 'user'] }, { $eq: ['$isMobileVerified', true] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalActiveUsers: {
            $sum: { $cond: [{ $and: [{ $eq: ['$eUserType', 'user'] }, { $eq: ['$eStatus', 'y'] }] }, 1, 0] },
          },
          nTotalActiveBot: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'y'] }, { $eq: ['$eUserType', 'bot'] }],
                },
                1,
                0,
              ],
            },
          },
          // nUserDebit: { $sum: { $cond: [{ $and: [{ $eq: ['$eStatus', 'success'] }, { $eq: ['$eType', 'debit'] },{ $ne: ['$sDescription', 'Bot chips entry'] }, { $eq: ['$eMode', 'bank'] }] }, '$nAmount', 0] } },

          nTotalUserBalance: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'y'] }, { $eq: ['$eUserType', 'user'] }],
                },
                '$nChips',
                0,
              ],
            },
          },
          nTotalBotBalance: {
            $sum: { $cond: [{ $eq: ['$eUserType', 'bot'] }, '$nChips', 0] },
          },
          // $sum: {$cond: [{$eq: ['$transactions.eType', 'debit'],},'$transactions.nAmount',0,],},
        },
      },
      {
        $project: {
          _id: false,
        },
      },
    ];

    const transactionQuery = [
      {
        $match: {
          ...dateFilter,
        },
      },
      {
        $addFields: {
          iDoneBy: { $ifNull: ['$iDoneBy', false] },
        },
      },
      {
        $group: {
          _id: '-',
          nUserCredit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eStatus', 'Success'] },
                    { $eq: ['$eType', 'credit'] },
                    { $ne: ['$sDescription', 'Manual Success'] },
                    { $in: ['$eMode', ['manual', 'IAP']] },
                    // { $eq: ['$eCategory', 'bank'] },
                  ],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nUserDebit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eStatus', 'Success'] },
                    { $eq: ['$eType', 'debit'] },
                    { $eq: ['$sDescription', 'Manual Success'] },
                    { $eq: ['$eMode', 'manual'] },
                    // { $eq: ['$eCategory', 'bank'] },
                  ],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nAdminCredit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'Success'] }, { $eq: ['$eType', 'credit'] }, { $eq: ['$sDescription', 'Admin Transaction'] }, { $eq: ['$eMode', 'admin'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nUserPending: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'pending'] }, { $eq: ['$eType', 'debit'] }, { $ne: ['$sDescription', 'Bot chips entry'] }, { $eq: ['$eMode', 'bank'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nAdminDebit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'Success'] }, { $eq: ['$eType', 'debit'] }, { $eq: ['$sDescription', 'Admin Transaction'] }, { $eq: ['$eMode', 'admin'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nAdminBotCredit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'success'] }, { $eq: ['$eType', 'credit'] }, { $ne: ['$iDoneBy', false] }, { $eq: ['$sDescription', 'Bot chips entry'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
          nAdminBotDebit: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eStatus', 'success'] }, { $eq: ['$eType', 'debit'] }, { $ne: ['$iDoneBy', false] }, { $eq: ['$sDescription', 'Bot chips entry'] }],
                },
                '$nAmount',
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: false,
        },
      },
    ];

    const tableCountQuery = [
      {
        $match: {
          //eBoardType: 'cash',
          ...dateFilter,
        },
      },
      {
        $project: {
          _id: false,
          eBoardType: true,
          eState: true,
          nAmountIn: true,
          nAmountOut: true,
          eStatus: true,
          eGameType: true,
        },
      },
      {
        $group: {
          _id: '-',
          nTotalClassicRunningGame: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'classic'] }, { $eq: ['$eState', 'running'] }, { $eq: ['$eStatus', 'y'] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalClassicFinishedGame: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'classic'] }, { $eq: ['$eState', 'finished'] }, { $eq: ['$eStatus', 'y'] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalRushRunningGame: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'rush'] }, { $eq: ['$eState', 'running'] }, { $eq: ['$eStatus', 'y'] }],
                },
                1,
                0,
              ],
            },
          },
          nTotalRushFinishedGame: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eGameType', 'rush'] }, { $eq: ['$eState', 'finished'] }, { $eq: ['$eStatus', 'y'] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: false,
        },
      },
    ];

    const response = {
      nTotalUsers: 0,
      nTotalActiveUsers: 0,
      nTotalActiveBot: 0,
      nTotalDeletedUsers: 0,
      nTotalEmailVerifiedUsers: 0,
      nTotalMobileVerifiedUsers: 0,
      nTotalBot: 0,
      nTotalBotBalance: 0,
      nTotalUserBalance: 0,
      nAdminBotCredit: 0,
      nAdminBotDebit: 0,
      nUserCredit: 0,
      nAdminCredit: 0,
      nUserDebit: 0,
      nAdminDebit: 0,
      nUserPending: 0,

      nTotalClassicRunningGame: 0,
      nTotalClassicFinishedGame: 0,
      nTotalRushRunningGame: 0,
      nTotalRushFinishedGame: 0,
      nTotalRunningGames: 0,
      nTotalFinishedGames: 0,
    };

    const queries = [User.aggregate(userQuery), Transaction.aggregate(transactionQuery), PokerFinishGame.aggregate(tableCountQuery)];

    const [[usersResult], [transactionResult], [tableCountResult]] = await Promise.all(queries);

    if (usersResult) {
      response.nTotalUsers = usersResult.nTotalUsers || 0;
      response.nTotalActiveUsers = usersResult.nTotalActiveUsers || 0;
      response.nTotalActiveBot = usersResult.nTotalActiveBot || 0;
      response.nTotalDeletedUsers = usersResult.nTotalDeletedUsers || 0;
      response.nTotalEmailVerifiedUsers = usersResult.nTotalEmailVerifiedUsers || 0;
      response.nTotalMobileVerifiedUsers = usersResult.nTotalMobileVerifiedUsers || 0;
      (response.nTotalBot = usersResult.nTotalBot || 0),
        (response.nTotalBotBalance = usersResult.nTotalBotBalance || 0),
        (response.nTotalUserBalance = usersResult.nTotalUserBalance || 0);
    }

    if (transactionResult) {
      response.nUserCredit = transactionResult.nUserCredit || 0;
      response.nAdminCredit = transactionResult.nAdminCredit || 0;

      response.nUserDebit = transactionResult.nUserDebit || 0;
      response.nAdminDebit = transactionResult.nAdminDebit || 0;
      response.nUserPending = transactionResult.nUserPending || 0;
      response.nAdminBotCredit = transactionResult.nAdminBotCredit || 0;
      response.nAdminBotDebit = transactionResult.nAdminBotDebit || 0;
      response.nTotalWithdrawal = response.nUserDebit + response.nAdminDebit || 0;
      response.nTotalDeposit = response.nUserCredit + response.nAdminCredit || 0; // total rummy balance
    }

    if (tableCountResult) {
      response.nTotalClassicRunningGame = tableCountResult.nTotalClassicRunningGame || 0;
      response.nTotalClassicFinishedGame = tableCountResult.nTotalClassicFinishedGame || 0;
      response.nTotalRushRunningGame = tableCountResult.nTotalRushRunningGame || 0;
      response.nTotalRushFinishedGame = tableCountResult.nTotalRushFinishedGame || 0;
      response.nTotalRunningGames = response.nTotalClassicRunningGame + response.nTotalRushRunningGame;
      response.nTotalFinishedGames = response.nTotalClassicFinishedGame + response.nTotalRushFinishedGame;
    }

    const approvedKYCCount = await KYC.countDocuments({
      'oPan.eStatus': 'A',
      'oAadhaar.eStatus': 'A',
    });

    if (approvedKYCCount) response.nTotalKYC = approvedKYCCount;

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:909 ~ controllers.getList= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.getUserCountAndAdminWin = async (req, res) => {
  const userQuery = [
    {
      $match: {
        eUserType: 'user',
      },
    },
    {
      $group: {
        _id: null,
        nTotalActiveUsers: {
          $sum: {
            $cond: [{ $eq: ['$eStatus', 'y'] }, 1, 0],
          },
        },
        nTotalInactiveUsers: {
          $sum: {
            $cond: [{ $eq: ['$eStatus', 'n'] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        nTotalUsers: {
          $sum: ['$nTotalActiveUsers', '$nTotalInactiveUsers'],
        },
        nTotalActiveUsers: 1,
        nTotalInactiveUsers: 1,
      },
    },
  ];

  const totalAdminWinQuery = [
    {
      $match: {
        eState: 'finished',
      },
    },
    {
      $match: {
        aParticipant: {
          $not: {
            $elemMatch: {
              eState: 'winner',
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        nTotalDailyRevenue: {
          $sum: {
            $cond: [{ $eq: [{ $dayOfYear: '$dCreatedDate' }, { $dayOfYear: new Date() }] }, '$nTableChips', 0],
          },
        },
        nTotalMonthlyRevenue: {
          $sum: {
            $cond: [{ $eq: [{ $month: '$dCreatedDate' }, { $month: new Date() }] }, '$nTableChips', 0],
          },
        },
        nTotalYearlyRevenue: {
          $sum: {
            $cond: [{ $eq: [{ $year: '$dCreatedDate' }, { $year: new Date() }] }, '$nTableChips', 0],
          },
        },
        nTotalAdminWinGames: {
          $sum: {
            $cond: [{ $eq: ['$eState', 'winner'] }, 1, 0],
          },
        },
        nTotalAdminWinAmount: {
          $sum: '$nTableChips',
        },
      },
    },
    {
      $project: {
        _id: 0,
        nTotalDailyRevenue: 1,
        nTotalMonthlyRevenue: 1,
        nTotalYearlyRevenue: 1,
        nTotalAdminWinGames: 1,
        nTotalAdminWinAmount: 1,
      },
    },

    // {
    //   $group: {
    //     _id: null,
    //     nTotalGames: { $sum: 1 },
    //     nTotalAmount: { $sum: '$nTableChips' },
    //   },
    // },
    // {
    //   $project: {
    //     _id: 0,
    //     nTotalGames: 1,
    //     nTotalAmount: 1,
    //   },
    // },
  ];

  const adminRakeQuery = [
    {
      $match: {
        eType: 'credit',
        eStatus: 'Success',
        eMode: 'game',
        sDescription: 'adminRakeAmountCredit',
      },
    },
    {
      $group: {
        _id: null,
        nTotalAdminRake: { $sum: '$nAmount' },
      },
    },
  ];

  const chipsAmountQuery = [
    {
      $match: {
        eType: 'credit',
        eStatus: 'Success',
        $or: [{ eMode: 'IAP' }, { eMode: 'DR' }],
      },
    },
    {
      $group: {
        _id: null,
        nTotalChipsAmount: {
          $sum: {
            $cond: [{ $eq: ['$eMode', 'IAP'] }, '$nAmount', 0],
          },
        },
        nTotalDailyRewardsAmount: {
          $sum: {
            $cond: [{ $eq: ['$eMode', 'DR'] }, '$nAmount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        nTotalChipsAmount: 1,
        nTotalDailyRewardsAmount: 1,
      },
    },
  ];

  const [[userResult], adminWinResult, chipsAmountResult, adminRakeResult] = await Promise.all([
    User.aggregate(userQuery),
    PokerFinishGame.aggregate(totalAdminWinQuery),
    Transaction.aggregate(chipsAmountQuery),
    Transaction.aggregate(adminRakeQuery),
  ]);

  return res.reply(messages.success(), {
    ...userResult,
    nTotalAdminWinGames: adminWinResult[0]?.nTotalAdminWinGames || 0,
    nTotalAdminWinAmount: adminWinResult[0]?.nTotalAdminWinAmount || 0 + adminRakeResult[0]?.nTotalAdminRake || 0,
    nTotalDailyRevenue: adminWinResult[0]?.nTotalDailyRevenue || 0 + adminRakeResult[0]?.nTotalAdminRake || 0,
    nTotalMonthlyRevenue: adminWinResult[0]?.nTotalMonthlyRevenue || 0 + adminRakeResult[0]?.nTotalAdminRake || 0,
    nTotalYearlyRevenue: adminWinResult[0]?.nTotalYearlyRevenue || 0 + adminRakeResult[0]?.nTotalAdminRake || 0,
    nTotalChipsAmount: chipsAmountResult[0]?.nTotalChipsAmount || 0,
    nTotalDailyRewardsAmount: chipsAmountResult[0]?.nTotalDailyRewardsAmount || 0,
    nTotalAdminRake: adminRakeResult[0]?.nTotalAdminRake || 0,
  });
};

controllers.gameAnalysis = async (req, res) => {
  try {
    return res.reply(messages.success());
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

module.exports = controllers;
