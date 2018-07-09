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
 * Manages deployed apps by this CA.
 *
 * The name of this component in a ca.json description should be 'deploy'.
 *
 * @module caf_deploy/plug_ca_deploy
 * @augments external:caf_components/gen_plug_ca
 *
 */
var assert = require('assert');
var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var genPlugCA = caf_comp.gen_plug_ca;
var json_rpc = caf_core.caf_transport.json_rpc;
var deploy_util = require('./plug_deploy_util');
var myUtils = caf_comp.myUtils;

exports.newInstance = function($, spec, cb) {
    try {

        var replyMethod = null;
        var that = genPlugCA.constructor($, spec);

        var caOwner = json_rpc.splitName($.ca.__ca_getName__())[0];

        var responseCallback = function(reqId) {
            return function(err, data) {
                if (replyMethod) {
                    var m = json_rpc
                            .systemRequest($.ca.__ca_getName__(), replyMethod,
                                           reqId, err || null, data || null);
                    $.ca.__ca_process__(m, function(err) {
                        if (err) {
                            $._.$.log &&
                                $._.$.log.err('Got handler error ' +
                                              myUtils.errToPrettyStr(err));
                        }
                    });
                }
            };
        };
       // transactional ops
        var target = {
            setHandleReplyMethodImpl: function(methodName, cb0) {
                replyMethod = methodName;
                cb0(null);
            },
            createAppImpl: function(appOptions, reqId, cb0) {
                var cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_createApp__(appOptions, cb1);
                cb0(null);
            },
            deleteAppImpl: function(appOptions, reqId, cb0) {
                var cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_deleteApp__(appOptions, cb1);
                cb0(null);
            },
            restartAppImpl: function(appOptions, reqId, cb0) {
                var cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_restartApp__(appOptions, cb1);
                cb0(null);
            },
            updateAppImpl: function(appOptions, reqId, cb0) {
                var cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_updateApp__(appOptions, cb1);
                cb0(null);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.setHandleReplyMethod = function(methodName) {
            that.__ca_lazyApply__('setHandleReplyMethodImpl', [methodName]);
        };

        that.createApp = function(appLocalName, image, options) {
            var id = json_rpc.joinName(caOwner, appLocalName);
            var appOptions = {
                id: id,
                image: image,
                appPublisher: caOwner,
                appLocalName: appLocalName
            };
            if (typeof options.memory === 'number') {
                appOptions.memory = options.memory;
            }
            appOptions.instances = (options.instances ? options.instances : 1);
            if (options && Array.isArray(options.args)) {
                appOptions.args = JSON.stringify(options.args);
            }
            that.__ca_lazyApply__('createAppImpl', [appOptions, id]);
            return id;
        };

        that.deleteApp = function(id) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            var reqId = myUtils.uniqueId();
            that.__ca_lazyApply__('deleteAppImpl', [{id: id}, reqId]);
            return reqId;
        };

        that.restartApp = function(id) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            var reqId = myUtils.uniqueId();
            that.__ca_lazyApply__('restartAppImpl', [{id: id}, reqId]);
            return reqId;
        };

        that.flexApp = function(id, instances) {
            var reqId = myUtils.uniqueId();
            var split = json_rpc.splitName(id);
            assert(split[0] === caOwner);
            var deployed = $._.$.deploy.__ca_statApp__(id);
            assert(deployed);
            var appOptions = {
                id: id,
                instances: instances,
                appPublisher: caOwner,
                appLocalName: split[1]
            };
            that.__ca_lazyApply__('updateAppImpl', [appOptions, reqId]);
            return reqId;
        };

        that.getAllRedisPorts = function() {
            return $._.$.deploy.__ca_getAllRedisPorts__();
        };

        that.statApps = function(ids) {
            return ids.filter(function(x) {
                return x.startsWith(caOwner + json_rpc.NAME_SEPARATOR);
            }).map(function(x) {
                return $._.$.deploy.__ca_statApp__(x);
            });
        };

        // Framework methods
        var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');
        that.__ca_resume__ = function(cp, cb0) {
            replyMethod = cp.replyMethod || null;
            super__ca_resume__(cp, cb0);
        };

        var super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
        that.__ca_prepare__ = function(cb0) {
            super__ca_prepare__(function(err, data) {
                if (err) {
                    cb0(err, data);
                } else {
                    data.replyMethod = replyMethod;
                    cb0(err, data);
                }
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
