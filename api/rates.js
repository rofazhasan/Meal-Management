import handler from './index.js';

export default async function ratesHandler(req, res) {
  req.url = '/api/rates';
  return handler(req, res);
}
