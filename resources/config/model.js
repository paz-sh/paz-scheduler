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

    db.get(dbKey, function(latestErr, latestDoc) {
      if (latestErr && latestErr.notFound) {
        return cb(new _Error(latestErr, {statusCode: 404, message: latestErr.message}));
      } else if (latestErr) {
        return cb(new _Error(latestErr, {statusCode: 500, message: latestErr.message}));
      }

      if (latestDoc) {
        dbKey = 'deploy!' + name + '!' + latestDoc;

        db.get(dbKey, function(err, doc) {
          if (err && err.notFound) {
            return cb(new _Error(err, {statusCode: 404, message: err.message}));
          } else if (err) {
            return cb(new _Error(err, {statusCode: 500, message: err.message}));
          }

          if (doc) {
            return cb(null, {
              doc: doc.service.config
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

  model.getHistory = function(meta, params, cb) {
    if (!params.name) {
      return cb(new _Error('Bad request. Expected service name.', {
        statusCode: 400
      }));
    }

    var doc = {};
    var re = new RegExp('deploy!' + params.name + '!', 'g');
    db.createReadStream().on('data', function(data) {
      if (data.key.match(re)) {
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

  // Gets journal
  model.getJournal = function(meta, params, cb) {

    var serializeJournal = function(journal) {
      var deployColumn = journal.value.key.split('!');
      var content = {};
      content.event = journal.value.event;
      content.serviceName = deployColumn[1];
      content.version = deployColumn[2];
      content.timestamp = journal.value.timestamp;
      return content;
    };

    var doc = [];

    db.createReadStream().on('data', function(journal) {
      if (journal.key.match(/journal\!/g)) {
        // Query service config
        db.get(journal.value.key, function(err, data) {
          var content = serializeJournal(journal);
          if (err || !data) {
            content.config = {};
            doc.push(content);
          } else {
            content.config = data.service.config;
            doc.push(content);
          }
        });
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
