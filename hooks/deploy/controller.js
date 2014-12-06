module.exports = function (cfg) {
  var controller = {},
      deployHook = require('./model')(cfg);

  controller.validate = function (req, res, next) {
    deployHook.validate(req.body, req._uuid, function (err) {
      if (err) {
        res.send(err.statusCode, err);
      }
      else {
        next();
      }
    });
  };

  controller.post = function (req, res) {
    req.log.info({'deploy.post': '*', 'uuid': req._uuid});
    deployHook.post(req, function (err, response) {
      if (err) {
        res.send(err.statusCode, err.message);
      }
      else {
        res.send(response.statusCode, response);
      }
    });
  };

  return controller;
};
