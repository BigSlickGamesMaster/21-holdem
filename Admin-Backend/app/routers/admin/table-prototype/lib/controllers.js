const { BoardProtoType } = require('../../../../models');

const controllers = {};

controllers.getBoardProto = async (req, res) => {
  try {
    const body = _.pick(req.query, ['eGameType', 'size', 'pageNumber', 'orderBy', 'sort', 'search', 'eStatus']);
    const match = {};
    const sort = {};

    if (body.nBoardFee) match.nBoardFee = body.nBoardFee;
    if (body.eGameType) match.eGameType = body.eGameType;
    if (!body.sort) sort.dCreatedDate = -1;
    if (body.sort) sort[body.sort] = body.orderBy === 'DESC' ? -1 : 1;
    body.pageNumber = body.pageNumber ? body.pageNumber : 1;

    body.size = body.size ? body.size : 10;
    const startIndex = (parseInt(body.pageNumber) - 1) * parseInt(body.size);
    const endIndex = parseInt(body.size);
    const search = _.searchRegex(body.search);
    if (body.eStatus) match.eStatus = body.eStatus || 'y';

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
        $match: { ...match, sName: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
      },

      {
        $facet: {
          prototypes: facetArray,
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

    const prototypes = await BoardProtoType.aggregate(query);
    return res.reply(messages.success(), prototypes);
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.addBoardProto = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sName', 'nMaxPlayer', 'nTurnTime', 'nMinBuyIn', 'nMaxBuyIn', 'nMaxTableAmount', 'nMinBet', 'nMaxBet']);

    if (!body.sName) return res.reply(messages.required_field('board Name'));
    if (!body.nTurnTime) return res.reply(messages.required_field('Turn Time'));
    if (!body.nMaxPlayer) return res.reply(messages.required_field('Max Player'));
    if (!body.nMinBuyIn) return res.reply(messages.required_field('Min Buy In'));
    // if (!body.nMaxTableAmount) return res.reply(messages.required_field('Max Table Amount'));
    // if (body.nMinBuyIn * 20 >= body.nMaxTableAmount) return res.reply(messages.invalidRequestCM('Max Table Amount must be greater than Min Buy In x 20'));
    if (!body.nMinBet) return res.reply(messages.required_field('Min Bet'));
    // if (!body.nMaxBet) return res.reply(messages.required_field('Max Bet'));
    // if (body.nMinBet * 5 > body.nMinBuyIn) return res.reply(messages.required_field('Min Bet must be greater than Min Buy In'));

    await BoardProtoType.create(body);
    return res.reply(messages.success('prototype add'));
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:70 ~ controllers.addProto= ~ error:`, error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.getBoardProtoById = async (req, res) => {
  try {
    const params = _.pick(req.params, ['iProtoId']);
    const query = { _id: params.iProtoId };
    const boards = await BoardProtoType.findById(query);
    if (!boards) return res.reply(messages.not_found('Board prototype'));
    return res.reply(messages.success(), boards);
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.updateBoardProto = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sName', 'nMaxPlayer', 'nTurnTime', 'nMinBuyIn', 'nMaxBuyIn', 'nMaxTableAmount', 'nMinBet', 'nMaxBet', 'eStatus']);
    const params = _.pick(req.params, ['iProtoId']);
    console.log('Very Bad 🚀 ~ file: controllers.js:98 ~ controllers.updateBoardProto= ~ params:', params);
    if (!params.iProtoId) return res.reply(messages.required_field('prototype id'));

    const update = {};
    if (body.sName) update.sName = body.sName;
    if (body.nMaxPlayer) update.nMaxPlayer = body.nMaxPlayer;
    if (body.nTurnTime) update.nTurnTime = body.nTurnTime;
    if (body.nMinBuyIn) update.nMinBuyIn = body.nMinBuyIn;
    // if (body.nMaxTableAmount) update.nMaxTableAmount = body.nMaxTableAmount;
    if (body.nMinBet) update.nMinBet = body.nMinBet;
    // if (body.nMaxBet) update.nMaxBet = body.nMaxBet;
    if (body.eStatus) update.eStatus = body.eStatus;

    const board = await BoardProtoType.findOneAndUpdate({ _id: params.iProtoId }, { $set: update }, { new: true });
    if (!board) return res.reply(messages.not_found('prototype'));
    return res.reply(messages.success());
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:107 ~ controllers.updateProto= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.deleteBoardProto = async (req, res) => {
  try {
    const { iProtoId } = _.pick(req.params, ['iProtoId']);
    const query = { _id: iProtoId };

    await BoardProtoType.deleteOne(query);
    return res.reply(messages.successfully('Prototype deleted'));
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

module.exports = controllers;
