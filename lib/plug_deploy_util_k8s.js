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
 * Helper functions to load apps and services in Kubernetes.
 *
 *
 * @module caf_deploy/plug_deploy_util_k8s
 */

const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;

const kub = require('kubernetes-client');
const mustache = require('mustache');
const yaml = require('js-yaml');

exports.newUtil = async function($, deploymentSpec, templates) {
    const that = {};
    const appSpec = deploymentSpec.app;
    const redisSpec = deploymentSpec.redis;

    const k8sClient = new kub.Client({
        config: deploymentSpec.useK8SConfig ?
            kub.config.fromKubeconfig() :
            kub.config.getInCluster()
    });

    that.createRedis = async function(redisProps) {

        const render = mustache.render(templates.redis, redisProps);
        const r = yaml.safeLoadAll(render);

        const createN = await k8sClient.apis['networking.k8s.io'].v1
            .namespaces(redisSpec.k8SNamespace)
            .networkpolicies.post({body: r[2]});

        const createD = redisProps.isDedicatedVolume ?
            await k8sClient.api.v1.namespaces(redisSpec.k8SNamespace)
            .persistentvolumeclaims({body: r[3]}) :
            null;

        const createS = await k8sClient.api.v1
            .namespaces(redisSpec.k8SNamespace)
            .services.post({body: r[0]});

        const create = await k8sClient.apis.apps.v1
            .namespaces(redisSpec.k8SNamespace).deployments.post({body: r[1]});

        return [createS, create, createN, createD];
    };

    that.createAppProcess = async function(appProps) {
        const r = yaml.safeLoadAll(mustache.render(templates.app, appProps));

        const createN = await k8sClient.apis['networking.k8s.io'].v1
            .namespaces(appSpec.k8SNamespace)
            .networkpolicies.post({body: r[2]});

        const createS = await k8sClient.api.v1
            .namespaces(appSpec.k8SNamespace)
            .services.post({body: r[0]});

        const create = await k8sClient.apis.apps.v1
            .namespaces(appSpec.k8SNamespace).deployments.post({body: r[1]});

        return [createS, create, createN];
    };

    that.updateApp = function(appProps, appPatch) {
        return k8sClient.apis.apps.v1.namespaces(
            appSpec.k8SNamespace
        ).deployments(appProps.id).patch({body: appPatch});
    };

    that.updateRedis = async function(redisProps, redisPatch, createDisk) {
        // Create disk if needed
        if (createDisk && redisProps.isDedicatedVolume) {
            const render = mustache.render(templates.redis, redisProps);
            const r = yaml.safeLoadAll(render);
            const createD = await k8sClient.api.v1
                .namespaces(redisSpec.k8SNamespace)
                  .persistentvolumeclaims({body: r[3]});
            $._ && $._.$.log && $._.$.log.debug('Disk created: ' + createD);
        }

        return k8sClient.apis.apps.v1.namespaces(
            appSpec.k8SNamespace
        ).deployments(redisProps.id).patch({body: redisPatch});
    };

    that.restartApp = function(appProps) {
        const touch = {
            spec: {
                template: {
                    metadata: {
                        annotations: {
                            touch: (new Date()).toISOString()
                        }
                    }
                }
            }
        };
        return k8sClient.apis.apps.v1.namespaces(appSpec.k8SNamespace)
            .deployments(appProps.id)
            .patch({body: touch});
    };

    const logAndContinue = async (obj, method, msg) => {
        try {
            return await obj[method]();
        } catch (ex) {
            $._ && $._.$.log && $._.$.log.debug(msg + ' got' +
                                                myUtils.errToPrettyStr(ex));
            return false;
        }
    };

    that.deleteRedis = async function(redisProps) {
        const removed = await logAndContinue(
            k8sClient.apis.apps.v1.namespaces(redisSpec.k8SNamespace)
                .deployments('redis-' + redisProps.id), 'delete',
            'Warning: Cannot delete deployment redis-' + redisProps.id
        );

        const removed1 = await logAndContinue(
            k8sClient.api.v1.namespaces(redisSpec.k8SNamespace)
                .services('redis-' + redisProps.id), 'delete',
            'Warning: Cannot delete service redis-' + redisProps.id
        );

        const removed2 = await logAndContinue(
            k8sClient.apis['networking.k8s.io'].v1
                .namespaces(redisSpec.k8SNamespace)
                .networkpolicies('redis-' + redisProps.id), 'delete',
            'Warning: Cannot delete network policy redis-' + redisProps.id
        );

        const diskName = `redis-${redisProps.id}-${redisProps.timestamp}`;
        const removed3 = await logAndContinue(
            k8sClient.api.v1.namespaces(redisSpec.k8SNamespace)
                .persistentvolumeclaims(diskName), 'delete',
            'Warning: Cannot delete disk ' + diskName
        );

        return [removed, removed1, removed2, removed3];
    };

    that.deleteApp = async function(appProps) {
        const removed = await logAndContinue(
            k8sClient.apis.apps.v1
                .namespaces(appSpec.k8SNamespace).deployments(appProps.id),
            'delete', 'Warning: Cannot delete deployment ' + appProps.id
        );

        const removed1 = await logAndContinue(
            k8sClient.api.v1
                .namespaces(appSpec.k8SNamespace).services(appProps.id),
            'delete', 'Warning: Cannot delete service ' + appProps.id
        );

        const removed2 = await logAndContinue(
            k8sClient.apis['networking.k8s.io'].v1
                .namespaces(appSpec.k8SNamespace).networkpolicies(appProps.id),
            'delete', 'Warning: Cannot delete network policy ' + appProps.id
        );

        return [removed, removed1, removed2];
    };

    that.statAll = async function() {
        const all = await k8sClient.apis.apps.v1.namespaces(
            appSpec.k8SNamespace
        ).deployments.get();

        return all.body.items.map((x) => {
            return {
                id: x.metadata.name,
                tasksRunning: x.status.availableReplicas||0,
                props: x.spec.template.metadata.props &&
                    JSON.parse(x.spec.template.metadata.props),
                version: x.spec.template.metadata.annotations &&
                    x.spec.template.metadata.annotations.touch
            };
        });

    };

    await k8sClient.loadSpec();
    return that;
};
