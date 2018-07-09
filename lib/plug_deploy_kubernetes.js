/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/**
 * Deploys applications on Kubernetes on behalf of CAs.
 *
 *  The name of this component in framework.json should be 'deploy'
 *
 * Properties:
 *
 *       {refreshInterval: number,
 *        useK8SConfig: string, redis: caf.redis, app: caf.app}
 *
 * where:
 *
 * * `refreshInterval`: time between Marathon status polling in msec.
 * * `useK8SConfig`: whether to use the k8s config file from the kubelet client.
 * *  `redis`: configuration properties for the redis service.
 * *  `app`: configuration properties for deploying the app.
 *
 * The type `caf.redis` is:
 *
 *        {templateFile: string, k8SNamespace: string,
 *          image: string, cpus: number, memory: number, memoryLimit: number}
 *
 * where:
 *
 * * `templateFile`: name of the Redis template.
 * * `k8SNamespace`: a namespace for the instance.
 * * `image`: Docker image for the redis service.
 * * `cpus`, `memory`, `memoryLimit`: Fraction of cpu for the instance,
 *  memory in megabytes requested and its hard limit.
 *
 * The type `caf.app` is:
 *
 *        {templateFile: string, k8SNamespace: string, args: Array.<caf.json>,
 *         instances: number, memoryLimit: number, appSuffix: string,
 *         isDeployer: boolean, isAccounts: boolean,
 *         services: Array.<string>, cpus: number, memory: number}
 *
 * where:
 *
 * * `templateFile`: name of the app template.
 * * `k8SNamespace`: a namespace for the instance.
 * * `appSuffix`: a common url suffix for apps, e.g., `cafjs.com`.
 * * `args`: default app arguments.
 * * `instances`: number of instances.
 * * `isDeployer`: whether this is a privileged app that deploys others.
 * * `isAccounts`: whether this is a privileged app that authenticates others.
 * * `services`: dependent services like `redis`.
 * * `cpus`, `memory`, `memoryLimit`: Fraction of cpu for the instance,
 *  memory in megabytes requested and its hard limit.
 *
 * @module caf_deploy/plug_deploy_kubernetes
 * @augments external:caf_components/gen_plug
 */
var assert = require('assert');
var fs = require('fs');
var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var myUtils = caf_comp.myUtils;
var genPlug = caf_comp.gen_plug;
var genCron = caf_comp.gen_cron;

var mustache = require('mustache');
var path = require('path');
var deploy_util = require('./plug_deploy_util_k8s');

var processCommonSpec = function (spec, errMsg) {
    spec = myUtils.deepClone(spec);
    assert.equal(typeof spec.templateFile, 'string',
                 errMsg + "'templateFile' is not a string");

    spec.templateFile = path.resolve(__dirname, spec.templateFile);
    spec.template = fs.readFileSync(spec.templateFile, {encoding: 'utf8'});
    mustache.parse(spec.template);
    assert.equal(typeof spec.k8SNamespace, 'string',
                 errMsg + "'k8SNamespace' is not a string");
    assert.equal(typeof spec.cpus, 'number',
                 errMsg + "'cpus' is not a number");
    assert.equal(typeof spec.memory, 'number',
                 errMsg + "'memory' is not a number");
    spec.memory = '' + spec.memory + 'M'; // megabytes

    assert.equal(typeof spec.memoryLimit, 'number',
                 errMsg + "'memoryLimit' is not a number");
    spec.memoryLimit = '' + spec.memoryLimit + 'M'; // megabytes
    return spec;
};

var processAppSpec = function(appSpec) {
    appSpec = processCommonSpec(appSpec, "'spec.env.app.");

    assert.equal(typeof appSpec.instances, 'number',
                 "'spec.env.app.instances' is not a number");
    assert.ok(Array.isArray(appSpec.args),
              "'spec.env.app.args' is not an array");
    appSpec.args = JSON.stringify(appSpec.args);
    assert.equal(typeof appSpec.appSuffix, 'string',
                 "'spec.env.app.appSuffix' is not a string");
    assert.equal(typeof appSpec.isDeployer, 'boolean',
                 "'spec.env.app.isDeployer' is not a boolean");
    assert.equal(typeof appSpec.isAccounts, 'boolean',
                 "'spec.env.app.isAccounts' is not a boolean");
    return appSpec;
};

var processRedisSpec = function(redisSpec) {
    redisSpec = processCommonSpec(redisSpec, "'spec.env.redis.");
    assert.equal(typeof redisSpec.image, 'string',
                 "'spec.env.redis.image' is not a string");
    return redisSpec;
};


exports.newInstance = async function($, spec) {
    var appsStatus = {};

    assert.equal(typeof spec.env.useK8SConfig, 'boolean',
                 "'spec.env.useK8SConfig' is not a boolean");

    assert.equal(typeof spec.env.refreshInterval, 'number',
                 "'spec.env.refreshInterval' is not a number");
    var cronSpec = {
        name: spec.name + '_cron__',
        module: 'gen_cron', // module ignored
        env: {interval: spec.env.refreshInterval}
    };
    var updateCron = genCron.constructor(null, cronSpec);

    var that = genPlug.constructor($, spec);

    var appSpec = spec.env.app;
    assert.ok(appSpec && (typeof appSpec === 'object'),
              "'spec.env.app' is not an object");
    appSpec = processAppSpec(appSpec);

    var redisSpec = spec.env[appSpec.services[0]];
    assert.ok(redisSpec && (typeof redisSpec === 'object'),
              "'spec.env.redis' is not an object");
    redisSpec = processRedisSpec(redisSpec);
    var deployUtil = await deploy_util.newUtil(spec.env, appSpec, redisSpec);

    var __ca_createApp__ = async function(appProps) {
        try {
            await __ca_statAll__();
            if (appsStatus[appProps.id]) {
                // already deployed, ignore to make call idempotent.
                return [null, appProps.id];
            } else {
                await deployUtil.createRedis(appProps);
                return await deployUtil.createApp(appProps);
            }
        } catch (err) {
            return [err, null];
        }
    };
    that.__ca_createApp__ = myUtils.wrapAsyncFunction(__ca_createApp__);


    that.__ca_getAllRedisPorts__ = function() {
        throw new Error('Unsupported call getAllRedisPorts on Kubernetes');
    };

    var __ca_updateApp__ = async function(appProps) {
        try {
            await __ca_statAll__();
            return await deployUtil.updateApp(appProps);
        } catch (err) {
            return [err, null];
        }
    };
    that.__ca_updateApp__ = myUtils.wrapAsyncFunction(__ca_updateApp__);


    that.__ca_statApp__ = function(id) {
        return appsStatus[id];
    };

    var __ca_restartApp__ = async function(appProps) {
        try {
            await __ca_statAll__();
            return await deployUtil.restartApp(appProps);
        } catch (err) {
            return [err, null];
        }
    };
    that.__ca_restartApp__ = myUtils.wrapAsyncFunction(__ca_restartApp__);

    var __ca_deleteApp__ = async function(appProps) {
        try {
            await __ca_statAll__();
            var app = appsStatus[appProps.id];
            if (app) {
                await deployUtil.deleteApp(appProps);
                return await deployUtil.deleteRedis(appProps);
            } else {
                // idempotent
                return [null, null];
            }
        } catch (err) {
            return [err, null];
        }
    };
    that.__ca_deleteApp__ = myUtils.wrapAsyncFunction(__ca_deleteApp__);

    var __ca_statAll__ = async function() {
        // does not catch exceptions...
        var res = await deployUtil.statAll();
        var apps = res[1];
        if (Array.isArray(apps)) {
            appsStatus = {};
            apps.forEach(function(x) {
                if (typeof x.id === 'string') {
                    appsStatus[x.id] = x;
                } else {
                     $._ && $._.$.log && $._.$.log.debug('No app id: ' +
                                                         JSON.stringify(x));
                }
            });
            return [null, appsStatus];
        } else {
             $._ && $._.$.log && $._.$.log.debug('Got invalid apps  update: ' +
                                                 JSON.stringify(apps));
            throw new Error('Got invalid apps  update:' +
                            JSON.stringify(apps));
        }
    };

    that.__ca_statAll__ = function(cb0) {
        cb0 = cb0 || function(err) {
            if (err) {
                $._ && $._.$.log &&
                    $._.$.log.debug('Got error in __ca_statAll__: ' +
                                    myUtils.errToPrettyStr(err));
            }
        };
        myUtils.wrapAsyncFunction(async function() {
            try {
                return await __ca_statAll__();
            } catch (err) {
                return [err, null];
            }
        })(cb0);
    };


    var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
    that.__ca_shutdown__ = function(data, cb) {
        updateCron && updateCron.__ca_stop__();
        super__ca_shutdown__(data, cb);
    };

    updateCron.__ca_start__(that.__ca_statAll__);

    return [null, that];
};
