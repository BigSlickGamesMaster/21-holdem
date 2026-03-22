const services = {};

let squareSdk;
let warnedUnavailable = false;

function getSquareSdk() {
  if (squareSdk !== undefined) return squareSdk;

  try {
    squareSdk = require('square');
  } catch (error) {
    squareSdk = null;
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      log.yellow(`Square SDK unavailable in local development: ${error.message}`);
    }
  }

  return squareSdk;
}

function getSquareClient() {
  const sdk = getSquareSdk();
  if (!sdk) return null;

  if (!services.client) {
    services.client = new sdk.SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: sdk.SquareEnvironment.Sandbox,
    });
  }

  return services.client;
}

services.createPayment = async (amount, currency, sourceId, customerId, transactionId) => {
  try {
    const client = getSquareClient();
    if (!client) throw new Error('Square payments are unavailable in local development.');

    const res = await client.payments.create({
      sourceId: sourceId,
      idempotencyKey: transactionId,
      referenceId: transactionId,
      amountMoney: {
        amount: BigInt(amount),
        currency: currency,
      },
      customerId: customerId,
    });

    return JSON.parse(JSON.stringify(res, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));
  } catch (error) {
    console.log('square createPayment error ::', error);
    throw error;
  }
};

services.getPayment = async transactionId => {
  try {
    const client = getSquareClient();
    if (!client) {
      return {
        payment: {
          id: transactionId,
          status: 'NOT_CONFIGURED',
        },
      };
    }

    const res = await client.payments.get({ paymentId: transactionId });
    return JSON.parse(JSON.stringify(res, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));
  } catch (error) {
    console.log('square getPayment error ::', error);
    throw error;
  }
};

services.webhookCallback = async req => {
  try {
    const sdk = getSquareSdk();
    if (!sdk?.WebhooksHelper) return true;

    const signature = req.headers['x-square-signature'];
    const rawBody = JSON.stringify(req.body);

    const isValid = await sdk.WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader: signature,
      signatureKey: process.env.SQUARE_SIGNATUREKEY_SECRET,
      notificationUrl: `${process.env.BASE_API_PATH}/transaction/square/buyhook`,
    });

    if (!isValid) return false;
    return true;
  } catch (error) {
    console.log('square webhook error ::', error);
    throw error;
  }
};

module.exports = services;
