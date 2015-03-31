/* eslint-disable no-unused-expressions */

var supertest = require('supertest');
var Lab = require('lab');

var fixtures = require('../fixtures/docker.json');
var svcFixtures = require('../fixtures/services.json');

var lab = exports.lab = Lab.script();

var host = process.env.DOCKER_IP || 'localhost';
var schedulerPort = process.env.SCHEDULER_PORT || 9002;

var svcDirPort = process.env.SVCDIR_PORT || 9001;

var schedulerPath = ['http://', host, ':', schedulerPort].join('');
var svcDirPath = ['http://', host, ':', svcDirPort].join('');

lab.experiment('hooks/dockerhub', function() {
  var scheduler = supertest(schedulerPath);
  var svcDir = supertest(svcDirPath);

  lab.before(function(done) {
    svcDir
      .post('/services')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(svcFixtures['my-service'])
      .expect(201)
      .end(function(err) {
        if (err) {
          return done('Could not create service: ' + err);
        }

        // Give it a few seconds to... I don't know what exactly.
        setTimeout(done, 3000);
      });
  });

  lab.test('POST /hooks/dockerhub should return a 200 status code when a correct request body is sent', function(done) {
    scheduler
      .post('/hooks/dockerhub')
      .set('Content-Type', 'application/json')
      .send(fixtures.hook)
      .expect(200)
      .end(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  lab.test('POST /hooks/dockerhub should return a 400 status code when an incorrect request body is sent', function(done) {
    scheduler
      .post('/hooks/dockerhub')
      .set('Content-Type', 'application/json')
      .send(fixtures.noRepoUrlHook)
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
