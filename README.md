# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com

## CAF Extra Deploy


<!-- [![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_deploy/status.svg)](http://ci.cafjs.com/cafjs/caf_deploy) -->

This repository contains a CAF  lib to deploy applications in Mesos/Marathon.


## API

    lib/proxy_deploy.js

See the `caf_turtles` application for an example.

## Configuration Example

### framework.json

    {
        "module": "caf_deploy#plug",
        "name": "deploy",
        "description": "Shared plug to deploy apps in Mesos/Marathon\n Properties: \n",
        "env": {
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
                "image" : "process.env.REDIS_IMAGE||redis:2.8",
                "cpus" : "process.env.REDIS_CPUS||0.1",
                "memory" : "process.env.REDIS_MEMORY||64.0"
            },
            "app" : {
                "templateFile" : "process.env.APP_TEMPLATE_FILE||marathon.app.mus",
                "args": "process.env.APP_ARGS||[]",
                "cpus" : "process.env.APP_CPUS||0.1",
                "memory" : "process.env.APP_MEMORY||64.0",
                "instances": "process.env.APP_INSTANCES||1",
                "services" :["redis"]
            }
        }
    }


The properties define the Marathon/Mesos target URL, username, and password.


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
