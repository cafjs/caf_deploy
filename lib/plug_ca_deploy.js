// Modifications copyright 2020 Caf.js Labs and contributors
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
const assert = require('assert');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const genPlugCA = caf_comp.gen_plug_ca;
const json_rpc = caf_core.caf_transport.json_rpc;
const myUtils = caf_comp.myUtils;

exports.newInstance = async function($, spec) {
    try {
        const that = genPlugCA.create($, spec);

        const caOwner = json_rpc.splitName($.ca.__ca_getName__())[0];

        const responseCallback = function(reqId) {
            return function(err, data) {
                if (that.state.replyMethod) {
                    const m = json_rpc.systemRequest(
                        $.ca.__ca_getName__(), that.state.replyMethod,
                        reqId, err || null, data || null
                    );
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

        /*
         * The contents of this variable are always checkpointed before
         * any state externalization (see `gen_transactional`).
         */
        that.state = {}; // replyMethod:string

        // transactional ops
        const target = {
            setHandleReplyMethodImpl: function(methodName, cb0) {
                that.state.replyMethod = methodName;
                cb0(null);
            },
            createAppImpl: function(appOptions, reqId, cb0) {
                const cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_createApp__(appOptions, cb1);
                cb0(null);
            },
            deleteAppImpl: function(appOptions, reqId, cb0) {
                const cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_deleteApp__(appOptions, cb1);
                cb0(null);
            },
            restartAppImpl: function(appOptions, reqId, cb0) {
                const cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_restartApp__(appOptions, cb1);
                cb0(null);
            },
            updateAppImpl: function(appOptions, reqId, cb0) {
                const cb1 = responseCallback(reqId);
                $._.$.deploy.__ca_updateApp__(appOptions, cb1);
                cb0(null);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.setHandleReplyMethod = function(methodName) {
            that.__ca_lazyApply__('setHandleReplyMethodImpl', [methodName]);
        };

        that.createApp = function(appLocalName, image, options) {
            const id = json_rpc.joinName(caOwner, appLocalName);
            const appOptions = {
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
            appOptions.isUntrusted = !!options.isUntrusted;
            that.__ca_lazyApply__('createAppImpl', [appOptions, id]);
            return id;
        };

        that.deleteApp = function(id) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            const reqId = myUtils.uniqueId();
            that.__ca_lazyApply__('deleteAppImpl', [{id: id}, reqId]);
            return reqId;
        };

        that.restartApp = function(id) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            const reqId = myUtils.uniqueId();
            that.__ca_lazyApply__('restartAppImpl', [{id: id}, reqId]);
            return reqId;
        };

        that.flexApp = function(id, instances) {
            const reqId = myUtils.uniqueId();
            const split = json_rpc.splitName(id);
            assert(split[0] === caOwner);
            const deployed = $._.$.deploy.__ca_statApp__(id);
            assert(deployed);
            const appOptions = {
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
        const super__ca_resume__ =
                myUtils.superiorPromisify(that, '__ca_resume__');
        that.__ca_resume__ = async function(cp) {
            try {
                if (cp) {
                    await super__ca_resume__(cp);
                    // backwards compatible...
                    that.state.replyMethod = that.state.replyMethod ||
                        cp.replyMethod;
                }
                return [];
            } catch (err) {
                return [err];
            }
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
