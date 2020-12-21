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
 *       {refreshInterval: number,
 *        useK8SConfig: string, redis: caf.redis, app: caf.app}
 *
 * where:
 *
 * * `refreshInterval`: time between Kubernetes status polling in msec.
 * * `useK8SConfig`: whether to use the k8s config file from the kubelet client.
 * *  `redis`: configuration properties for the redis service.
 * *  `app`: configuration properties for deploying the app.
 *
 * The type `caf.redis` is:
 *
 *        {templateFile: string, k8SNamespace: string, cpusLimit: number,
 *          image: string, cpus: number, memory: number, memoryLimit: number,
 *          isUntrusted: boolean, poolKey: string, poolValue: string}
 *
 * where:
 *
 * * `templateFile`: name of the Redis template.
 * * `k8SNamespace`: a namespace for the instance.
 * * `image`: Docker image for the redis service.
 * * `isUntrusted`:  whether this is an untrusted app that, e.g., should use
 * `gvisor`.
 * * `cpus`, `memory`, `cpusLimit`, `memoryLimit`: Fraction of cpu for the
 *  instance, memory in megabytes requested and their hard limits. Limits are
 *  only active if `isUntrusted` is true.
 * * `poolKey` and `poolValue`: key-value pair for a node-selector label, e.g.,
 * `cloud.google.com/gke-nodepool`  and `default-pool` to target a node for
 * the default pool.
 *
 * The type `caf.app` is:
 *
 *        {templateFile: string, k8SNamespace: string, args: Array.<caf.json>,
 *         instances: number, memoryLimit: number, appSuffix: string,
 *         isDeployer: boolean, isAccounts: boolean, isUntrusted: boolean,
 *         isPeople: boolean, services: Array.<string>, cpus: number,
 *         memory: number, cpusLimit: number, storage: number,
 *         storageLimit: number, poolKey: string, poolValue: string}
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
 * * `isPeople`: whether this is a privileged app that manages apps/credits.
 * * `isUntrusted`:  whether this is an untrusted app that, e.g., should use
 * `gvisor`.
 * * `services`: dependent services like `redis`.
 * * `cpus`, `memory`, `cpusLimit`, `memoryLimit`, `storage`, `storageLimit`:
 * Fraction of cpu for the instance, memory in megabytes requested, ephemeral
 * storage in megabytes requested and their hard limits. Limits are
 * only active if `isUntrusted` is true.
 * * `poolKey` and `poolValue`: key-value pair for a node-selector label, e.g.,
 * `cloud.google.com/gke-nodepool`  and `default-pool` to target a node for
 * the default pool.
 *
 * @module caf_deploy/plug_deploy_kubernetes
 * @augments external:caf_components/gen_plug
 */
const assert = require('assert');
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

        assert.equal(typeof spec.env.useK8SConfig, 'boolean',
                     "'spec.env.useK8SConfig' is not a boolean");

        assert.equal(typeof spec.env.refreshInterval, 'number',
                     "'spec.env.refreshInterval' is not a number");
        const deploymentSpec = spec.env;
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

        that.__ca_updateApp__ = async function(flexOptions) {
            await that.__ca_statAll__();
            const props = deployTemplates.createPatches(flexOptions);
            await deployUtil.updateRedis(props.redis);
            return deployUtil.updateAppProcess(props.app);
        };

        that.__ca_statApp__ = function(id) {
            return appsStatus[id];
        };

        that.__ca_restartApp__ = async function(id) {
            return deployUtil.restartApp(id);
        };

        that.__ca_upgradeToDedicatedDisk__ = async function(id) {
            await that.__ca_statAll__();
            if (!appsStatus[id]) {
                throw new Error(`Missing app ${id} cannot upgrade disk`);
            }
            if (!appsStatus[id].props) {
                throw new Error(`Missing props for ${id} cannot upgrade disk`);
            }
            if (appsStatus[id].props.redis.isDedicatedVolume) {
                throw new Error(`Already dedicated, cannot upgrade disk`);
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
