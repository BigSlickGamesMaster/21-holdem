/* eslint-disable no-loop-func */
const { User, Transaction, KYC, Bank, Analytics } = require('../../../../models');
const { mongodb, awsServices, nodemailer } = require('../../../../utils');

const controllers = {};

controllers.list = async (req, res) => {
  try {
    const body = _.pick(req.query, ['eStatus', 'size', 'pageNumber', 'search', 'dEndDate', 'eGender', 'eUserType']);
    const sort = {};

    if (!body.sort) sort.dCreatedDate = -1;
    if (body.sort) sort[body.sort] = body.orderBy === 'DESC' ? -1 : 1;

    body.pageNumber = body.pageNumber ? body.pageNumber : 1;

    body.size = body.size ? body.size : 10;
    const startIndex = (parseInt(body.pageNumber) - 1) * parseInt(body.size);
    const endIndex = parseInt(body.size);
    const search = _.searchRegex(body.search);
    if (body.eStatus) body.eStatus = body.eStatus || 'y';

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

    const match = {
      eUserType: 'user',
    };
    if (body.eUserType) match.eUserType = body.eUserType;

    // if (body.dStartDate && body.dEndDate) {
    //     const dStartDate = body.dStartDate ? new Date(body.dStartDate) : undefined;
    //     const dEndDate = body.dEndDate ? new Date(body.dEndDate) : undefined;
    //     match.$and = dStartDate && dEndDate ? [{ dCreatedDate: { $gte: dStartDate } }, { dCreatedDate: { $lt: dEndDate } }] : [];
    // }
    if (body.eStatus) match.eStatus = body.eStatus;
    if (body.eGender) match.eGender = body.eGender;
    const query = [
      {
        $match: {
          ...match,
          $or: [
            //
            { _id: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { sEmail: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            { sUserName: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
            // { sMobile: { $regex: new RegExp(`^.*${search}.*`, 'i') } },
          ],
        },
      },
      {
        $project: {
          sEmail: { $cond: [{ $ne: ['$sEmail', ''] }, '$sEmail', '-'] },
          sUserName: { $cond: [{ $ne: ['$sUserName', ''] }, '$sUserName', '-'] },
          // sMobile: { $cond: [{ $ne: ['$sMobile', ''] }, '$sMobile', '-'] },
          dCreatedDate: true,
          eStatus: true,
          nChips: true,
          eUserType: true,
          oBotProfile: true,
        },
      },
      {
        $facet: {
          users: facetArray,
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

    const user = await User.aggregate(query);
    return res.reply(messages.success(), user);
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:96 ~ error:', error);
    return res.reply(messages.error(), error.toString());
  }
};

controllers.create = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sUserName', 'sEmail', 'nChips', 'eGender', 'sPassword']);

    if (body.nChips < 0) return res.reply(messages.custom.chips_not_negative);
    if (!body.sEmail) return res.reply(messages.required_field('Email'));
    if (!body.sUserName) return res.reply(messages.required_field('Username'));
    if (!body.sPassword) return res.reply(messages.required_field('Password'));

    if (_.isEmail(body.sEmail)) return res.reply(messages.custom.email_allow_only);

    body.sEmail = body.sEmail.toLowerCase();

    // if (_.isUserName(body.sUserName)) return res.reply(messages.custom.username_allow_only);
    const existUser = await User.findOne(
      {
        $or: [{ sUserName: { $regex: new RegExp(`^${body.sUserName}$`, 'i') } }, { sEmail: body.sEmail }],
      },
      { sUserName: 1, sEmail: 1 }
    );
    if (existUser) {
      if (existUser.sUserName === body.sUserName) return res.reply(messages.already_exists('Username'));
      if (existUser.sEmail === body.sEmail) return res.reply(messages.already_exists('Email'));
    }
    const userPassword = body.sPassword;
    body.sPassword = await _.encryptPassword(body.sPassword);
    body.isEmailVerified = true;
    body.eUserType = 'user';
    const new_user = await User.create(body);

    // if (!body.eGender) return res.reply(messages.required_field('Gender'));
    // if (body.eGender !== 'male' && body.eGender !== 'female' && body.eGender !== 'unspecified') return res.reply(messages.invalid_req('Gender Type'));

    // await KYC.create({ iUserId: new_user._id });
    if (body.nChips) {
      await Transaction.create({
        iUserId: new_user._id,
        nAmount: body.nChips,
        iDoneBy: req.admin._id,
        eStatus: 'Success',
        sDescription: 'Manual Entry',
        eMode: 'admin',
      });
    }
    // if (process.env.NODE_ENV === 'prod') {
    await nodemailer.send(nodemailer.user_cred, {
      sEmail: new_user.sEmail,
      sPassword: userPassword,
      sUserName: new_user.sUserName,
      sFrontendUrl: process.env.FRONTEND_URL,
    });
    // }
    return res.reply(messages.success(), new_user);
  } catch (error) {
    console.log('🚀 controller Error::', error.toString());
    return res.reply(messages.server_error(), error);
  }
};

controllers.view = async (req, res) => {
  try {
    const { iUserId } = _.pick(req.params, ['iUserId']);
    if (!iUserId) return res.reply(messages.required_field('iUserId'));
    // const query = [
    //     {
    //         $match: {
    //             _id: mongodb.mongify(iUserId),
    //         },
    //     },
    //     {
    //         $lookup: {
    //             let: {
    //                 iUserId: '$_id',
    //             },
    //             from: 'transactions',
    //             pipeline: [
    //                 {
    //                     $match: {
    //                         $expr: {
    //                             $eq: ['$$iUserId', '$iUserId'],
    //                         },
    //                         eCategory: { $in: ['bank', 'admin'] },
    //                         eType: 'credit',
    //                         eStatus: 'success',
    //                     },
    //                 },
    //                 {
    //                     $group: {
    //                         _id: '$iUserId',
    //                         totalAmount: {
    //                             $sum: '$nAmount',
    //                         },
    //                     },
    //                 },
    //             ],
    //             as: 'transaction',
    //         },
    //     },
    //     {
    //         $unwind: {
    //             path: '$transaction',
    //             preserveNullAndEmptyArrays: true,
    //         },
    //     },
    //     {
    //         $project: {
    //             nOTP: false,
    //             sVerification: false,
    //             sPassword: false,
    //         },
    //     },
    //     {
    //         $addFields: {
    //             nDeposit: '$transaction.totalAmount',
    //         },
    //     },
    // ];

    const user = await User.findOne({ _id: iUserId }, { aPokerBoard: 0, sPassword: 0, sRootSocket: 0, sVerification: 0, nOTP: 0, sToken: 0 }).lean();
    if (!user) return res.reply(messages.custom.user_not_found);
    const analyticsQuery = [
      {
        $match: {
          iUserId: user._id,
        },
      },
      {
        $group: {
          _id: '$iUserId',
          totalInAppTime: { $sum: '$nInAppTime' },
          totalInGameTime: { $sum: '$nInGameTime' },
        },
      },
    ];

    const analytics = await Analytics.aggregate(analyticsQuery);
    if (!analytics) return res.reply(messages.custom.user_not_found);
    user.inAppTime = analytics[0]?.totalInAppTime || 0;
    user.inGameTime = analytics[0]?.totalInGameTime || 0;

    // let userKycDetails = await KYC.findOne({ iUserId: user._id }, { _id: 0, iUserId: 0 }).lean();
    // if (userKycDetails) {
    //   if (userKycDetails.oAadhaar.sFrontImage && userKycDetails.oAadhaar.sBackImage) {
    //     userKycDetails.oAadhaar.sFrontImage = await awsServices.getObject(userKycDetails.oAadhaar.sFrontImage, process.env.S3_KYC_BUCKET);
    //     userKycDetails.oAadhaar.sBackImage = await awsServices.getObject(userKycDetails.oAadhaar.sBackImage, process.env.S3_KYC_BUCKET);
    //   }
    //   if (userKycDetails.oPan.sImage) {
    //     userKycDetails.oPan.sImage = await awsServices.getObject(userKycDetails.oPan.sImage, process.env.S3_KYC_BUCKET);
    //   }
    // }

    // let userBankDetails = await Bank.findOne({ iUserId: user._id }, { _id: 0, iUserId: 0 }).lean();
    // if (!userBankDetails) userBankDetails = {};

    // return res.reply(messages.success(), { user, ...userKycDetails, oBank: userBankDetails });
    return res.reply(messages.success(), user);
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:232 ~ controllers.view= ~ error:`, error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.edit = async (req, res) => {
  try {
    const { iUserId } = _.pick(req.params, ['iUserId']);
    const body = _.pick(req.body, ['sUserName', 'nChips', 'eStatus', 'sEmail']);
    // const { nWithdrawable } = await User.findById(iUserId).lean();
    // const data = await User.findById(iUserId).lean();

    const user = await User.findById(iUserId).lean();
    if (!user) return res.reply(messages.custom.user_not_found);

    const update = {};
    if (body.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    // update.oAddress = data.oAddress ? data.oAddress : {};

    // if (body.eOpponent) update.eOpponent = body.eOpponent;
    if (body.sEmail) {
      if (_.isEmail(body.sEmail)) return res.reply(messages.custom.email_allow_only);
      const existUser = await User.findOne({ sEmail: body.sEmail });
      if (existUser) return res.reply(messages.already_exists('Email'));
      update.sEmail = body.sEmail;
    }

    if (body.sUserName) {
      if (_.isUserName(body.sUserName)) return res.reply(messages.custom.username_allow_only);
      const existUser = await User.findOne(
        {
          sUserName: { $regex: new RegExp(`^${body.sUserName}$`, 'i') }, // Case-insensitive match
        },
        { sUserName: 1 }
      );
      if (existUser) return res.reply(messages.already_exists('Username'));
      update.sUserName = body.sUserName;
    }
    //  if (body.sFullName) update.sFullName = body.sFullName;
    if (body.nChips >= 0) {
      if (body.nChips < 0) return res.reply(messages.custom.chips_not_negative);

      let eType = 'debit';
      if (body.nChips > user.nChips) eType = 'credit';

      if (Math.abs(body.nChips - user.nChips)) {
        await Transaction.create({
          iUserId,
          nAmount: Math.abs(body.nChips - user.nChips),
          sDescription: 'Admin Transaction',
          eStatus: 'Success',
          eType,
          eMode: 'admin',
        });
      }

      update.nChips = body.nChips;
    }
    if (body.isEmailVerified !== undefined) update.isEmailVerified = body.isEmailVerified;
    if (body.eGender) update.eGender = body.eGender;
    if (body.eStatus) update.eStatus = body.eStatus;
    if (body.nChips) update.nChips = body.nChips;

    await User.findOneAndUpdate({ _id: iUserId }, { $set: update }, { new: true });
    // if (body.nChips) {
    //     Transaction.create(
    //         {
    //             iUserId,
    //             nAmount: body.nAmount,
    //             eType: body.eTransactionType, // debit, credit
    //             iDoneBy: req.user._id,
    //             eStatus: 'success',
    //             sDescription: 'Manual Entry',
    //             eCategory: 'admin',
    //             eMode: 'admin',
    //         },
    //         _.errorCallback
    //     );
    // }
    return res.reply(messages.success('User Updated'));
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:271 ~ controllers.edit= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.delete = async (req, res) => {
  try {
    const body = _.pick(req.params, ['iUserId']);
    const query = {
      _id: body.iUserId,
      eUserType: 'user',
    };
    const update = { eStatus: 'd' };
    const user = await User.updateOne(query, update);
    return res.reply(messages.success('User deleted'));
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:290 ~ controllers.delete ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};
module.exports = controllers;
