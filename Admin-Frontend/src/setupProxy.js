const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const baseTarget = process.env.REACT_APP_PROXY_TARGET || 'http://admin-backend:3051';
  const target = `${baseTarget.replace(/\/$/, '')}/api/v1/admin`;

  app.get('/__proxy-health', (_req, res) => {
    res.json({ ok: true, target });
  });

  app.use(
    '/api/v1/admin',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    })
  );
};