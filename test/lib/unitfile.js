/* eslint-disable no-unused-expressions */

var unitfile = require('../../lib/unitfile');
var Lab = require('lab');

var fixtures = require('../fixtures/units.json');

var lab = exports.lab = Lab.script();
var expect = Lab.expect;

lab.experiment('unitfile', function() {
  lab.test('Returns null when required parameter \'config.numInstances\' is missing', function(done) {
    var inis = unitfile(fixtures.noInstances, 1);

    expect(inis).to.be.null;

    done();
  });

  lab.test('Returns null when required object \'config\' is missing', function(done) {
    var inis = unitfile(fixtures.noConfig, 1);

    expect(inis).to.be.null;

    done();
  });

  lab.test('Render service unit files for one instance', function(done) {
    var inis = unitfile(fixtures.oneInstance, 1);

    expect(inis.length).to.be.equal(2);

    expect(inis[0].filename).to.be.ok;
    expect(inis[0].unitfile).to.be.ok;

    inis.forEach(function(ini) {
      expect(ini.filename).to.be.ok;
      expect(ini.unitfile).to.be.ok;
    });

    done();
  });

  lab.test('Render service unit files for three instances', function(done) {
    var inis = unitfile(fixtures.threeInstances, 1);

    expect(inis.length).to.be.equal(6);

    inis.forEach(function(ini) {
      expect(ini.filename).to.be.ok;
      expect(ini.unitfile).to.be.ok;
    });

    done();
  });

  lab.test('Check that the created unit file doesn\'t contain "undefined" anywhere', function(done) {
    var inis = unitfile(fixtures.oneInstance, 1);

    inis.forEach(function(ini) {
      expect(ini.unitfile.match(/undefined/)).to.be.null;
    });

    done();
  });

  lab.test('Check that the created unit file\'s ExecStart line begins with an absolute path', function(done) {
    var inis = unitfile(fixtures.oneInstance, 1);

    inis.forEach(function(ini) {
      var execStartLine = ini.unitfile.match(/ExecStart=([^\n]+)\n/);
      expect(execStartLine[1][0]).to.be.equal('/');
    });

    done();
  });

  lab.test('Check that the created unit file includes `User=core`', function(done) {
    var inis = unitfile(fixtures.oneInstance, 1);

    expect(inis[0].unitfile.match(/User=core/)).to.be.ok;

    done();
  });
});
