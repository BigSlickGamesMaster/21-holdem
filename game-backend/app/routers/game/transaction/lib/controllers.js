const { Transaction, User } = require('../../../../models');
const { square, mongodb } = require('../../../../utils');

const controllers = {};

controllers.getTransactionsList = async (req, res) => {
  try {
    const body = _.pick(req.query, ['eType', 'eMode', 'eStatus', 'size', 'pageNumber', 'search', 'sort', 'orderBy']);
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

    const match = { iUserId: req.user._id };
    match.$and = [{ eMode: { $in: ['game', 'IAP', 'DR'] } }];
    if (body.eMode) match.$and.push({ eMode: body.eMode });
    if (body.eType) match.eType = body.eType;
    if (body.eStatus) match.eStatus = body.eStatus;

    const query = [
      {
        $match: match,
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
    ];

    const transactions = await Transaction.aggregate(query);

    return res.reply(messages.success('Transactions fetched successfully'), transactions);
  } catch (error) {
    console.log('getTransactions error ::', error);
    return res.reply(messages.server_error('getTransactions'));
  }
};

controllers.squareBuyCallBackHook = async (req, res) => {
  try {
    const isValidSignature = await square.webhookCallback(req);
    if (!isValidSignature) return res.reply(messages.invalidRequestCM('Invalid signature'));

    const eventType = req.body.type;
    const eventData = req.body.data;

    const transaction = await Transaction.findOne({ sSquareTransactionId: eventData.object.payment.reference_id });
    if (!transaction) return res.reply(messages.not_found('transaction'));

    const user = await User.findOne({ _id: transaction.iUserId });
    if (!user) return res.reply(messages.not_found('user'));

    switch (eventType) {
      case 'payment.created':
        const paymentCreated = eventData.object.payment;

        if (paymentCreated.status === 'COMPLETED' && transaction.eStatus === 'Pending') {
          user.nChips += transaction.nAmount;
          await user.save();

          transaction.eStatus = 'success';
          transaction.sDescription = 'Payment successful From Square CB';
          await transaction.save();

          return res.reply(messages.success('Payment successful'), paymentCreated);
        }

        return res.reply(messages.invalidRequestCM('Payment is Failed'), paymentCreated);

      default:
        return res.reply(messages.invalidRequestCM('Unhandled event type'), eventType);
    }
  } catch (error) {
    console.log('squareBuyCallBackHook error ::', error);
    return res.reply(messages.server_error('squareBuyCallBackHook'), error);
  }
};

controllers.squareBuyCash = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sSourceId', 'nAmount']);
    if (!body.sSourceId) return res.reply(messages.required_field('Source ID'));
    if (!body.nAmount) return res.reply(messages.required_field('Amount'));

    const transaction = new Transaction({
      _id: mongodb.mongify(),
      iUserId: req.user._id,
      nAmount: body.nAmount,
      eType: 'credit',
      eStatus: 'Pending',
      eMode: 'square',
      sDescription: 'Square transaction',
    });

    const response = await square.createPayment(body.nAmount, 'USD', body.sSourceId, req.user._id.toString(), transaction._id.toString());

    transaction.sSquareTransactionId = response.payment.id; // square transaction id
    await transaction.save();

    if (response.payment.status !== 'COMPLETED') return res.reply(messages.server_error('Square payment error'), response);

    return res.reply(messages.success('Transaction created successfully'), response);
  } catch (error) {
    console.log('squareBuyCash error ::', error);
    return res.reply(messages.server_error('squareBuyCash'), error);
  }
};

controllers.squareCheckStatus = async (req, res) => {
  try {
    const body = _.pick(req.params, ['sSquareTransactionId']);
    if (!body.sSquareTransactionId) return res.reply(messages.required_field('Square Transaction ID'));

    const transaction = await Transaction.findOne({ sSquareTransactionId: body.sSquareTransactionId });
    if (!transaction) return res.reply(messages.not_found('Transaction'));

    if (transaction.eStatus === 'Success') return res.reply(messages.success('Transaction already processed'), transaction);

    const response = await square.getPayment(body.sSquareTransactionId);

    switch (response.payment.status) {
      case 'COMPLETED':
        if (transaction.eStatus === 'Pending') {
          const user = await User.findOne({ _id: transaction.iUserId });
          user.nChips += transaction.nAmount;
          await user.save();

          transaction.eStatus = 'Success';
          transaction.sDescription = 'Payment successful';
          await transaction.save();

          return res.reply(messages.success('Payment successful'), response.payment);
        }
        return res.reply(messages.success('Payment already processed'), response.payment);

      default:
        return res.reply(messages.invalidRequestCM('Square payment error'), response.payment);
    }
  } catch (error) {
    console.log('squareCheckStatus error ::', error);
    return res.reply(messages.server_error('squareCheckStatus'), error);
  }
};

module.exports = controllers;
