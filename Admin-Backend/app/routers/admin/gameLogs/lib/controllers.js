/* eslint-disable prettier/prettier */
const { PokerFinishGame } = require('../../../../models');
const { mongodb, redis, multer } = require('../../../../utils');

const controllers = {};

controllers.listGameLogs = async (req, res) => {
  try {
    const body = _.pick(req.query, ['sort', 'orderBy', 'dStartDate', 'dEndDate', 'size', 'pageNumber', 'search', 'nProfit', 'eBoardType']);
    const sort = {};
    if (!body.sort) sort.dCreatedDate = -1;
    if (body.sort) sort[body.sort] = body.orderBy === 'DESC' ? -1 : 1;
    const search = _.searchRegex(body.search);
    const match = {};
    body.pageNumber = body.pageNumber ? body.pageNumber : 1;
    body.size = body.size ? body.size : 10;
    const startIndex = (parseInt(body.pageNumber) - 1) * parseInt(body.size);
    const endIndex = parseInt(body.size);

    if (body.dStartDate && body.dEndDate) {
      const dStartDate = _.getLocalDate(body.dStartDate);
      const dEndDate = _.getLocalDate(body.dEndDate);
      dEndDate.setDate(dEndDate.getDate() + 1);
      match.$and = [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lte: dEndDate } }];
    }
    if (body.eBoardType === 'pokerJackPrivate') {
      match.sPrivateCode = { $ne: null };
    } else if (body.eBoardType === 'pokerJackPublic') {
      match.sPrivateCode = { $eq: null };
    }

    const facetArray = [
      {
        $sort: sort,
      },
      {
        $skip: startIndex,
      },
      {
        $limit: endIndex,
      },
    ];

    const query = [
      {
        $addFields: {
          iBoardId: { $toString: '$iBoardId' },
        },
      },
      {
        $addFields: {
          aWinner: {
            $filter: {
              input: '$aParticipant',
              as: 'participant',
              cond: { $eq: ['$$participant.eState', 'winner'] },
            },
          },
          aLooser: {
            $filter: {
              input: '$aParticipant',
              as: 'participant',
              cond: { $ne: ['$$participant.eState', 'winner'] },
            },
          },
        },
      },
      {
        $match: {
          ...match,
          $or: [
            //
            // { sUserName: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { iBoardId: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { 'aWinner.sUserName': { $regex: new RegExp(`^.*${search}.*`, 'i') } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          iBoardId: 1,
          nMaxPlayer: 1,
          eState: 1,
          dCreatedDate: 1,
          nAmountIn: 1,
          nAmountOut: 1,
          eGameType: 1,
          eBoardType: 1,
          aCommunityCard: 1,
          nTableChips: 1,
          sPrivateCode: 1,
          nPotSize: 1,
          aWinner: 1,
          aLooser: 1,
        },
      },
      {
        $facet: {
          tables: facetArray, // Apply sort, skip and limit for pagination
          count: [
            {
              $count: 'totalData',
            },
          ],
        },
      },
      {
        $unwind: '$count',
      },
    ];

    const [result] = await PokerFinishGame.aggregate(query);
    return res.reply(messages.success(), result);
  } catch (error) {
    console.log('listGameLogs ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.viewLog = async (req, res) => {
  try {
    const { iLogId } = _.pick(req.params, ['iLogId']);
    const query = [
      {
        $match: {
          _id: mongodb.mongify(iLogId), // Replace iLogId with your specific game ID
        },
      },
      {
        $lookup: {
          from: 'board_prototypes',
          localField: 'iProtoId',
          foreignField: '_id',
          as: 'prototype',
        },
      },
      {
        $unwind: '$prototype',
      },
      {
        $addFields: {
          sPrototypeName: '$prototype.sName',
        },
      },
      {
        $addFields: {
          aWinner: {
            $filter: {
              input: '$aParticipant',
              as: 'participant',
              cond: { $eq: ['$$participant.eState', 'winner'] },
            },
          },
          aLooser: {
            $filter: {
              input: '$aParticipant',
              as: 'participant',
              cond: { $ne: ['$$participant.eState', 'winner'] },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: {
            allUserIds: {
              $concatArrays: ['$aWinner.iUserId', '$aLooser.iUserId'],
            },
            boardId: '$iBoardId',
            nGameRound: '$nGameRound',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $in: ['$iUserId', '$$allUserIds'] }, { $eq: ['$iBoardId', '$$boardId'] }, { $eq: ['$nGameRound', '$$nGameRound'] }],
                },
              },
            },
          ],
          as: 'allTransactions',
        },
      },
      {
        $addFields: {
          // Calculate TotalAmountBated for each winner
          aWinner: {
            $map: {
              input: '$aWinner',
              as: 'winner',
              in: {
                $mergeObjects: [
                  '$$winner',
                  {
                    nTotalAmountBated: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$allTransactions',
                              as: 'txn',
                              cond: { $eq: ['$$txn.iUserId', '$$winner.iUserId'] },
                            },
                          },
                          as: 'txn',
                          in: {
                            $cond: [
                              { $eq: ['$$txn.eType', 'debit'] },
                              { $multiply: ['$$txn.nAmount', 1] }, // Subtract for debit
                              0,
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          // Calculate TotalAmountBated for each looser
          aLooser: {
            $map: {
              input: '$aLooser',
              as: 'looser',
              in: {
                $mergeObjects: [
                  '$$looser',
                  {
                    nTotalAmountBated: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$allTransactions',
                              as: 'txn',
                              cond: { $eq: ['$$txn.iUserId', '$$looser.iUserId'] },
                            },
                          },
                          as: 'txn',
                          in: {
                            $cond: [
                              { $eq: ['$$txn.eType', 'debit'] },
                              { $multiply: ['$$txn.nAmount', 1] }, // Add for debit
                              0,
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          nMaxPlayer: 1,
          iBoardId: 1,
          eState: 1,
          nBoardFee: 1,
          ePokerType: 1,
          eGameType: 1,
          aCommunityCard: 1,
          iSmallBlindId: 1,
          iBigBlindId: 1,
          iDealerId: 1,
          nTableChips: 1,
          sPrivateCode: 1,
          nWinningAmount: 1,
          aWinner: 1,
          aLooser: 1,
          nRakeAmount: 1,
          sPrototypeName: 1,
        },
      },
    ];

    const result = await PokerFinishGame.aggregate(query);
    return res.reply(messages.success(), result);
  } catch (error) {
    console.log('viewLog ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};

module.exports = controllers;
