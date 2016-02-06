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
 * Helper functions to load apps and services in Mesos/Marathon.
 *
 *
 * @name plug_deploy_util
 * @namespace
 */

var request = require('request');
var caf_core =  require('caf_core');
var caf_comp = caf_core.caf_components;
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var mustache = require('mustache');


var doRequest = function(target, method, body, filter, cb) {
    request({
        method: method,
        url: target,
        json:true,
        body: body
    }, function (error, response, obj) {
        if (error) {
            cb(error);
        } else {
            if (filter) {
                try {
                    cb(error, filter(obj));
                } catch (ex) {
                    cb(ex);
                }
            } else {
                cb(error, obj);
            }
        }
    });
};


var extractPort = function(res, prefix, start, end) {
    var all = {};
    res.tasks.forEach(function(x) {all[x.appId] = true;});
    for (var i = start; i <= end; i++) {
        var id = '/' + prefix + i;
        if (!all[id]) {
            return i;
        }
    }
    var error = new Error('No service available');
    error.prefix = prefix;
    error.start = start;
    error.end = end;
    throw error;
};

var newUtil = exports.newUtil = function(target) {

    var that = {};

    /**
     * Create a checkpointing service.
     *
     */
    that.createRedis = function(redisSpec, appSpec, cb) {
        redisSpec = myUtils.clone(redisSpec);
        async.waterfall([
            function(cb1) {
                doRequest(target + 'v2/tasks', 'GET', null, function(x) {
                    return extractPort(x, redisSpec.prefixID,
                                       redisSpec.rangePortStart,
                                       redisSpec.rangePortEnd);
                }, cb1);
            },
            function(port, cb1) {
                redisSpec.id = redisSpec.prefixID + port;
                redisSpec.redisPort = port;
                var r = JSON.parse(mustache.render(redisSpec.template,
                                                   redisSpec));
                doRequest(target + 'v2/apps', 'POST', r, function(x) {
                    if (x.id === '/' + redisSpec.id) {
                        return port;
                    } else {
                        var error = new Error('Cannot create service');
                        error.res = x;
                        throw error;
                    }
                }, cb1);
            }
        ], cb);
    };

    var stringifyArgs = function(appSpec) {
        if (Array.isArray(appSpec.args)) {
            appSpec.args = JSON.stringify(appSpec.args);
        }
    };
    
    that.createApp = function(appSpec, appProps, cb) {
        appSpec = myUtils.cloneAndMixin(appSpec, appProps);
        stringifyArgs(appSpec);
        var r = JSON.parse(mustache.render(appSpec.template, appSpec));
        doRequest(target + 'v2/apps', 'POST', r, function(x) {
            if (x.id === '/' + appSpec.id) {
                return appSpec.id;
            } else {
                var error = new Error('Cannot create application.');
                error.res = x;
                throw error;
            }
        }, cb);
    };

    that.updateApp =  function(appSpec, appProps, cb) {
        appSpec = myUtils.cloneAndMixin(appSpec, appProps);
        stringifyArgs(appSpec);
        var r = JSON.parse(mustache.render(appSpec.template, appSpec));
        doRequest(target + 'v2/apps/' + appSpec.id, 'PUT', r, function(x) {
            if ((typeof x.deploymentId === 'string') &&
                (typeof x.version === 'string')) {
                return x;
            } else {
                var error = new Error('Cannot update application.');
                error.res = x;
                throw error;
            }
        }, cb);
    };

    that.deleteApp =  function(appProps, cb) {
        doRequest(target + 'v2/apps/' + appProps.id, 'DELETE', null,
                  function(x) {
                      if ((typeof x.deploymentId === 'string') &&
                          (typeof x.version === 'string')) {
                          return x;
                      } else {
                          var error = new Error('Cannot delete application.');
                          error.res = x;
                          throw error;
                      }
                  }, cb);
    };

    that.deleteRedis =  function(appProps, cb) {
        appProps = myUtils.clone(appProps);
        appProps.id = appProps.redisID;
        that.deleteApp(appProps, cb);
    };


    that.extractRedisPort = function(appStat) {
        try {
            var port = null;
            var params = appStat.container.docker.parameters;
            params.some(function(x) {
                if ((x.key === 'env') &&
                    (x.value.indexOf('REDIS_PORT_') === 0)) {
                    port = parseInt(x.value.split('=')[1]);
                    return true;
                } else {
                    return false;
                }
            });
            return port;
        } catch (ex) {
            return null;
        }
    };

    that.restartApp = function(appProps, cb) {
        doRequest(target + 'v2/apps/' + appProps.id + '/restart',
                  'POST', null, function(x) {
                      if ((typeof x.deploymentId === 'string') &&
                          (typeof x.version === 'string')) {
                          return x;
                      } else {
                          var error = new Error('Cannot restart application.');
                          error.res = x;
                          throw error;
                      }
                  }, cb);
    };

    that.statAll = function(cb) {
        doRequest(target + 'v2/apps/', 'GET', null, null, cb);
    };

    return that;
};
