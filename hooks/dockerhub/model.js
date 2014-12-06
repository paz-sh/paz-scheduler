var deploy = require('../../lib/deploy');
var joi = require('joi');
var schema = require('./schema');
var _Error = require('error-plus');

module.exports = function Service(cfg) {
  var model = {},
      client = cfg.client,
      db = cfg.leveldb.db;

  // XXX code repeated in docker hook
  var options = { deploy: true };
  if (cfg['ssh-key']) {
    options.key = cfg['ssh-key'];
  }
  if (cfg['ssh-port']) {
    options.port = cfg['ssh-port'];
  }
  if (cfg.loglevel === 'debug') {
    options.debug = true;
  }
  if (cfg.nodeploy) {
    options.deploy = false;
  }
  var sshHost = cfg['ssh-host'];

  model.validate = function (req, uuid, cb) {
    req.log.trace(req.body, 'Validating post');
    joi.validate(req.body, schema, {allowUnknown: true}, function (err) {
      if (!err) {
        req.log.trace('No error');
        return cb(null);
      }
      req.log.error(err);
      return cb(new _Error(err.message, {statusCode: 400, uuid: uuid}));
    });
  };

  model.post = function (req, cb) {
    var hookObject = req.body;
    req.log.debug(req.body, 'Hook received');
    var dockerRepository = hookObject.repository.repo_name;

    client.get(
      '/services?dockerRepository=' + encodeURIComponent(dockerRepository),
      function (err, svcReq, svcRes, data) {
        if (err) {
          // XXX handle 404 specially?
          return cb(err);
        }

        var serviceObject = data.doc;
        var serviceName = serviceObject.name;

        deploy(serviceName, serviceObject, hookObject, sshHost, options, db,
          function (err, versionNumber) {
            if (err) {
              req.log.error(err);
              return cb(err);
            }
            req.log.info({
              message: 'Successfully deployed ' + serviceName + ' v' + versionNumber
            });
            return cb(null, { statusCode: 201 });
          });
      });
  };

  return model;
};
