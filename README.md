# Caf.js

Co-design permanent, active, stateful, reliable cloud proxies with your web app and gadgets.

See https://www.cafjs.com

## Library for Deploying Apps with Kubernetes


<!-- [![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_deploy/status.svg)](http://ci.cafjs.com/cafjs/caf_deploy) -->

This repository contains a `Caf.js` lib to deploy applications using Kubernetes.


## API

See {@link module:caf_deploy/proxy_deploy}

See the `caf_turtles` application for an example.

## Configuration Example

See {@link module:caf_deploy/plug_deploy}

### framework.json

Default for Kubernetes deployment:
```
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
                "image" : "process.env.REDIS_IMAGE||redis:6",
                "isUntrusted": "process.env.IS_UNTRUSTED||false",
                "cpus" : "process.env.REDIS_CPUS||0.02",
                "memory" : "process.env.REDIS_MEMORY||64.0",
                "cpusLimit" : "process.env.REDIS_CPUS_LIMIT||0.1",
                "memoryLimit" : "process.env.REDIS_MEMORY_LIMIT||128.0"
            },
            "app" : {
                "k8SNamespace" : "process.env.APP_K8S_NAMESPACE||default",
                "templateFile" : "process.env.APP_TEMPLATE_FILE||kubernetes.app.mus",
                "cpus" : "process.env.APP_CPUS||0.02",
                "cpusLimit" : "process.env.APP_CPUS_LIMIT||0.1",
                "args": "process.env.APP_ARGS||[]",
                "memory" : "process.env.APP_MEMORY||96.0",
                "memoryLimit" : "process.env.APP_MEMORY_LIMIT||128.0",
                "storage" : "process.env.APP_STORAGE||16",
                "storageLimit" : "process.env.APP_STORAGE_LIMIT||32",
                "instances": "process.env.APP_INSTANCES||1",
                "isDeployer": "process.env.APP_IS_DEPLOYER||false",
                "isAccounts": "process.env.APP_IS_ACCOUNTS||false",
                "isPeople": "process.env.APP_IS_PEOPLE||false",
                "isUntrusted": "process.env.IS_UNTRUSTED||false",
                "appSuffix" : "$._.env.appSuffix",
                "services" :["redis"]
            }
        }
    }
```

### ca.json

```
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
```
