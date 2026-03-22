const router = require('express').Router();
const controllers = require('./lib/controllers');
const middleware = require('./lib/middlewares');
const commonMiddleware = require('../../middleware');

router.post('/guest/board/join', commonMiddleware.isGuestAuthenticated, middleware.getGuestPrototype, middleware.joinGuestBoard, controllers.joinGuestBoard);
router.post('/guest/board/pause', commonMiddleware.isGuestAuthenticated, controllers.pauseGuestBoard);
router.post('/guest/board/resume', commonMiddleware.isGuestAuthenticated, controllers.resumeGuestBoard);
router.post(
  '/guest/tutorial/board/join',
  commonMiddleware.isGuestAuthenticated,
  middleware.enableGuestTutorialMode,
  middleware.getGuestPrototype,
  middleware.joinGuestBoard,
  controllers.joinGuestBoard
);
router.get('/guest/board/leave', commonMiddleware.isGuestAuthenticated, controllers.leaveBoard);

router.use(commonMiddleware.isAuthenticated);

router.get('/board/list', controllers.listBoard);
router.post('/board/join', middleware.getPrototype, middleware.joiningProcess, controllers.joinBoard);
router.post('/private/create', middleware.getPrototype, middleware.createPrivateBoard, controllers.joinBoard);
router.post('/private/join', middleware.joinPrivateBoard, controllers.joinBoard);
router.get('/board/leave', controllers.leaveBoard);

module.exports = router;
