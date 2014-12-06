# paz-scheduler
=============

Takes apps from your paz service directory and runs them on a CoreOS cluster using fleet.

## Tests

API functional tests can be found in `test/`.

To run on OS X (w/ Boot2Docker):
```
$ DOCKER_IP=192.168.59.103 npm test
```

Tun run on Linux etc.:
```
$ npm test
```
