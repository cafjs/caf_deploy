# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com

## CAF Extra Deploy


<!-- [![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_deploy/status.svg)](http://ci.cafjs.com/cafjs/caf_deploy) -->

This repository contains a CAF  lib to deploy applications in Mesos/Marathon or Kubernetes.


## API

See {@link module:caf_deploy/proxy_deploy}

See the `caf_turtles` application for an example.

## Configuration Example

See {@link module:caf_deploy/plug_deploy}

### framework.json

Default for marathon deployment:

    {
        "module": "caf_deploy#plug",
        "name": "deploy",
        "description": "Shared plug to deploy apps in Mesos/Marathon\n Properties: \n",
        "env": {
            "targetPaaS": "process.env.TARGET_PAAS||marathon",
            "listAllRedisPorts" : "process.env.LIST_ALL_REDIS_PORTS||false",
            "refreshInterval" : "process.env.REFRESH_INTERVAL||1000",
            "protocol" : "process.env.MARATHON_PROTOCOL||http",
            "hostname" : "process.env.HOST||localhost",
            "port" : ""process.env.MARATHON_PORT||8080",
            "username" : "process.env.MARATHON_USERNAME||root",
            "password" : "process.env.MARATHON_KEY_PASSWORD||pleasechange",
            "redis" : {
                "templateFile" : "process.env.REDIS_TEMPLATE_FILE||marathon.redis.mus",
                "prefixID": "process.env.REDIS_PREFIX_ID||redis",
                "rangePortStart" : "process.env.REDIS_RANGE_PORT_START||6380",
                "rangePortEnd" : "process.env.REDIS_RANGE_PORT_END||6480",
                "image" : "process.env.REDIS_IMAGE||redis:3",
                "cpus" : "process.env.REDIS_CPUS||0.02",
                "memory" : "process.env.REDIS_MEMORY||64.0",
                "memoryLimit" : "process.env.REDIS_MEMORY_LIMIT||128.0",
            },
            "app" : {
                "templateFile" : "process.env.APP_TEMPLATE_FILE||marathon.app.mus",
                "args": "process.env.APP_ARGS||[]",
                "cpus" : "process.env.APP_CPUS||0.02",
                "memory" : "process.env.APP_MEMORY||96.0",
                "memoryLimit" : "process.env.APP_MEMORY_LIMIT||128.0",
                "instances": "process.env.APP_INSTANCES||1",
                "services" :["redis"]
            }
        }
    }

Default for Kubernetes deployment:

    {
        "module": "caf_deploy#plug",
        "name": "deploy",
        "description": "Shared plug to deploy apps in Kubernetes\n Properties: \n",
        "env": {
            "targetPaaS": "process.env.TARGET_PAAS||kubernetes",
            "refreshInterval" : "process.env.REFRESH_INTERVAL||1000",
            "useK8SConfig" : "process.env.USE_K8S_CONFIG||false",
            "redis" : {
                "k8SNamespace" : "process.env.REDIS_K8S_NAMESPACE||default",
                "templateFile" : "process.env.REDIS_TEMPLATE_FILE||kubernetes.redis.mus",
                "image" : "process.env.REDIS_IMAGE||redis:3",
                "cpus" : "process.env.REDIS_CPUS||0.02",
                "memory" : "process.env.REDIS_MEMORY||64.0",
                "memoryLimit" : "process.env.REDIS_MEMORY_LIMIT||128.0"
            },
            "app" : {
                "k8SNamespace" : "process.env.APP_K8S_NAMESPACE||default",
                "templateFile" : "process.env.APP_TEMPLATE_FILE||kubernetes.app.mus",
                "cpus" : "process.env.APP_CPUS||0.02",
                "args": "process.env.APP_ARGS||[]",
                "memory" : "process.env.APP_MEMORY||96.0",
                "memoryLimit" : "process.env.APP_MEMORY_LIMIT||128.0",
                "instances": "process.env.APP_INSTANCES||1",
                "isDeployer": "process.env.APP_IS_DEPLOYER||false",
                "isAccounts": "process.env.APP_IS_ACCOUNTS||false",
                "appSuffix" : "$._.env.appSuffix",
                "services" :["redis"]
            }
        }
    }


### ca.json

        {
            "module": "caf_deploy#plug_ca",
            "name": "deploy",
            "description": "Manages deployments for this CA.",
            "env" : {
                "maxRetries" : "$._.env.maxRetries",
                "retryDelay" : "$._.env.retryDelay"
            },
            "components" : [
                {
                    "module": "caf_deploy#proxy",
                    "name": "proxy",
                    "description": "Provides deployment API.",
                    "env" : {

                    }
                }
            ]
        }
