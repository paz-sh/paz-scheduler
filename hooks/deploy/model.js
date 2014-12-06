var deploy = require('../../lib/deploy'),
    joi = require('joi'),
    _Error = require('error-plus');

module.exports = function Service(cfg) {
  var model = {},
      client = cfg.client,
      db = cfg.leveldb.db;

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

  var schema = {
    serviceName: joi.string().required(),
    dockerRepository: joi.string().required(),
    pushedAt: joi.number().required()
  };

  model.validate = function (body, uuid, cb) {
    joi.validate(body, schema, function (err) {
      if (!err) {
        return cb(null);
      }
      return cb(new _Error(err.message, { statusCode: 400 } ));
    });
  };

  model.post = function (req, cb) {
    var hookObject = req.body;
    var serviceName = hookObject.serviceName;
    req.log.debug(hookObject, 'POST data');

    client.get(
      '/services/' + serviceName,
      function (err, svcReq, svcRes, serviceObject) {
        if (err && err.message.match(/Key\ not\ found/g)) {
          return cb(new _Error(
            'Service ' + serviceName + ' is not in the service directory.', { 
            statusCode: 404 
          }));
        } else if (err) {
          return cb(err);
        }
        req.log.debug(serviceObject, 'Service object from service directory');

        deploy(serviceName, serviceObject.doc, hookObject, sshHost, options, db,
          function (err, versionNumber) {
            if (err) {
              req.log.error(err);
              return cb(err);
            }
            req.log.info({
              message: 
                'Successfully deployed ' + serviceName + ' v' + versionNumber
            });
            return cb(null, { statusCode: 200 });
          });
      });
  };

  return model;
};
