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

"use strict";

/**
 * Deploys applications on Mesos/Marathon on behalf of CAs.
 *
 *  The name of this component in framework.json should be 'deploy'
 *
 *
 * @name plug_deploy
 * @namespace
 * @augments caf_components/gen_plug
 */
var assert = require('assert');
var fs = require('fs');
var caf_core =  require('caf_core');
var caf_comp = caf_core.caf_components;
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var genPlug = caf_comp.gen_plug;
var genCron = caf_comp.gen_cron;

var mustache = require('mustache');
var path = require('path');
var deploy_util = require('./plug_deploy_util');
var urlParse = require('url');

var processCommonSpec = function (spec, errMsg) {
    spec = myUtils.deepClone(spec);
    assert.equal(typeof spec.templateFile, 'string',
                 errMsg + "templateFile' is not a string");

    spec.templateFile = path.resolve(__dirname, spec.templateFile);
    spec.template = fs.readFileSync(spec.templateFile, {encoding: 'utf8'});
    mustache.parse(spec.template);
    assert.equal(typeof spec.cpus, 'number',
                 errMsg + "cpus' is not a number");
    assert.equal(typeof spec.memory, 'number',
                 errMsg + "memory' is not a number");

    return spec;
};

var processAppSpec = function(appSpec) {
    appSpec = processCommonSpec(appSpec, "'spec.env.app.");

    assert.equal(typeof appSpec.instances, 'number',
                 "'spec.env.app.instances' is not a number");
    assert.ok(Array.isArray(appSpec.args),
              "'spec.env.app.args' is not an array");
    appSpec.args = JSON.stringify(appSpec.args);
    return appSpec;
};

var processRedisSpec = function(redisSpec) {
    redisSpec = processCommonSpec(redisSpec, "'spec.env.redis.");
    assert.equal(typeof redisSpec.prefixID, 'string',
                 "'spec.env.redis.prefixID' is not a string");
    assert.equal(typeof redisSpec.rangePortStart, 'number',
                 "'spec.env.redis.rangePortStart' is not a number");
    assert.equal(typeof redisSpec.rangePortEnd, 'number',
                 "'spec.env.redis.rangePortEnd' is not a number");
    assert.equal(typeof redisSpec.hostname, 'string',
                 "'spec.env.redis.hostname' is not a string");
    assert.equal(typeof redisSpec.image, 'string',
                 "'spec.env.redis.image' is not a string");

    return redisSpec;
};


var toURL = function(marathon) {
    if (marathon.target[marathon.target.length - 1] === '/') {
        marathon.target = marathon.target.slice(0, -1);
    }
    var urlP = urlParse.parse(marathon.target);
    if (marathon.username && marathon.password) {
        urlP.auth = marathon.username + ':' + marathon.password;
    }
    return urlParse.format(urlP);
};

/**
 * Factory method to create a deployer plugin.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var appsStatus = {};

        assert.equal(typeof spec.env.listAllRedisPorts, 'boolean',
             "'spec.env.listAllRedisPorts' is not a boolean");

        assert.equal(typeof spec.env.refreshInterval, 'number',
                     "'spec.env.refreshInterval' is not a number");
        var cronSpec = {
            name: spec.name + '_cron__',
            module: 'gen_cron', // module ignored
            env: {interval: spec.env.refreshInterval}
        };
        var updateCron = genCron.constructor(null, cronSpec);

        var that = genPlug.constructor($, spec);

        var marathon = {};
        assert.equal(typeof spec.env.protocol, 'string',
                     "'spec.env.protocol' is not a string");
        assert.equal(typeof spec.env.hostname, 'string',
                     "'spec.env.hostname' is not a string");
        assert.equal(typeof spec.env.port, 'number',
                     "'spec.env.port' is not a number");
        marathon.target = spec.env.protocol + '://' + spec.env.hostname + ':' +
            spec.env.port;
        spec.env.username &&
            assert.equal(typeof spec.env.username, 'string',
                         "'spec.env.username' is not a string");
        marathon.username = spec.env.username;
        spec.env.password &&
            assert.equal(typeof spec.env.password, 'string',
                         "'spec.env.password' is not a string");
        marathon.password = spec.env.password;

        var deployUtil = deploy_util.newUtil(toURL(marathon));

        var appSpec = spec.env.app;
        assert.ok(appSpec && (typeof appSpec === 'object'),
                   "'spec.env.app' is not an object");
        appSpec = processAppSpec(appSpec);
        var redisSpec  = spec.env[appSpec.services[0]];
        assert.ok(redisSpec && (typeof redisSpec === 'object'),
                   "'spec.env.redis' is not an object");
        redisSpec = processRedisSpec(redisSpec);

        // appName : port (number)
        var allRedisPorts = {};

        that.__ca_createApp__ = function(appProps, cb0) {
            that.__ca_statAll__(function (err) {
                if (err) {
                    cb0(err);
                } else {
                    if (appsStatus[appProps.id]) {
                        // already deployed, ignore to make call idempotent.
                        cb0(null, appProps.id);
                    } else {
                        async.waterfall([
                            function(cb1) {
                                deployUtil.createRedis(redisSpec, appProps,
                                                       cb1);
                            },
                            function(redisPort, cb1) {
                                appProps.redisID = redisSpec.prefixID +
                                    redisPort;
                                appProps.redisPort = redisPort;
                                deployUtil.createApp(appSpec, appProps, cb1);
                            }
                        ], cb0);
                    }
                }
            });
        };

        that.__ca_getAllRedisPorts__ = function() {
            return (spec.env.listAllRedisPorts ?
                    myUtils.deepClone(allRedisPorts) : {});
        };

        that.__ca_updateApp__ = function(appProps, cb0) {
            deployUtil.updateApp(appSpec, appProps, cb0);
        };

        that.__ca_statApp__ = function(id) {
            return appsStatus[id];
        };

        that.__ca_restartApp__ = function(appProps, cb0) {
            deployUtil.restartApp(appProps, cb0);
        };

        that.__ca_deleteApp__ = function(appProps, cb0) {
            that.__ca_statAll__(function (err) {
                if (err) {
                    cb0(err);
                } else {
                    var app = appsStatus[appProps.id];
                    if (app) {
                        var redisPort = deployUtil.extractRedisPort(app);
                        async.series([
                            function(cb1) {
                                deployUtil.deleteApp(appProps, cb1);
                            },
                            function(cb1) {
                                if (redisPort !== null) {
                                    appProps.redisID = redisSpec.prefixID +
                                        redisPort;
                                    deployUtil.deleteRedis(appProps, cb1);
                                } else {
                                    $._.$.log &&
                                        $._.$.log
                                        .debug('Cannot extract redis port: ' +
                                               JSON.stringify(app));
                                    cb1(null);
                                }
                            }
                        ], cb0);
                    } else {
                        // idempotent
                        cb0(null);
                    }
                }
            });
        };

        that.__ca_statAll__ = function(cb0) {
            deployUtil.statAll(function(err, data) {
                if (err) {
                    $._.$.log &&
                        $._.$.log.debug('Cannot update apps state: ' +
                                        myUtils.errToPrettyStr(err));
                    cb0 && cb0(err);
                } else {
                    var redisPorts = {};
                    var apps = data.apps;
                    if (Array.isArray(apps)) {
                        appsStatus = {};
                        apps.forEach(function(x) {
                            if (typeof x.id === 'string') {
                                var id = x.id.slice(1); // get rid of '/' prefix
                                appsStatus[id] = x;
                                var p = deployUtil.extractRedisPort(x);
                                if ((typeof p === 'number') && !isNaN(p)) {
                                    redisPorts[id] = p;
                                }
                            } else {
                                $._.$.log &&
                                    $._.$.log.debug('No app id: ' +
                                                    JSON.stringify(x));
                            }
                        });
                        allRedisPorts = redisPorts;
                        cb0 && cb0(null, appsStatus);
                    } else {
                        $._.$.log &&
                            $._.$.log.debug('Got invalid apps  update: ' +
                                            JSON.stringify(data));
                        cb0 && cb0(new Error('Got invalid apps  update:' +
                                             JSON.stringify(data), null));
                    }
                }
            });
        };

        updateCron.__ca_start__(that.__ca_statAll__);


        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            updateCron && updateCron.__ca_stop__();
            super__ca_shutdown__(data, cb);
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
