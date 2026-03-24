import app from '../../web/server.js';

export default function handler(req, res) {
  return app(req, res);
}
