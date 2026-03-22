const router = require('express').Router();
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

router.use(commonMiddleware.isAuthenticated);

router.get('/', controllers.get);
router.post('/update', controllers.updateProfile);
router.get('/logout', controllers.logout);
router.get('/delete/account', controllers.deleteAccount);
router.post('/addCash', controllers.addCash);
router.post('/setting', controllers.userSetting);

// ------------------------------ Test API ------------------------------
// router.post('/setting', controllers.userSetting);
// router.post('/addProto', controllers.addProto);
// router.post('/pre-sign-url', controllers.presignURL);
// router.post('/player-status', controllers.playerStatus);
module.exports = router;
