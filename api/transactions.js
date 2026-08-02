import handler from './index.js';

export default async function transactionsHandler(req, res) {
  req.url = '/api/transactions';
  return handler(req, res);
}
