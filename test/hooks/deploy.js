/* eslint-disable no-unused-expressions */

var supertest = require('supertest');
var Lab = require('lab');

var fixtures = require('../fixtures/services.json');

var lab = exports.lab = Lab.script();

var host = process.env.DOCKER_IP || 'localhost';
var schedulerPort = process.env.SCHEDULER_PORT || 9002;

var svcDirPort = process.env.SVCDIR_PORT || 9001;

var schedulerPath = ['http://', host, ':', schedulerPort].join('');
var svcDirPath    = ['http://', host, ':', svcDirPort].join('');

lab.experiment('hooks/deploy', function() {
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

  lab.test('POST /hooks/deploy should return a 200 status code depending on body of request', function(done) {
    scheduler
      .post('/hooks/deploy')
      .set('Content-Type', 'application/json')
      .send(fixtures['deploy-my-service'])
      .expect(200)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  lab.test('POST /hooks/deploy should return a 400 status code if there is no service name', function(done) {
    scheduler
      .post('/hooks/deploy')
      .set('Content-Type', 'application/json')
      .send(fixtures['deploy-no-service-name'])
      .expect(400)
      .end(function(err) {
        if (err) {
          return done(err);
        }

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
