import handler from './index.js';

export default async function emergenciesHandler(req, res) {
  req.url = '/api/emergencies';
  return handler(req, res);
}
