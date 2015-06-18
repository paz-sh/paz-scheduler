module.exports = function(cfg) {
  var controller = {};
  var config = require('./model')(cfg);

  controller.getLatest = function(req, res) {
    req.log.info({'config.getLatest': req.params.name, 'uuid': req._uuid});

    config.getLatest({
      uuid: req._uuid
    },
    req.params.name,
    function(err, response) {
      if (err) {
        res.send(err.statusCode || 500, err.message);
      } else {
        res.send(response ? 200 : 404, response);
      }
    });
  };

  controller.get = function(req, res) {
    req.log.info({
      'config.get': req.params.name,
      'version': req.params.version,
      'uuid': req._uuid
    });

    config.get({
      uuid: req._uuid
    },
    req.params,
    function(err, response) {
      if (err) {
        res.send(err.statusCode || 500, err.message);
      } else {
        res.send(response ? 200 : 404, response);
      }
    });
  };

  controller.getHistory = function(req, res) {
    req.log.info({
      'config.getHistory': req.params.name,
      'uuid': req._uuid
    });

    config.getHistory({
      uuid: req._uuid
    },
    req.params,
    function(err, response) {
      if (err) {
        res.send(err.statusCode || 500, err.message);
      } else {
        res.send(response ? 200 : 404, response);
      }
    });
  };

  controller.getJournal = function(req, res) {
    req.log.info({'config.getJournal': '', 'uuid': req._uuid});
    config.getJournal({
      uuid: req._uuid
    },
    req.params,
    function(err, response) {
      if (err) {
        res.send(err.statusCode || 500, err.message);
      } else {
        res.send(response ? 200 : 404, response);
      }
    });
  };

  return controller;
};
