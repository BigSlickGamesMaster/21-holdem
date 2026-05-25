const Stripe = require('stripe');
const { Setting, Transaction, User } = require('../../../../models');

const controllers = {};

const STRIPE_NOT_CONFIGURED_MESSAGE = 'Stripe checkout is not configured';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error(STRIPE_NOT_CONFIGURED_MESSAGE);
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getCurrency(item) {
  return String(item.sCurrency || process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
}

function getReturnUrl(type) {
  const fallbackFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const fallbackPath = type === 'success' ? '/shop?checkout=success' : '/shop?checkout=cancel';
  return process.env[type === 'success' ? 'STRIPE_SUCCESS_URL' : 'STRIPE_CANCEL_URL'] || `${fallbackFrontendUrl}${fallbackPath}`;
}

function addQueryParam(url, key, value) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${value}`;
}

async function getShopItemByPrice(nPrice) {
  const shopItem = await Setting.findOne({}, { _id: 0, aShop: 1 }).lean();
  if (!shopItem?.aShop?.length) return null;

  return shopItem.aShop.find(item => Number(item.nPrice) === Number(nPrice));
}

async function creditStripeTransaction(transaction, session = {}) {
  if (!transaction) return null;
  if (transaction.eStatus === 'Success') return transaction;

  const updated = await Transaction.findOneAndUpdate(
    { _id: transaction._id, eStatus: 'Pending' },
    {
      $set: {
        eStatus: 'Success',
        sDescription: 'Payment successful from Stripe',
        sStripePaymentIntentId: session.payment_intent || transaction.sStripePaymentIntentId,
      },
    },
    { new: true }
  );

  if (!updated) return transaction;

  await User.updateOne({ _id: updated.iUserId }, { $inc: { nChips: updated.nAmount } });
  return updated;
}

controllers.getShopList = async (req, res) => {
  try {
    const shopList = await Setting.findOne({}, { _id: 0, aShop: 1 }).lean();
    return res.reply(messages.success(), shopList?.aShop || []);
  } catch (error) {
    console.log('controllers.getShopList error ::', error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.buyItem = async (req, res) => {
  try {
    const body = _.pick(req.body, ['nPrice']);
    if (!body.nPrice) return res.reply(messages.required_field('nPrice'));

    const item = await getShopItemByPrice(body.nPrice);
    if (!item) return res.reply(messages.invalid_req('nPrice'));

    const nPrice = Number(item.nPrice);
    const nChips = Number(item.nChips);
    if (!nPrice || nPrice <= 0) return res.reply(messages.invalid_req('nPrice'));
    if (!nChips || nChips <= 0) return res.reply(messages.invalid_req('nChips'));

    if (!process.env.STRIPE_SECRET_KEY) {
      const user = await User.findById(req.user._id, { nChips: 1 }).lean();
      const nPreviousChips = Number(user?.nChips) || 0;
      const nNewChips = nPreviousChips + nChips;
      const transaction = await Transaction.create({
        iUserId: req.user._id,
        nAmount: nChips,
        nPreviousChips,
        nNewChips,
        eType: 'credit',
        eMode: 'manual',
        eStatus: 'Success',
        sDescription: `Local shop credit for ${nChips} chips`,
      });

      await User.updateOne({ _id: req.user._id }, { $inc: { nChips } });
      return res.reply(messages.success('Purchase successful'), { transaction });
    }

    const stripe = getStripe();

    const transaction = await Transaction.create({
      iUserId: req.user._id,
      nAmount: nChips,
      eType: 'credit',
      eMode: 'stripe',
      eStatus: 'Pending',
      sDescription: `Stripe checkout for ${nChips} chips`,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: addQueryParam(getReturnUrl('success'), 'session_id', '{CHECKOUT_SESSION_ID}'),
      cancel_url: getReturnUrl('cancel'),
      client_reference_id: req.user._id.toString(),
      metadata: {
        transactionId: transaction._id.toString(),
        userId: req.user._id.toString(),
        chips: String(nChips),
        price: String(nPrice),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: getCurrency(item),
            unit_amount: Math.round(nPrice * 100),
            product_data: {
              name: item.sTitle || `${nChips} chips`,
              description: `${nChips} chips`,
            },
          },
        },
      ],
    });

    transaction.sStripeSessionId = session.id;
    await transaction.save();

    return res.reply(messages.success('Stripe checkout created'), { sessionId: session.id });
  } catch (error) {
    console.log('controllers.buyItem error ::', error);
    if (error.message === STRIPE_NOT_CONFIGURED_MESSAGE) {
      return res.reply(messages.customCodeAndMessage(503, STRIPE_NOT_CONFIGURED_MESSAGE));
    }
    return res.reply(messages.server_error('buyItem'), error.message || error);
  }
};

controllers.confirmPayment = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.reply(messages.required_field('session_id'));

    const transaction = await Transaction.findOne({ sStripeSessionId: sessionId, iUserId: req.user._id });
    if (!transaction) return res.reply(messages.not_found('transaction'));

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.reply(messages.success('Payment pending'), {
        status: session.payment_status,
        transaction,
      });
    }

    const updated = await creditStripeTransaction(transaction, session);
    return res.reply(messages.success('Payment successful'), updated);
  } catch (error) {
    console.log('controllers.confirmPayment error ::', error);
    return res.reply(messages.server_error('confirmPayment'), error.message || error);
  }
};

controllers.stripeWebhook = async (req, res) => {
  try {
    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).send('STRIPE_WEBHOOK_SECRET is not configured');

    const event = stripe.webhooks.constructEvent(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const transactionId = session.metadata?.transactionId;
      const transaction = transactionId
        ? await Transaction.findOne({ _id: transactionId, sStripeSessionId: session.id })
        : await Transaction.findOne({ sStripeSessionId: session.id });

      if (transaction && session.payment_status === 'paid') await creditStripeTransaction(transaction, session);
    }

    return res.status(200).send({ received: true });
  } catch (error) {
    console.log('controllers.stripeWebhook error ::', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

module.exports = controllers;
