import handler from './index.js';

export default async function usersHandler(req, res) {
  req.url = '/api/users';
  return handler(req, res);
}
