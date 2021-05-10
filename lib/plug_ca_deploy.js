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
const REGEXP_BASH_VAR = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const REGEXP_TIMESTAMP = /^[0-9]*$/;
const REGEXP_NAME = /^[a-z0-9]+$/;
const PLANS = {bronze: true, silver: true, gold: true, platinum: true};

exports.newInstance = async function($, spec) {
    try {
        const that = genPlugCA.create($, spec);

        /*
         * The contents of this variable are always checkpointed before
         * any state externalization (see `gen_transactional`).
         */
        that.state = {}; // replyMethod:string

        const caOwner = json_rpc.splitName($.ca.__ca_getName__())[0];

        const checkPlan = function(plan) {
            assert.equal(typeof plan, 'string', "Invalid 'plan'");
            assert(PLANS[plan], `Not available plan ${plan}`);
        };

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
            async changeImageImpl(appOptions, reqId) {
                return genericImpl('__ca_changeImage__', reqId, [appOptions]);
            },
            async updateAppImpl(appOptions, reqId) {
                return genericImpl('__ca_updateApp__', reqId, [appOptions]);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.setHandleReplyMethod = function(methodName) {
            that.__ca_lazyApply__('setHandleReplyMethodImpl', [methodName]);
        };

        that.createApp = function(appLocalName, image, isUntrusted, plan, cdn,
                                  timestamp, props) {
            assert.equal(typeof appLocalName, 'string',
                         "Invalid 'appLocalName'");
            assert(appLocalName && appLocalName.match(REGEXP_NAME),
                   `Invalid ${appLocalName}: use only lower case ASCII ` +
                   'letters or numbers');
            assert.equal(typeof image, 'string', "Invalid 'image'");
            checkPlan(plan);
            assert.equal(typeof isUntrusted, 'boolean',
                         "Invalid 'isUntrusted'");
            timestamp && assert.equal(typeof timestamp, 'string',
                                      "Invalid 'timestamp'");
            props && assert.equal(typeof props, 'object',
                                  "Invalid 'props'");
            const id = json_rpc.joinName(caOwner, appLocalName);

            /** @type {createOptionsType} */
            const createOptions = {
                id,
                image: JSON.stringify(image), // quotes + escapes special chars
                isUntrusted,
                plan
            };
            if (cdn) {
                createOptions.cdn = {
                    appCDN: JSON.stringify(cdn.appCDN),
                    appSubdirCDN: JSON.stringify(cdn.appSubdirCDN)
                };
            }
            if (timestamp) {
                assert(timestamp.match(REGEXP_TIMESTAMP),
                       `Invalid timestamp ${timestamp}`);
                createOptions.timestamp = timestamp;
            }
            if (props) {
                const envProps = [];
                Object.keys(props).forEach((k) => {
                    assert(k.match(REGEXP_BASH_VAR), `Invalid key ${k}`);
                    assert(typeof props[k] === 'string',
                           `Value ${props[k]} is not a string`);
                    // stringify the string to escape special characters
                    envProps.push({key: k, value: JSON.stringify(props[k])});
                });
                createOptions.envProps = envProps;
            }
            that.__ca_lazyApply__('createAppImpl', [createOptions, id]);
            return id;
        };

        that.deleteApp = function(id, keepData) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            const reqId = myUtils.uniqueId();

            const deployed = $._.$.deploy.__ca_statApp__(id);

            /** @type {deleteOptionsType} */
            const deleteOptions = {
                id,
                keepData,
                /* Allow missing apps to make delete idempotent*/
                timestamp: deployed && deployed.props && deployed.props.redis &&
                    deployed.props.redis.timestamp || null
            };

            that.__ca_lazyApply__('deleteAppImpl', [deleteOptions, reqId]);
            return reqId;
        };

        that.restartApp = function(id) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            const reqId = myUtils.uniqueId();
            that.__ca_lazyApply__('restartAppImpl', [id, reqId]);
            return reqId;
        };

        that.changeImage = function(id, image) {
            assert(id.startsWith(caOwner + json_rpc.NAME_SEPARATOR));
            assert.equal(typeof image, 'string', "Invalid 'image'");
            const reqId = myUtils.uniqueId();
            const deployed = $._.$.deploy.__ca_statApp__(id);
            assert(deployed, 'Missing app ' + id);
            assert(deployed.props && (deployed.props.app.id === id));

            /** @type {changeImageOptionsType} */
            const changeImageOptions = {
                id,
                image: JSON.stringify(image), // quotes + escapes special chars
                currentProps: deployed.props
            };
            that.__ca_lazyApply__('changeImageImpl', [changeImageOptions,
                                                      reqId]);
            return reqId;
        };

        that.flexApp = function(id, plan, numberOfCAs) {
            assert.equal(typeof id, 'string', "Invalid 'id'");
            checkPlan(plan);
            assert.equal(typeof numberOfCAs, 'number', "Invalid 'numberOfCAs'");

            const reqId = myUtils.uniqueId();
            const split = json_rpc.splitName(id);
            assert(split[0] === caOwner);

            const deployed = $._.$.deploy.__ca_statApp__(id);
            assert(deployed, 'Missing app ' + id);
            assert(deployed.props && (deployed.props.app.id === id));

            /** @type {updateOptionsType} */
            const updateOptions = {
                id,
                plan,
                numberOfCAs,
                currentProps: deployed.props
            };
            that.__ca_lazyApply__('updateAppImpl', [updateOptions, reqId]);
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
