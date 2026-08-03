import handler from './index.js';

export default async function specialMealsHandler(req, res) {
  const query = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = `/api/special-meals${query}`;
  return handler(req, res);
}
