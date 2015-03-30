'use strict';

var parseArgs = require('minimist');
var bunyan = require('bunyan');
var jsonOverride = require('json-override');
var levelup = require('levelup');
var path = require('path');
var pkgjson = require('./package.json');
var restify = require('restify');
var routes = require('./lib/routes');
var sh = require('execSync');
var _Error = require('error-plus');
var Etcd = require('node-etcd');

var argv = parseArgs(process.argv);

if (argv.help || argv.h) {
  console.log([
    'Usage: ./bin/' + pkgjson.name + ' [--port] [--loglevel]',
    'Starts ' + pkgjson.name + ' with the specified configuration',
    '--port port to run on (default: 9002)',
    '--loglevel log level (default: info)',
    '--dbname database name (default: db)',
    '--svcdir URL for paz service-directory service (default: localhost:9001)',
    '--ssh-host host and port where fleetctl can be access on CoreOS host',
    '--ssh-user username to use for SSH',
    '--ssh-key SSH key to use for connecting to fleetctl',
    '--ssh-port SSH port to use for connecting to fleetctl',
    '--gen-key If true, generate a keypair and post the public key to etcd; the private key will be used as if passed to --ssh-key (default: false)',
    '--etcd-pubkey-key The name of the key against which to store the generated public key (default: /paz/config/scheduler/_pubkey)',
    '--etcd-endpoint The name of the key against which to store the generated public key (default: 172.17.8.101:4001)',
    '--nodeploy disable deployments, for testing (default: false)'
  ].join('\n'));
  process.exit();
}

function asBoolean (s) {
  if (typeof s === 'boolean') {
    return s;
  }
  return s === 'true';
}

var APP_NAME = pkgjson.name.toUpperCase().replace('-', '_');
var opts = {
  'port':
    +(argv.port || process.env[APP_NAME + '_PORT'] || '9002'),
  'loglevel':
    argv.loglevel || process.env[APP_NAME + '_LOGLEVEL'] || 'info',
  'dbname': argv.dbname || process.env[APP_NAME + '_DBNAME'] || 'db',
  'svcdir':
    argv.svcdir || process.env[APP_NAME + '_SVCDIR_URL'] ||
    'localhost:9001',
  'ssh-host':
    argv['ssh-host'] || process.env[APP_NAME + '_SSH_HOST'] || 'localhost',
  'ssh-key':
    argv['ssh-key'] || process.env[APP_NAME + '_SSH_KEY'] || null,
  'ssh-port':
    argv['ssh-port'] || process.env[APP_NAME + '_SSH_PORT'] || null,
  'gen-key':
    argv['gen-key'] || asBoolean(process.env[APP_NAME + '_GEN_KEY']) || false,
  'etcd-pubkey-key':
    argv['etcd-pubkey-key'] || process.env[APP_NAME + '_ETCD_PUBKEY_KEY'] || '/paz/config/scheduler/_pubkey',
  'etcd-endpoint':
    argv['etcd-endpoint'] || process.env[APP_NAME + '_ETCD_ENDPOINT'] || '127.0.0.1:4001',
  'nodeploy':
    argv.nodeploy || asBoolean(process.env[APP_NAME + '_NODEPLOY']) || false
};

function Server(_opts) {
  if (_opts) {
    jsonOverride(opts, _opts);
  }
  if (!(this instanceof Server)) {
    return new Server(opts);
  }

  var dbPath = opts.dbname;
  opts.leveldb = {
    path: dbPath,
    db: levelup(dbPath, {
      valueEncoding: 'json'
    })
  };
  this.db = opts.leveldb.db;

  var logger = bunyan.createLogger({
    name: pkgjson.name + '_log',
    level: opts.loglevel,
    stream: process.stdout,
    serializers: restify.bunyan.serializers,
    src: process.env.NODE_ENV !== 'production'
  });
  this.logger = logger;
  this.logger.debug({options: opts});

  this.restifyServer = restify.createServer({
    name: pkgjson.name,
    version: pkgjson.version,
    log: logger,
    src: process.env.NODE_ENV !== 'production'
  });

  this.restifyClient = restify.createJsonClient({
    url: 'http://' + opts.svcdir
  });

  opts.client = this.restifyClient;

  this.restifyServer.log.level(opts.loglevel);

  this.restifyServer.use(require('./middleware/uuid'));
  this.restifyServer.use(require('./middleware/api-version'));
  this.restifyServer.use(require('./middleware/logger'));

  this.restifyServer.use(restify.queryParser());

  if (opts['gen-key']) {
    this.logger.debug('Generating keypair');

    // NB the execs is run synchronously but NBD since this is startup
    var keyname = 'paz-scheduler';
    var code = sh.run('ssh-keygen -q -f ' + keyname + ' -N "" -C ' + keyname);
    if (code) {
      throw new _Error('Error code returned from ssh-keygen: ' + code);
    }
    opts['ssh-key'] = path.resolve(keyname);
    var pubkeyb64 = new Buffer(sh.exec('cat ' + keyname + '.pub').stdout).toString('base64');

    // NB the etcd calls are async (don't care when that finishes)
    var terms = opts['etcd-endpoint'].split(':');
    var etcd = new Etcd(terms[0], terms[1]);
    var dir = path.dirname(opts['etcd-pubkey-key']);
    etcd.mkdir(dir, function() {
      // ignoring mkdir error because key may already exist. any 'real' errors will be caught on set anyway
      etcd.set(opts['etcd-pubkey-key'], pubkeyb64, function(setErr) {
        if (setErr) {
          this.logger.error(setErr);
          throw setErr;
        }
      }.bind(this));
    }.bind(this));
  }
}

Server.prototype.run = function() {
  routes(this.restifyServer, opts);
  this.restifyServer.listen(opts.port, function() {
    this.restifyServer.log.info(pkgjson.name + ' now running on port ' + opts.port);
    this.restifyServer.log.debug(opts);
  }.bind(this));
};

Server.prototype.close = function(cb) {
  this.restifyServer.close(function(err) {
    if (err) {
      console.log(err);
    }
    this.db.close(function(err2) {
      if (err2) {
        console.log(err2);
      }
      return cb();
    });
  }.bind(this));
};

if (require.main === module) {
  console.log('Starting server');
  var server = new Server();
  server.run();
}

module.exports = Server;
