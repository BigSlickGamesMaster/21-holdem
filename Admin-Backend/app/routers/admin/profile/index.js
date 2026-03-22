const router = require('express').Router();
const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

router.use(middlewares.isAuthenticated);

router.get('/', controllers.getProfile);
router.put('/edit', controllers.editProfile);
router.post('/change/password', controllers.changePassword);
router.get('/logout', controllers.logout);

module.exports = router;
