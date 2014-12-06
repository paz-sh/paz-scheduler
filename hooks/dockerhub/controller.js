module.exports = function (cfg) {
  var controller = {},
      model = require('./model')(cfg);

  controller.validate = function (req, res, next) {
    req.log.debug({'controller::validate': res.body});
    req.log.debug({request: req}, 'Request dump');
    model.validate(req, req._uuid, function (err) {
      if (err) {
        req.log.error(err);
        res.send(err.statusCode, err);
        return;
      }
      else {
        next();
      }
    });
  };

  controller.post = function (req, res) {
    req.log.info({'dockerhub.post': '*', 'uuid': req._uuid});
    model.post(req, function (err, response) {
      if (err) {
        req.log.error(err);
        res.send(err.statusCode || 500, err.message);
      }
      else {
        res.send(200, response);
      }
    });
  };

  return controller;
};
