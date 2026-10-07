export const validate = (schema) => (req, res, next) => {
  req.valid = schema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
};
