const router = require('express').Router();
const { socialAuth } = require('../../../utils');
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

// router.post('/login/social', controllers.socialLogin);
// router.post('/otp/resend', controllers.resendOtp);
// router.post('/otp/verify', controllers.verifyOtp);
router.post('/login', controllers.login);
router.post('/register', controllers.register);
router.get('/email/verify/:token', controllers.verifyEmail);
router.post('/token/refresh', commonMiddleware.isAuthenticated, controllers.refreshToken);
router.post('/change-password', commonMiddleware.isAuthenticated, controllers.changePassword);
router.post('/forgot-password', controllers.forgotPassword);
router.post('/reset-password/:token', controllers.resetPassword);
router.post('/verify-forgotpassword-maillink/:token', controllers.verifyForgotPasswordMailLink);

// ------------------------------ Test API ------------------------------
router.get('/google/auth', socialAuth.getGoogle);
router.get('/google/token', socialAuth.getToken);
router.post('/firebase/notify', controllers.firebaseNotifyTest);
router.post('/guestLogin', controllers.guestLogin);
router.post('/autoLogin', controllers.autoLoginUsers);

module.exports = router;
