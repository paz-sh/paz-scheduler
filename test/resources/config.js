/* eslint-disable no-unused-expressions */

var supertest = require('supertest');
var Lab = require('lab');

var fixtures = require('../fixtures/services.json');

var lab = exports.lab = Lab.script();
var expect = Lab.expect;

var host = process.env.DOCKER_IP || 'localhost';
var schedulerPort = process.env.SCHEDULER_PORT || 9002;

var svcDirPort = process.env.SVCDIR_PORT || 9001;

var schedulerPath = ['http://', host, ':', schedulerPort].join('');
var svcDirPath = ['http://', host, ':', svcDirPort].join('');

lab.experiment('config', function() {
  var scheduler = supertest(schedulerPath);
  var svcDir = supertest(svcDirPath);

  lab.before(function(done) {
    svcDir
      .post('/services')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(fixtures['my-service'])
      .expect(201)
      .end(function(err) {
        if (err) {
          return done('Could not create service: ' + err);
        }

        // Give it a few seconds to... I don't know what exactly.
        setTimeout(done, 3000);
      });
  });

  lab.before(function(done) {
    scheduler
      .post('/hooks/deploy')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(fixtures['deploy-my-service'])
      .expect(200)
      .end(function(err) {
        if (err) {
          return done('Could not deploy service: ' + err);
        }

        done();
      });

  });

  lab.test('GET /config/:name/version/latest returns 200 with a config', function(done) {
    scheduler
      .get('/config/my-service/version/latest')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var config = res.body.doc;

        expect(config).to.have.property('publicFacing');
        expect(config).to.have.property('ports');
        expect(config).to.have.property('env');
        expect(config).to.have.property('numInstances');

        done();
      });
  });

  lab.test('GET /config/:name/version/:version should return 200 with a config doc', function(done) {
    scheduler
      .get('/config/my-service/version/1')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var config = res.body.doc;

        expect(config).to.have.property('publicFacing');
        expect(config).to.have.property('ports');
        expect(config).to.have.property('env');
        expect(config).to.have.property('numInstances');

        done();
      });
  });

  lab.test('GET /config/:name/version/:version should return 404 when version doesn\'t exist', function(done) {
    scheduler
      .get('/config/my-service/version/1337')
      .set('Accept', 'application/json')
      .expect(404)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  lab.test('GET /config/:name/history should return 200 with a list of config docs', function(done) {
    scheduler
      .get('/config/my-service/history')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var config = res.body.doc;

        expect(config).to.have.property('1');  // version 1
        expect(config['1']).to.have.property('publicFacing');
        expect(config['1']).to.have.property('ports');
        expect(config['1']).to.have.property('env');
        expect(config['1']).to.have.property('numInstances');

        done();
      });
  });

  lab.test('GET /journal should return 200 with a journal list', function(done) {
    scheduler
      .get('/journal')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        var doc = res.body.doc[0];

        expect(doc).to.have.property('event');
        expect(doc.event).to.equal('deploy');

        expect(doc).to.have.property('serviceName');
        expect(doc).to.have.property('timestamp');
        expect(doc).to.have.property('version');
        expect(doc.config).to.have.property('publicFacing');
        expect(doc.config).to.have.property('ports');
        expect(doc.config).to.have.property('env');
        expect(doc.config).to.have.property('numInstances');

        done();
      });
  });

  lab.after(function(done) {
    svcDir
      .delete('/services/my-service')
      .expect(204)
      .end(function(err) {
        if (err) {
          return done('Could not delete service: ' + err);
        }

        done();
      });
  });
});
