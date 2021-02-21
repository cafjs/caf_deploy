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
 * Deploys applications on Kubernetes on behalf of CAs.
 *
 *  The name of this component in framework.json should be 'deploy'
 *
 * Properties:
 *
 *     See type `deploymentSpecType` in file `types.js`
 *
 * @module caf_deploy/plug_deploy_kubernetes
 * @augments external:caf_components/gen_plug
 */
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const genPlug = caf_comp.gen_plug;
const genCron = caf_comp.gen_cron;

const deploy_util = require('./plug_deploy_util_k8s');
const deploy_templates = require('./plug_deploy_templates_k8s');
const types = require('./types');

exports.newInstance = async function($, spec) {
    try {
        let appsStatus = {};

        types.checkSpec(spec.env);

        const cronSpec = {
            name: spec.name + '_cron__',
            module: 'gen_cron', // module ignored
            env: {interval: spec.env.refreshInterval}
        };
        const updateCron = genCron.create(null, cronSpec);

        const that = genPlug.create($, spec);


        const deployTemplates = deploy_templates.newTemplates($, spec.env);
        const deployUtil = await deploy_util.newUtil($, spec.env,
                                                     deployTemplates);

        that.__ca_createApp__ = async function(createOptions) {
            await that.__ca_statAll__();
            if (appsStatus[createOptions.id]) {
                // already deployed, ignore to make call idempotent.
                return [];
            } else {
                const props = deployTemplates.createProps(createOptions);
                await deployUtil.createRedis(props.redis);
                return deployUtil.createAppProcess(props.app);
            }
        };

        that.__ca_updateApp__ = async function(updateOptions) {
            if (!updateOptions.currentProps.redis.isDedicatedVolume &&
                (updateOptions.currentProps.app.instances >
                 spec.env.redis.maxNFSInstances)) {
                await that.__ca_upgradeToDedicatedDisk__(updateOptions.id);
                // refresh props
                await that.__ca_statAll__();
                const deployed = that.__ca_statApp__(updateOptions.id);
                updateOptions.currentProps = deployed.props;
            }
            const props = deployTemplates.updateProps(updateOptions);
            if (props.redis) {
                await deployUtil.updateRedis(props.redis);
            }
            if (props.app) {
                return deployUtil.updateAppProcess(props.app);
            } else {
                return [];
            }
        };

        that.__ca_changeImage__ = function(changeImageOptions) {
            const props = deployTemplates.changeImageProps(changeImageOptions);
            if (props.app) {
                return deployUtil.updateAppProcess(props.app);
            } else {
                return [];
            }
        };

        that.__ca_statApp__ = (id) => appsStatus[id];

        that.__ca_restartApp__ = (id) => deployUtil.restartApp(id);

        that.__ca_upgradeToDedicatedDisk__ = async function(id) {
            await that.__ca_statAll__();
            if (!appsStatus[id]) {
                throw new Error(`Missing app ${id} cannot upgrade disk`);
            }
            if (!appsStatus[id].props) {
                throw new Error(`Missing props for ${id} cannot upgrade disk`);
            }
            if (appsStatus[id].props.redis.isDedicatedVolume) {
                throw new Error('Already dedicated, cannot upgrade disk');
            }

            const props = myUtils.deepClone(appsStatus[id].props);
            props.redis.isDedicatedVolume = true;
            await deployUtil.upgradeToDedicatedDisk(props.redis);
            return deployUtil.updateProps(id, props);
        };

        that.__ca_deleteApp__ = async function(deleteOptions) {
            // Always try to delete, even if we don't see it...
            await deployUtil.deleteAppProcess(deleteOptions);
            return deployUtil.deleteRedis(deleteOptions);
        };

        that.__ca_statAll__ = async function() {
            const apps = await deployUtil.statAll();
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
                return appsStatus;
            } else {
                $._ && $._.$.log && $._.$.log.debug('Got invalid app update: ' +
                                                    JSON.stringify(apps));
                throw new Error('Got invalid apps update:' +
                                JSON.stringify(apps));
            }
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            updateCron && updateCron.__ca_stop__();
            super__ca_shutdown__(data, cb);
        };

        await that.__ca_statAll__();

        updateCron.__ca_start__(that.__ca_statAll__);

        return [null, that];
    } catch (err) {
        return [err];
    }
};
