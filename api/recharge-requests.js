import handler from './index.js';

export default async function rechargeRequestsHandler(req, res) {
  req.url = '/api/recharge-requests';
  return handler(req, res);
}
