FORMAT: 1A
HOST: http://paz-scheduler.paz

# paz-scheduler
The scheduler deploy a service to the cluster.

There are two endpoints avaliable, one is for DockerHub webhook, another is for manual deployment.

# Group Hook
Deployment trigger endpoint

## Deploy hook [/hooks/deploy]

For manual deployment

### Deploy a service manualy [POST]

+ Response 200 (application/json)

    + Body

            {
                "statusCode": 200
            }

## Dockerhub hook [/hooks/dockerhub]

For Dockerhub webhook

### Service deployment triggered by DockerHub [POST]

+ Response 201 (application/json)

    + Body

            {
                "statusCode": 201
            }

# Group Config

## Latest Config [/config/{name}/version/latest]

Retrieve the latest config of the service that the scheduler has deployed.

### Retrieve the latest config for a service [GET]

+ Response 200 (application/json)

    + Body

            {
                "doc": {
                    "publicFacing": false,
                    "numInstances": 1,
                    "ports": [{
                        "container": 9000,
                        "host": 3000
                    }],
                    "env": {
                        "paz": "awesome"
                    },
                    "user": "core"
                }
            }


## Get Config [/config/{name}/version/{version}]

Retrieve the specific config version of the service that the scheduler has deployed.

### Retrieve a config [GET]

+ Response 200 (application/json)

    + Body

            {
                "doc": {
                    "publicFacing": false,
                    "numInstances": 1,
                    "ports": [{
                        "container": 9000,
                        "host": 3000
                    }],
                    "env": {
                        "paz": "awesome"
                    },
                    "user": "core"
                }
            }

## Config History [/config/{name}/history]

Retrieve config history of the service that the scheduler has deployed.

### Retrieve config history [GET]

+ Response 200 (application/json)

    + Body

            {
                "doc": {
                    "1": {
                        "publicFacing": false,
                        "numInstances": 1,
                        "ports": [
                        ],
                        "env": {
                        },
                        "user": "core"
                    },
                    "2": {
                        "publicFacing": false,
                        "numInstances": 1,
                        "ports": [{
                            "container": 9000,
                            "host": 3000
                        }],
                        "env": {
                            "paz": "awesome"
                        },
                        "user": "core"
                    }
                }
            }

