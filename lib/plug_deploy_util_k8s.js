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

exports.newUtil = async function(env, appSpec, redisSpec) {
    const that = {};

    const k8sClient = new kub.Client({
        config: env.useK8SConfig ?
            kub.config.fromKubeconfig() :
            kub.config.getInCluster()
    });

    that.createRedis = async function(appProps) {
        const spec = myUtils.clone(redisSpec);
        spec.id = appProps.id;
        spec.timestamp = (new Date()).getTime().toString();
        spec.touch = (new Date()).toISOString();
        const r = yaml.safeLoadAll(mustache.render(spec.template,
                                                   spec));
        const createS = await k8sClient.api.v1.namespaces(spec.k8SNamespace)
            .services
            .post({body: r[0]});
        const create = await k8sClient.apis.apps.v1
            .namespaces(spec.k8SNamespace)
            .deployments
            .post({body: r[1]});
        return [null, [createS, create]];
    };

    that.createApp = async function(appProps) {
        const spec = myUtils.clone(appSpec);
        myUtils.mixin(spec, appProps);
        spec.redisNamespace = redisSpec.k8SNamespace;
        spec.touch = (new Date()).toISOString();

        const r = yaml.safeLoadAll(mustache.render(spec.template,
                                                   spec));
        const createS = await k8sClient.api.v1.namespaces(spec.k8SNamespace)
            .services
            .post({body: r[0]});
        const create = await k8sClient.apis.apps.v1
            .namespaces(spec.k8SNamespace)
            .deployments
            .post({body: r[1]});
        return [null, [createS, create]];
    };

    that.updateApp = async function(appProps) {
        const replica = {
            spec: {
                replicas: appProps.instances
            }
        };
        const rep = await k8sClient.apis.apps.v1.namespaces(
            appSpec.k8SNamespace
        ).deployments(appProps.id).patch({body: replica});

        return [null, rep];
    };

    that.restartApp = async function(appProps) {
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
        const t = await k8sClient.apis.apps.v1.namespaces(appSpec.k8SNamespace)
            .deployments(appProps.id)
            .patch({body: touch});
        return [null, t];
    };

    that.deleteRedis = async function(appProps) {
        let removed = await k8sClient.apis.apps.v1
            .namespaces(redisSpec.k8SNamespace)
            .deployments('redis-' + appProps.id).delete();
        removed = await k8sClient.api.v1
            .namespaces(redisSpec.k8SNamespace)
            .services('redis-' + appProps.id).delete();
        return [null, removed];

    };

    that.deleteApp = async function(appProps) {
        let removed = await k8sClient.apis.apps.v1
            .namespaces(appSpec.k8SNamespace).deployments(appProps.id)
            .delete();
        removed = await k8sClient.api.v1
            .namespaces(appSpec.k8SNamespace).services(appProps.id)
            .delete();
        return [null, removed];
    };

    that.statAll = async function() {
        const all = await k8sClient.apis.apps.v1.namespaces(
            appSpec.k8SNamespace
        ).deployments.get();

        return [
            null,
            all.body.items.map(function(x) {
                return {
                    id: x.metadata.name,
                    tasksRunning: x.status.availableReplicas||0,
                    version: x.spec.template.metadata.annotations &&
                        x.spec.template.metadata.annotations.touch
                };
            })
        ];
    };

    await k8sClient.loadSpec();
    return that;
};
