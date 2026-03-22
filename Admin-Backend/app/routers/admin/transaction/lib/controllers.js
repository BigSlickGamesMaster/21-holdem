const { Transaction } = require('../../../../models');
const controllers = {};
controllers.getUserTransactionsList = async (req, res) => {
  try {
    const body = _.pick(req.query, ['eType', 'eMode', 'eStatus', 'size', 'pageNumber', 'search', 'dEndDate']);
    const sort = {};

    if (!body.sort) sort.dCreatedDate = -1;
    if (body.sort) sort[body.sort] = body.orderBy === 'DESC' ? -1 : 1;

    body.pageNumber = body.pageNumber ? body.pageNumber : 1;
    body.size = body.size ? body.size : 10;

    const startIndex = (parseInt(body.pageNumber) - 1) * parseInt(body.size);
    const endIndex = parseInt(body.size);

    const search = _.searchRegex(body.search);

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

    const match = {};
    if (body.eMode) match.eMode = body.eMode;
    if (body.eType) match.eType = body.eType;
    if (body.eStatus) match.eStatus = body.eStatus || 'Success';

    if (body.dStartDate && body.dEndDate) {
      const dStartDate = body.dStartDate ? new Date(body.dStartDate) : undefined;
      const dEndDate = body.dEndDate ? new Date(body.dEndDate) : undefined;
      match.$and = dStartDate && dEndDate ? [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lt: dEndDate } }] : [];
    }
    if (body.eStatus || body.eStatus === '') match.eStatus = body.eStatus || 'Success';
    const query = [
      {
        $lookup: {
          from: 'users',
          localField: 'iUserId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $addFields: {
          _id: { $toString: '$_id' },
          iUserId: { $toString: '$iUserId' },
        },
      },
      {
        $match: {
          ...match,
          $or: [
            //
            { iUserId: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { _id: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { 'user.sUserName': { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { eMode: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
          ],
        },
      },
      {
        $project: {
          //   sEmail: { $cond: [{ $ne: ['$user.sEmail', ''] }, '$user.sEmail', '-'] },
          sUserName: { $cond: [{ $ne: ['$user.sUserName', ''] }, '$user.sUserName', '-'] },
          iBoardId: true,
          iUserId: true,
          dCreatedDate: true,
          eStatus: true,
          eType: true,
          eMode: true,
          nAmount: true,
          _id: true,
          //   dExecuteDate: true,
          dCreatedDate: true,
          dUpdatedDate: true,
        },
      },
      {
        $facet: {
          transactions: facetArray,
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

    const transactions = await Transaction.aggregate(query);
    return res.reply(messages.success(), transactions);
  } catch (error) {
    console.log('getUserTransactionsList error::', error);
    return res.reply(messages.error(), error.toString());
  }
};

controllers.getUserTransactionView = async (req, res) => {
  try {
    const { iUserId } = req.params;
    const transaction = await Transaction.findById(iUserId).populate('iUserId', 'sUserName');
    return res.reply(messages.success(), transaction);
  } catch (error) {
    console.log('getUserTransactionView error::', error);
    return res.reply(messages.error(), error.toString());
  }
};

module.exports = controllers;
