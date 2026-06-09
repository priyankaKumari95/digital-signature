'use strict';

module.exports = function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.validatedQuery = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      next(err);
    }
  };
};
