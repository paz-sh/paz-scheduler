var async = require('async');
var debug = require('debug')('deploy');
var override = require('json-override');
var unitfile = require('./unitfile');
var FleetCtl = require('fleetctl-ssh');
var _Error = require('error-plus');

function getFleetCtlTasks(fleetctl, service, unitFilesArray) {
  return unitFilesArray.map(function(ufObj) {
    var options = {
      unitFileData: new Buffer(ufObj.unitfile).toString('base64')
    };
    return fleetctl.start.bind(fleetctl, ufObj.filename, options);
  });
}

function getMockTasks(service, unitFilesArray) {
  return unitFilesArray.map(function() {
    return function(cb) {
      return cb(null);
    };
  });
}

function deploy(serviceName, serviceObject, hookObject, sshHost, options, db, cb) {
  var defaults = {
    sshPort: 22,
    sshKey: null,
    debug: false
  };
  options = override(defaults, options, true);

  debug('serviceName: ' + serviceName);
  debug('serviceObject: ' + JSON.stringify(serviceObject));
  debug('hookObject: ' + JSON.stringify(hookObject));
  debug('options: ' + JSON.stringify(options));

  // determine next version number for this service
  var versionDBKey = 'latest!' + serviceName;
  db.get(versionDBKey, function(err, prevVersion) {
    if (err && err.notFound) {
      prevVersion = 0;
    } else if (err) {
      return cb(err);
    }
    var versionNumber = +prevVersion + 1;
    debug('versionNumber: ' + versionNumber);

    // specify the 'core' user
    if (!serviceObject.config.user) {
      serviceObject.config.user = 'core';
    }

    // get all the unit files for this service
    var unitfilesArray = unitfile(serviceObject, versionNumber);
    debug('unitfilesArray: ' + unitfilesArray);

    var tasks;
    var fleetctl = new FleetCtl(sshHost, options);
    if (options.deploy) {
      tasks = getFleetCtlTasks(fleetctl, serviceObject, unitfilesArray);
    } else {
      tasks = getMockTasks(serviceObject, unitfilesArray);
    }
    debug('# tasks: ' + tasks.length);
    var t = Date.now();
    async.parallel(tasks, function(fleetErr) {
      debug('task execution complete');
      if (fleetErr) {
        debug('fleet error: ' + fleetErr.message);
        return cb(new _Error(fleetErr.message, {
          statusCode: 500
        }));
      }
      var dbDoc = {
        timestamp: t,
        service: serviceObject
      };
      var dbKey = 'deploy!' + serviceName + '!' + versionNumber;
      var journalKey = 'journal!' + t;
      var journalvalue = {
        'event': 'deploy',
        'timestamp': t,
        'key': dbKey
      };
      var puts = [
        {
          type: 'put',
          key: journalKey,
          value: journalvalue
        },
        {
          type: 'put',
          key: dbKey,
          value: dbDoc
        },
        {
          type: 'put',
          key: versionDBKey,
          value: versionNumber
        }
      ];

      debug('Going to insert into DB: ' + JSON.stringify(puts));

      db.batch(puts, function(dberr) {
        if (dberr) {
          debug('DB error: ' + dberr);
          return cb(dberr);
        }
        debug('DB insert okay');
        return cb(null, versionNumber);
      });
    });
  });
}

module.exports = deploy;
