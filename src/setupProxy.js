const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = process.env.REACT_APP_PROXY_TARGET || 'http://game-backend:4000';

  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathFilter: ['/api', '/socket.io'],
    })
  );
};