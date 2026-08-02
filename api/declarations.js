import handler from './index.js';

export default async function declarationsHandler(req, res) {
  req.url = '/api/declarations';
  return handler(req, res);
}
