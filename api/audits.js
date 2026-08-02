import handler from './index.js';

export default async function auditsHandler(req, res) {
  req.url = '/api/audits';
  return handler(req, res);
}
