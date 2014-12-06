'use strict';

var restify = require('restify');
var jsonContentTypeSetter = require('./json-content-type-setter');

module.exports = function(api, cfg) {
  var h = require('../hooks')(cfg);
  var r = require('../resources')(cfg);
  var bodyParser = restify.bodyParser({
        mapParams: false
      });

  //
  // hooks
  //
  api.post('/hooks/deploy', bodyParser, h.deploy.validate, h.deploy.post);
  api.post('/hooks/dockerhub', jsonContentTypeSetter, bodyParser, h.dockerhub.validate, h.dockerhub.post);

  //
  // REST resources
  //
  api.get('/config/:name/version/latest', bodyParser, r.config.getLatest);
  api.get('/config/:name/version/:version', bodyParser, r.config.get);
  api.get('/config/:name/history', bodyParser, r.config.getHistory);
};
