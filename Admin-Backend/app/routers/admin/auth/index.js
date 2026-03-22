const router = require('express').Router();
const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

router.use(middlewares.apiLimiter);
router.post('/register', controllers.register);
router.post('/login', controllers.login);
router.post('/password/forgot', controllers.forgotPassword);
router.post('/password/reset/:token', controllers.resetPassword);
router.post('/verify-forgotpassword-maillink/:token', controllers.verifyForgotPasswordMailLink);

module.exports = router;
