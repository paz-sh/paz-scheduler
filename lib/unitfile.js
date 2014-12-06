var debug = require('debug')('unitfile');
var ini = require('ini');

function getUnitBaseName(serviceName, version) {
  return [serviceName, version].join('-');
}

// unitNameBase is e.g. api-1.0.1
function getServiceUnitFiles(service, unitNameBase, instance) {
  // unitName will be e.g. api-1.0.1-1
  var unitName = unitNameBase + '-' + instance;
  var iniObj = {
    Unit: {
      Requires: 'docker.service',
      After: 'docker.service'
    },
    Service: {},
    'X-Fleet': {}
  };
  iniObj.Unit.Description =
    service.description && service.description.trim() ? service.description : unitNameBase;
  iniObj.Unit.Description += ' (' + instance + ')';

  if (service.config.user) {
    iniObj.Service.User = service.config.user;
  }
  iniObj.Service.ExecStartPre = '/bin/bash -c "docker pull ' + service.dockerRepository + ' && docker inspect ' + unitName + ' >/dev/null 2>&1 && docker rm -f ' + unitName + ' || true"';
  iniObj.Service.ExecStart = '/usr/bin/docker run --name=' + unitName;
  if (!service.config.ports || !service.config.ports.length) {
    iniObj.Service.ExecStart += ' -P';
  } else {
    service.config.ports.forEach(function(ports) {
      iniObj.Service.ExecStart += ' -p ' + ports.host + ':' + ports.container;
    });
  }
  if (service.config.env) {
    Object.keys(service.config.env).forEach(function(key) {
      iniObj.Service.ExecStart += ' -e "' + key + '=' + service.config.env[key] + '"';
    });
  }
  iniObj.Service.ExecStart += ' ' + service.dockerRepository;
  iniObj.Service.ExecStop = '/usr/bin/docker stop -t 3 ' + unitName;
  iniObj.Service.TimeoutStartSec = '30m';

  iniObj['X-Fleet']['X-Conflicts'] = unitNameBase + '*.service';
  if (service.config.mustShareWith) {
    iniObj['X-Fleet']['X-ConditionMachineOf'] = service.config.mustShareWith;
  }

  return ini.unsafe(ini.stringify(iniObj));
}

function getAnnounceUnitFiles(service, serviceUnitNameBase, instance) {
  var serviceUnitName = serviceUnitNameBase + '-' + instance;

  var iniObj = {
    Unit: {
      BindsTo: serviceUnitName + '.service'
    },
    Service: {},
    'X-Fleet': {}
  };
  iniObj.Unit.Description =
    service.description && service.description.trim() ? service.description : serviceUnitNameBase;
  iniObj.Unit.Description += ' announce (' + instance + ')';

  var version = serviceUnitNameBase.split(':')[0].split(service.name + '-')[1];
  var etcdKey = '/paz/services/' + service.name + '/' + version + '/' + instance;
  iniObj.Service.EnvironmentFile = '/etc/environment';
  iniObj.Service.ExecStartPre = '/bin/sh -c "until docker inspect -f \'{{range $p, $conf := .NetworkSettings.Ports}} {{$p}} -> {{(index $conf 0).HostPort}} {{end}}\' ' + serviceUnitName + ' >/dev/null 2>&1; do sleep 2; done; port=$(docker inspect -f \'{{range $p, $conf := .NetworkSettings.Ports}} {{$p}} -> {{(index $conf 0).HostPort}} {{end}}\' ' + serviceUnitName + ' | head -1 | awk -F-\\>\\  \'{ print $2 }\'); echo Waiting for $port/tcp...; until netstat -lnt | grep :$port >/dev/null; do sleep 1; done"';
  iniObj.Service.ExecStart = '/bin/sh -c "port=$(docker inspect -f \'{{range $p, $conf := .NetworkSettings.Ports}} {{$p}} -> {{(index $conf 0).HostPort}} {{end}}\' ' + serviceUnitName + ' | head -1 | awk -F-\\>\\  \'{ print $2 }\'); echo Connected to $COREOS_PRIVATE_IPV4:$port/tcp, publishing to etcd...; while netstat -lnt | grep :$port >/dev/null; do etcdctl set ' + etcdKey + ' $COREOS_PRIVATE_IPV4:$port --ttl 60 >/dev/null; sleep 45; done"';
  iniObj.Service.ExecStop = '/usr/bin/etcdctl rm --recursive ' + etcdKey;
  iniObj.Service.TimeoutStartSec = '30m';
  iniObj['X-Fleet']['X-ConditionMachineOf'] = serviceUnitName + '.service';

  return ini.unsafe(ini.stringify(iniObj));
}

var render = function(service, version) {
  if (!service || !service.name || !service.dockerRepository ||
      !service.config || !service.config.numInstances || (typeof version !== 'number')) {
    debug('Invalid args');

    return null;
  }

  var serviceNameBase = getUnitBaseName(service.name, version);
  var announceNameBase = getUnitBaseName(service.name + '-announce', version);

  var inis = [];
  for (var i = 0; i < service.config.numInstances; ++i) {
    // service unit file
    var serviceUnitObj = {
      filename: serviceNameBase + '-' + (i + 1) + '.service',
      unitfile: getServiceUnitFiles(service, serviceNameBase, i + 1)
    };

    inis.push(serviceUnitObj);

    // announce unit file
    var announceUnitObj = {
      filename: announceNameBase + '-' + (i + 1) + '.service',
      unitfile: getAnnounceUnitFiles(service, serviceNameBase, i + 1)
    };

    inis.push(announceUnitObj);

    // TODO log unit file not yet implemented, but later that will go here
  }

  return inis;
};

module.exports = render;
