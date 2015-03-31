var _Error = require('error-plus');

module.exports = function Service(cfg) {
  var model = {};
  var db = cfg.leveldb.db;

  var options = {};
  if (cfg.loglevel === 'debug') {
    options.debug = true;
  }

  // Gets the last deployed config
  model.getLatest = function(meta, name, cb) {
    if (!name) {
      return cb(new _Error('Bad request. Expected service name.', {
        statusCode: 400
      }));
    }

    var dbKey = 'latest!' + name;

    db.get(dbKey, function(err, doc) {
      if (err && err.notFound) {
        return cb(new _Error(err, {statusCode: 404, message: err.message}));
      } else if (err) {
        return cb(new _Error(err, {statusCode: 500, message: err.message}));
      }

      if (doc) {
        dbKey = 'deploy!' + name + '!' + doc;

        db.get(dbKey, function(err2, doc2) {
          if (err2 && err.notFound) {
            return cb(new _Error(err2, {statusCode: 404, message: err2.message}));
          } else if (err2) {
            return cb(new _Error(err2, {statusCode: 500, message: err2.message}));
          }

          if (doc2) {
            return cb(null, {
              doc2: doc2.service.config
            });
          }
        });
      }
    });
  };

  // Gets config for the specified version
  model.get = function(meta, params, cb) {
    if (!params.name) {
      return cb(new _Error('Bad request. Expected service name.', {
        statusCode: 400
      }));
    }

    if (!params.version) {
      return cb(new _Error('Bad request. Expected service version number.', {
        statusCode: 400
      }));
    }

    var dbKey = 'deploy!' + params.name + '!' + params.version;
    db.get(dbKey, function(err, doc) {
      if (err) {
        if (err.notFound) {
          return cb(new _Error(err, {statusCode: 404, message: err.message}));
        } else {
          return cb(new _Error(err, {statusCode: 500, message: err.message}));
        }
      }

      if (doc) {
        return cb(null, {
          doc: doc.service.config
        });
      }
    });

  };

  model.getHistory = function(meta, name, cb) {
    if (!name) {
      return cb(new _Error('Bad request. Expected service name.', {
        statusCode: 400
      }));
    }

    var doc = {};

    db.createReadStream().on('data', function(data) {
      if (data.key.match(/deploy\!/g)) {
        var version = data.key.split('!')[2];

        doc[version] = data.value.service.config;
      }
    }).on('error', function(err) {
      return cb(new _Error('Database read error:' + err.message, {
        statusCode: 500
      }));
    }).on('end', function() {
      return cb(null, {
        doc: doc
      });
    });
  };

  return model;
};
