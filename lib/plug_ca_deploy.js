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

        /*
         * The contents of this variable are always checkpointed before
         * any state externalization (see `gen_transactional`).
         */
        that.state = {}; // replyMethod:string

        const caOwner = json_rpc.splitName($.ca.__ca_getName__())[0];

        const handleReply = function(id, [err, data]) {
            if (that.state.replyMethod) {
                /* Response processed in a separate transaction, i.e.,
                 using a fresh message */
                const m = json_rpc.systemRequest($.ca.__ca_getName__(),
                                                 that.state.replyMethod,
                                                 id, err || null, data || null);
                $.ca.__ca_process__(m, function(err) {
                    err && $.ca.$.log &&
                        $.ca.$.log.error('Got handler exception ' +
                                         myUtils.errToPrettyStr(err));
                });
            } else {
                const logMsg = 'Ignoring reply ' + JSON.stringify(data);
                $.ca.$.log && $.ca.$.log.trace(logMsg);
            }
        };

        const genericImpl = async function(methodName, id, argsArray) {
            const reply = [null];
            try {
                let method = $._.$.deploy[methodName];
                reply[1] = await method.apply(method, argsArray);
            } catch (err) {
                reply[0] = err;
            }
            handleReply(id, reply);
            return [];
        };

        // transactional ops
        const target = {
            async setHandleReplyMethodImpl(methodName) {
                that.state.replyMethod = methodName;
                return [];
            },
            async createAppImpl(appOptions, reqId) {
                return genericImpl('__ca_createApp__', reqId, [appOptions]);
            },
            async deleteAppImpl(appOptions, reqId) {
                return genericImpl('__ca_deleteApp__', reqId, [appOptions]);
            },
            async restartAppImpl(appOptions, reqId) {
                return genericImpl('__ca_restartApp__', reqId, [appOptions]);
            },
            async updateAppImpl(appOptions, reqId) {
                return genericImpl('__ca_updateApp__', reqId, [appOptions]);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.setHandleReplyMethod = function(methodName) {
            that.__ca_lazyApply__('setHandleReplyMethodImpl', [methodName]);
        };

        that.createApp = function(appLocalName, image, isUntrusted, plan, cdn) {
            assert.equal(typeof appLocalName, 'string',
                         "Invalid 'appLocalName'");
            assert.equal(typeof image, 'string', "Invalid 'image'");
            assert.equal(typeof plan, 'string', "Invalid 'plan'");
            assert.equal(typeof isUntrusted, 'boolean',
                         "Invalid 'isUntrusted'");

            const id = json_rpc.joinName(caOwner, appLocalName);

            /** @type {createPropsType} */
            const createOptions = {
                id,
                image,
                isUntrusted,
                plan
            };
            if (cdn) {
                createOptions.cdn = cdn;
            }
            that.__ca_lazyApply__('createAppImpl', [createOptions, id]);
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
            that.__ca_lazyApply__('restartAppImpl', [id, reqId]);
            return reqId;
        };

        that.flexApp = function(id, plan, numberOfCAs) {
            assert.equal(typeof id, 'string', "Invalid 'id'");
            assert.equal(typeof plan, 'string', "Invalid 'plan'");
            assert.equal(typeof numberOfCAs, 'number', "Invalid 'numberOfCAs'");

            const reqId = myUtils.uniqueId();
            const split = json_rpc.splitName(id);
            assert(split[0] === caOwner);

            const deployed = $._.$.deploy.__ca_statApp__(id);
            assert(deployed, 'Missing app ' + id);
            assert(deployed.props && (deployed.props.app.id === id));

            /** @type {flexPropsType} */
            const flexProps = {
                id,
                plan,
                numberOfCAs,
                currentProps: deployed.props
            };
            that.__ca_lazyApply__('updateAppImpl', [flexProps, reqId]);
            return reqId;
        };

        that.statApps = function(ids) {
            return ids.filter(
                (x) => x.startsWith(caOwner + json_rpc.NAME_SEPARATOR)
            ).map((x) => $._.$.deploy.__ca_statApp__(x));
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
