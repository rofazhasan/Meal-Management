import handler from '../index.js';

export default async function resetHandler(req, res) {
  req.url = '/api/system/reset';
  return handler(req, res);
}
