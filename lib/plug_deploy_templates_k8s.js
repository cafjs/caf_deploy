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

const CHANGEABLE_REDIS_KEYS = [
    'cpus', 'memory', 'memoryLimit', 'cpusLimit', 'poolKey',
    'poolValue', 'isGvisor', 'dedicatedVolumeSize'
];
const CHANGEABLE_APP_PROCESS_KEYS = [
    'cpus', 'memory', 'memoryLimit', 'cpusLimit',
    'storage', 'storageLimit', 'egressLimit',
    'poolKey', 'poolValue', 'isGvisor', 'isIncubator', 'instances'
];


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

    /**
     * Get template properties for a new app.
     *
     *
     * @param {createOptionsType} createOptions The arguments to create
     * template properties.
     *
     * @return {deploymentPropsType} Template properties for a new app.
     */
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
                image: redisSpec.image,
                cpus: redisSpec.request.cpus[index],
                memory: redisSpec.request.memory[index],
                memoryLimit: redisSpec.limit.memory[index],
                cpusLimit: redisSpec.limit.cpus[index],
                poolKey: redisSpec.nodePool.poolKey[index],
                poolValue: redisSpec.nodePool.poolValue[index],
                isGvisor: redisSpec.nodePool.isGvisor[index],
                dedicatedVolumeSize: redisSpec.dedicatedVolumeSize[index],
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
                redisNamespace: redisSpec.k8SNamespace,
                image: createOptions.image,
                args: JSON.stringify(appSpec.args),
                cpus: appSpec.request.cpus[index],
                memory: appSpec.request.memory[index],
                memoryLimit: appSpec.limit.memory[index],
                cpusLimit: appSpec.limit.cpus[index],
                storage: appSpec.request.storage &&
                    appSpec.request.storage[index] || null,
                storageLimit: appSpec.limit.storage &&
                    appSpec.limit.storage[index] || null,
                egressLimit: appSpec.limit.egress &&
                    appSpec.limit.egress[index] || null,
                poolKey: appSpec.nodePool.poolKey[index],
                poolValue: appSpec.nodePool.poolValue[index],
                isGvisor: appSpec.nodePool.isGvisor[index],
                isCDN: !!createOptions.cdn,
                appCDN: createOptions.cdn && createOptions.cdn.appCDN,
                appSubdirCDN: createOptions.cdn &&
                    createOptions.cdn.appSubdirCDN
            };
            return appProps;
        };

        const result = {
            version: METADATA_VERSION,
            numberOfCAs: 0,
            app: createAppProps(),
            redis: createRedisProps()
        };
        result.app.props = (Buffer.from(JSON.stringify(result),'utf-8'))
            .toString('base64');
        return result;
    };

    const isIncubatorUpgrade = ({plan, numberOfCAs}) =>
        (numberOfCAs > (deploymentSpec.plans[plan] *
                        deploymentSpec.ratioIncubator));

    /**
     *
     * @param {updateOptionsType} updateOptions
     * @param {boolean} upgrading
     *
     * @return {patchedPropsType}
     *
     */
    const computeResources = function(updateOptions, upgrading) {
        const {plan, numberOfCAs, currentProps} = updateOptions;
        const isUntrusted = currentProps.app.isUntrusted;
        const isIncubator = currentProps.app.isIncubator;

        if (upgrading) {
            // out of the incubator, use one full process

            assert(!isIncubator, 'Cannot upgrade again');

            const index = findIndex(isUntrusted, false);

            return {
                plan,
                numberOfCAs,
                redis: {
                    cpus: redisSpec.request.cpus[index],
                    memory: redisSpec.request.memory[index],
                    memoryLimit: redisSpec.limit.memory[index],
                    cpusLimit: redisSpec.limit.cpus[index],
                    poolKey: redisSpec.nodePool.poolKey[index],
                    poolValue: redisSpec.nodePool.poolValue[index],
                    isGvisor: redisSpec.nodePool.isGvisor[index],
                    dedicatedVolumeSize: redisSpec.dedicatedVolumeSize[index]
                },
                app: {
                    cpus: appSpec.request.cpus[index],
                    memory: appSpec.request.memory[index],
                    memoryLimit: appSpec.limit.memory[index],
                    cpusLimit: appSpec.limit.cpus[index],
                    storage: appSpec.request.storage[index],
                    storageLimit: appSpec.limit.storage[index],
                    egressLimit: appSpec.limit.egress[index],
                    poolKey: appSpec.nodePool.poolKey[index],
                    poolValue: appSpec.nodePool.poolValue[index],
                    isGvisor: appSpec.nodePool.isGvisor[index],
                    isIncubator: false,
                    instances: 1
                    // `props` delayed until computing delta
                }
            };
        } else {
            // vertical scaling for redis, horizontal scale out for node.js
            const index = findIndex(isUntrusted, isIncubator);

            const horizontalAppScaling = () =>
                // zero `numberOfCAs` still provisions one instance...
                Math.ceil((numberOfCAs+1)/deploymentSpec.plans[plan]);
            let instances = horizontalAppScaling();
            instances = instances > appSpec.maxInstances ?
                appSpec.maxInstances :
                instances;

            const verticalRedisScaling = () => {
                // instances > 0 always
                const n = Math.floor((instances-1)/redisSpec.updateRatio);
                return {
                    cpus: redisSpec.request.cpus[index] +
                        n*redisSpec.deltaRequest.cpus[index],

                    memory: redisSpec.request.memory[index] +
                        n*redisSpec.deltaRequest.memory[index],

                    memoryLimit: redisSpec.limit.memory[index] +
                        n*redisSpec.deltaLimit.memory[index],

                    cpusLimit: redisSpec.limit.cpus[index] +
                        n*redisSpec.deltaLimit.cpus[index],

                    dedicatedVolumeSize: redisSpec.dedicatedVolumeSize[index] +
                        n*redisSpec.deltaDedicatedVolumeSize[index]
                };
            };
            const {cpus, memory, memoryLimit, cpusLimit, dedicatedVolumeSize} =
                  verticalRedisScaling();

            return {
                plan,
                numberOfCAs,
                redis: {
                    cpus,
                    memory,
                    memoryLimit,
                    cpusLimit,
                    poolKey: redisSpec.nodePool.poolKey[index],
                    poolValue: redisSpec.nodePool.poolValue[index],
                    isGvisor: redisSpec.nodePool.isGvisor[index],
                    dedicatedVolumeSize
                },
                app: {
                    cpus: appSpec.request.cpus[index],
                    memory: appSpec.request.memory[index],
                    memoryLimit: appSpec.limit.memory[index],
                    cpusLimit: appSpec.limit.cpus[index],
                    storage: appSpec.request.storage[index],
                    storageLimit: appSpec.limit.storage[index],
                    egressLimit: appSpec.limit.egress[index],
                    poolKey: appSpec.nodePool.poolKey[index],
                    poolValue: appSpec.nodePool.poolValue[index],
                    isGvisor: appSpec.nodePool.isGvisor[index],
                    isIncubator,
                    instances
                    // `props` delayed until computing delta
                }
            };
        }
    };

    /**
     *
     * @param {deploymentPropsType} currentProps
     * @param {patchedPropsType} newProps
     *
     * @return {patchedPropsType}
     */
    const deltaResources = function(currentProps, newProps) {
        const similar = (target, source, props) =>
            !props.some((x) => typeof source[x] !== 'undefined' ?
                (target[x] !== source[x]) :
                false);

        similar(currentProps.redis, newProps.redis, CHANGEABLE_REDIS_KEYS) &&
            delete newProps.redis;

        if (newProps.redis) {
            const dedicatedVolumeSize = newProps.redis.dedicatedVolumeSize;
            // Disks cannot shrink in gcloud
            if ((typeof dedicatedVolumeSize === 'number') &&
                (dedicatedVolumeSize <
                 currentProps.redis.dedicatedVolumeSize)) {
                delete newProps.redis.dedicatedVolumeSize;
                $._ && $._.$.log && $._.$.log.warn(
                    `Disk cannot shrink to ${dedicatedVolumeSize}`
                );
            }
        }

        similar(currentProps.app, newProps.app, CHANGEABLE_APP_PROCESS_KEYS) &&
            delete newProps.app;

        return newProps;
    };

    /**
     * Generate new props.
     *
     * @param {deploymentPropsType} currentProps
     * @param {patchedPropsType} newProps
     *
     * @return {deploymentPropsType}
     */
    const genProps = function(currentProps, newProps) {
        const updateImpl = (target, source, props) => {
            source && props.forEach((x) => {
                if (typeof source[x] !== 'undefined') {
                    target[x] = source[x];
                }
            });
        };
        const clone = myUtils.deepClone(currentProps);
        clone.plan = newProps.plan;
        clone.numberOfCAs = newProps.numberOfCAs;
        updateImpl(clone.redis, newProps.redis, CHANGEABLE_REDIS_KEYS);
        updateImpl(clone.app, newProps.app, CHANGEABLE_APP_PROCESS_KEYS);
        clone.app.props = JSON.stringify(clone);
        !newProps.redis && delete clone.redis;
        !newProps.redis && !newProps.app && delete clone.app;
        return clone;
    };

    /**
     * Get patches to flex resources for an existing app.
     *
     *
     * @param {updateOptionsType} updateOptions The arguments to create
     * patches.
     *
     * @return {deploymentPropsType} The patch to flex resources or null if no
     * change needed.
     */
    that.updateProps = function(updateOptions) {
        const currentProps = updateOptions.currentProps;
        const appProps = currentProps.app;
        const upgrading = appProps.isIncubator &&
            isIncubatorUpgrade(updateOptions);

        /*
         *  Three steps:
         *
         * 1. Compute new resources     (updateOptionsType->patchedPropsType)
         * 2. Find delta with existing ones (patchedPropsType->patchedPropsType)
         * 3. Generate new props (patchedPropsType->deploymentPropsType)
         */

        const newProps = computeResources(updateOptions, upgrading);
        const deltaProps = deltaResources(currentProps, newProps);
        return genProps(currentProps, deltaProps);
    };

    return that;
};
