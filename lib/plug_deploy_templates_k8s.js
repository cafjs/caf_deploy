'use strict';
const assert = require('assert');

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const json_rpc = caf_core.caf_transport.json_rpc;

const METADATA_VERSION = '1.0.0';

/**
 * @global
 * @typedef {Object} redisPropsType
 * @property {string} id
 * @property {string} k8SNamespace
 * @property {string} touch Modify to trigger reset.
 * @property {string} timestamp Over time multiple instances of a service have
 * the same `id`, and by adding `timestamp` we can identify their volumes.
 * @property {string} image
 * @property {number} cpus In millicores.
 * @property {number} memory In megabytes.
 * @property {number} memoryLimit In megabytes.
 * @property {number} cpusLimit In millicores.
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {number} dedicatedVolumeSize The disk size in gigabytes.
 * @property {boolean} isDedicatedVolume True if it has exclusive access to a
 * persistent volume.
 * @property {boolean} isUntrusted
 *
 */

/**
 * @global
 * @typedef {Object} appPropsType
 *
 * @property {string} id // duplicate
 * @property {string} k8SNamespace The app namespace.
 * @property {number} instances The number of processes.
 * @property {string} touch Modify to trigger reset.
 * @property {string} appPublisher
 * @property {string} appLocalName
 * @property {string} appSuffix
 * @property {boolean} isDeployer
 * @property {boolean} isAccounts
 * @property {boolean} isPeople
 * @property {boolean} isUntrusted // duplicate
 * @property {boolean} isIncubator
 * @property {boolean} isGvisor Whether to use a sandbox.
 * @property {string} redisNamespace The redis namespace.
 * @property {string} image
 * @property {string} args The JSON serialized array with arguments to node.
 * @property {number} cpus In millicores.
 * @property {number} memory In megabytes.
 * @property {number} memoryLimit In megabytes.
 * @property {number} cpusLimit In millicores.
 * @property {number} storage  In megabytes.
 * @property {number} storageLimit In megabytes.
 * @property {number} egressLimit In megabytes/sec
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {boolean} isCDN Whether to change current CDN settings.
 * @property {string=} appCDN The base url for a CDN service.
 * @property {string=} appSubdirCDN A CDN subdir for cache invalidation.
 * @property {string=} props JSON serialized metadata of current deployment
 * (type before serialization is `deploymentPropsType`).
 *
 */

/**
 * @global
 * @typedef {Object} deploymentPropsType
 * @property {string} version The schema version for this metadata.
 * @property {appPropsType} app Props for the nodejs app.
 * @property {redisPropsType} redis Props for the redis backend.
 * @property {number} numberOfCAs The number of active CAs.
 * @property {string} plan The strategy to flex resources.
 */

/**
 * @global
 * @typedef {Object} flexOptionsType
 * @property {string} id
 * @property {string} plan The strategy to flex resources.
 * @property {number} numberOfCAs The number of active CAs.
 * @property {deploymentPropsType} currentProps The deployment
 * properties currently used.
 */

/**
 * @global
 * @typedef {Object} createOptionsType
 * @property {string} id
 * @property {string} plan The strategy to flex resources.
 * @property {string} image The docker image for the app.
 * @property {boolean} isUntrusted
 * @property {{appCDN: string, appSubdirCDN: string}=} cdn  An optional CDN
 * configuration that overrides the one in the image.
 */

/**
 * @global
 * @typedef {Object} deleteOptionsType
 * @property {string} id
 * @property {string} timestamp  Over time multiple instances of a service have
 * the same `id`, and by adding `timestamp` we can identify their volumes.
 */

exports.newTemplates = function($, deploymentSpec) {
    const that = {};
    const appSpec = deploymentSpec.app;
    const redisSpec = deploymentSpec.redis;

    const redisT = path.resolve(__dirname, redisSpec.templateFile);
    that.redis = fs.readFileSync(redisT, {encoding: 'utf8'});
    mustache.parse(that.redis);

    const appT = path.resolve(__dirname, appSpec.templateFile);
    that.app = fs.readFileSync(appT, {encoding: 'utf8'});
    mustache.parse(that.app);

    const findIndex = (isUntrusted, isIncubation) =>
          (isUntrusted ? (isIncubation ? 1 : 2) : 0);

    that.createProps = function(createOptions) {
        // untrusted apps start in incubation mode
        const index = findIndex(createOptions.isUntrusted,
                                createOptions.isUntrusted);
        const createRedisProps = function() {
            const redisProps = {
                id: createOptions.id,
                k8SNamespace: redisSpec.k8SNamespace,
                touch: (new Date()).toISOString(),
                timestamp: (new Date()).getTime().toString(),
                image: createOptions.image,
                cpus: redisSpec.request.cpus[index],
                memory: redisSpec.request.memory[index],
                memoryLimit: redisSpec.limit.memory[index],
                cpusLimit: redisSpec.limit.cpus[index],
                poolKey: redisSpec.nodePool.poolKey,
                poolValue: redisSpec.nodePool.poolValue,
                dedicatedVolumeSize: redisSpec.dedicatedVolumeSize,
                isDedicatedVolume: !createOptions.isUntrusted,
                isUntrusted: createOptions.isUntrusted
            };
            return redisProps;
        };

        const createAppProps = function() {
            const [appPublisher, appLocalName] = json_rpc.splitName(
                createOptions.id
            );
            const appProps = {
                id: createOptions.id,
                k8SNamespace: appSpec.k8SNamespace,
                instances: 1,
                touch: (new Date()).toISOString(),
                appPublisher,
                appLocalName,
                appSuffix: deploymentSpec.appSuffix,
                isDeployer: deploymentSpec.isDeployer,
                isAccounts: deploymentSpec.isAccounts,
                isPeople: deploymentSpec.isPeople,
                isUntrusted: createOptions.isUntrusted,
                isIncubator: createOptions.isUntrusted,
                isGvisor: createOptions.isUntrusted,
                redisNamespace: redisSpec.k8SNamespace,
                image: createOptions.image,
                args: JSON.stringify(appSpec.args),
                cpus: appSpec.request.cpus[index],
                memory: appSpec.request.memory[index],
                memoryLimit: appSpec.limit.memory[index],
                cpusLimit: appSpec.limit.cpus[index],
                storage: appSpec.request.storage[index],
                storageLimit: appSpec.limit.storage[index],
                egressLimit: appSpec.limit.egress[index],
                poolKey: createOptions.isUntrusted ?
                    appSpec.incubatorNodePool.poolKey :
                    appSpec.nodePool.poolKey,
                poolValue: createOptions.isUntrusted ?
                    appSpec.incubatorNodePool.poolValue :
                    appSpec.nodePool.poolValue,
                isCDN: !!createOptions.cdn,
                appCDN: createOptions.cdn && createOptions.cdn.appCDN,
                appSubdirCDN: createOptions.cdn &&
                    createOptions.cdn.appSubdirCDN
            };
            return appProps;
        };

        const result =  {
            version: METADATA_VERSION,
            numberOfCAs: 0,
            app: createAppProps(),
            redis: createRedisProps()
        };
        result.app.props = JSON.stringify(result);
        return result;
    };

    that.createPatches = function(flexOptions) {
        //app
        const replica = {
            spec: {
                replicas: appProps.instances
            }
        };


    };

    return that;
};
