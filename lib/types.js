'use strict';

const assert = require('assert');

/**
 * @global
 * @typedef {Object | Array | string | number | null | boolean} jsonType
 *
 */


/*  Specs are created from a JSON description.*/

/**
 * @global
 * @typedef {Object} resourcesType
 * @property {Array.<number>=} cpus The compute resource available in virtual
 * cores. The array has three entries: first, trusted app, second, untrusted
 * within the incubation period, and third, untrusted and not in incubation.
 * @property {Array.<number>=} memory The memory resource available in
 * megabytes. See `cpus` for the array description.
 * @property {Array.<number>=} storage The ephemeral storage in megabytes. See
 * `cpus` for the array description.
 * @property {Array.<number>=} egress The maximum egress bandwith in megabytes
 * per second. See `cpus` for the array description.
 */

/**
 * @global
 * @typedef {Object} poolType
 * @property {Array.<string>} poolKey The key to select a node pool. See
 * `cpus` for the array description.
 * @property {Array.<string>} poolValue The value to select a node pool. See
 * `cpus` for the array description.
 * @property {Array.<boolean>} isGvisor Whether the node pool enables gvisor.
 * See `cpus` for the array description.
 */

/**
 * @global
 * @typedef {Object} redisSpecType
 * @property {string} templateFile The mustache template to patch.
 * @property {string} k8SNamespace The namespace for the service.
 * @property {string} image The docker image for Redis.
 * @property {poolType} nodePool The node pool.
 * @property {resourcesType} request The resources requested.
 * @property {resourcesType} limit A hard limit on the resources consumed.
 * Limits are only active if `isUntrusted` is true.
 * @property {number} updateRatio Update resources every `updateRatio`
 * incremental number of app processes.
 * @property {resourcesType} deltaRequest Incremental resources requested per
 * extra `updateRatio` processes.
 * @property {resourcesType} deltaLimit Incremental hard limit on the resources
 * consumed per extra `updateRatio` processes.
 * @property {Array.<number>} dedicatedVolumeSize Size in gigabytes of the
 *dedicated volume. See `cpus` for the array description.
 * @property {Array.<number>} deltaDedicatedVolumeSize Incremental size
 * increase in gigabytes of the dedicated volume per extra  `updateRatio` app
 * processes.See `cpus` for the array description.
 * @property {number} maxNFSInstances The maximum number of app instances
 * before we create a dedicated volume.
 *
 */

/**
 * @global
 * @typedef {Object} appSpecType
 * @property {string} templateFile The mustache template to patch.
 * @property {string} k8SNamespace The namespace for the service.
 * @property {poolType} nodePool The node pool.
 * @property {resourcesType} request The resources requested.
 * @property {resourcesType} limit A hard limit on the resources consumed.
 * @property {number} maxInstances The maximum number of app processes.
 * @property {Array.<jsonType>} args The arguments to the node.js process.
 *
 */

/**
 * @global
 * @typedef {Object} deploymentSpecType
 * @property {boolean} useK8SConfig Whether to use the k8s config file from the
 * kubelet client.
 * @property {number} refreshInterval Time between Kubernetes status polling in
 * msec.
 * @property {string} appSuffix The suffix for the app name, e.g., `cafjs.com`.
 * @property {boolean} isUntrusted Whether the deployment should be trusted.
 * @property {boolean} isIncubator Whether the deployment is in incubation mode.
 * @property {boolean} isDeployer Whether it is the `Deployer` app.
 * @property {boolean} isPeople Whether it is the `People` app.
 * @property {boolean} isAccounts Whether it is the `Accounts` app.
 * @property {Object<string, number>} plans The threshold in CAs for an extra
 * application process.
 * @property {number} ratioIncubator The portion of a full process assigned to
 * incubator mode.
 * @property {redisSpecType} redis The spec for the redis backend.
 * @property {appSpecType} app The spec for the app processes.
 *
 */

/*  Props customize the mustache templates.*/

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
 * @property {Array.<envPropertiesType>=} envProps A list of properties to set.
 *
 */

/**
 * @global
 * @typedef {Object} deploymentPropsType
 * @property {string} version The schema version for this metadata.
 * @property {appPropsType=} app Props for the nodejs app.
 * @property {redisPropsType=} redis Props for the redis backend.
 * @property {number} numberOfCAs The number of active CAs.
 * @property {string} plan The strategy to flex resources.
 */

/* Patched props are a subset of props that can be modified. */

/**
 * @global
 * @typedef {Object} appPatchedPropsType
 * @property {number} cpus In millicores.
 * @property {number} memory In megabytes.
 * @property {number} memoryLimit In megabytes.
 * @property {number} cpusLimit In millicores.
 * @property {number} storage  In megabytes.
 * @property {number} storageLimit In megabytes.
 * @property {number} egressLimit In megabytes/sec
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {boolean} isGvisor Whether to use a sandbox.
 * @property {boolean} isIncubator
 * @property {number} instances The number of processes.
 * @property {string=} props JSON serialized metadata of current deployment
 */

/**
 * @global
 * @typedef {Object} redisPatchedPropsType
 * @property {number} cpus In millicores.
 * @property {number} memory In megabytes.
 * @property {number} memoryLimit In megabytes.
 * @property {number} cpusLimit In millicores.
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {boolean} isGvisor Whether to use a sandbox.
 * @property {number} dedicatedVolumeSize The disk size in gigabytes.
 */


/**
 * @global
 * @typedef {Object} patchedPropsType
 * @property {string} plan The strategy to flex resources.
 * @property {number} numberOfCAs The number of active CAs.
 * @property {appPatchedPropsType=} app Props for the nodejs app.
 * @property {redisPatchedPropsType=} redis Props for the redis backend.
 */

/* Options are derived from user inputs */

/**
 * @global
 * @typedef {Object} updateOptionsType
 * @property {string} id
 * @property {string} plan The strategy to flex resources.
 * @property {number} numberOfCAs The number of active CAs.
 * @property {deploymentPropsType} currentProps The deployment
 * properties currently used.
 */

/**
 * @global
 * @typedef {Object} cdnType
 * @property {string} appCDN The URL from the CDN provider.
 * @property {string} appSubdirCDN A subdirectory adding versioning to
 * help cache invalidation.
 */

/**
 * @global
 * @typedef {Object} envPropertiesType
 * @property {string} key The key of the environment property.
 * @property {string} value The value of the environment property.
 */

/**
 * @global
 * @typedef {Object} createOptionsType
 * @property {string} id
 * @property {string} plan The strategy to flex resources.
 * @property {string} image The docker image for the app.
 * @property {string=} timestamp An optional tag to identify a previous redis
 * service instance. This allows redis to restart from a previous state.
 * @property {boolean} isUntrusted
 * @property {cdnType=} cdn  An optional CDN
 * configuration that overrides the one in the image.
 * @property {Array.<envPropertiesType>=} envProps A list of properties to set.
 */

/**
 * @global
 * @typedef {Object} deleteOptionsType
 * @property {string} id
 * @property {boolean} keepData Do not delete the volume.
 * @property {string} timestamp  Over time multiple instances of a service have
 * the same `id`, and by adding `timestamp` we can identify their volumes.
 */

/**
 * @global
 * @typedef {Object} statType
 * @property {string} id An identifier for the app
 * @property {number} tasksRunning The number of app processes running.
 * @property {deploymentPropsType} props The properties of the app.
 * @property {string} version An instance version for this app.
 */


const checkBasicType = (type, spec, name, opt) => {
    const res = spec[name];
    if ((opt && res) || !opt) {
        assert.equal(typeof res, type, `'${name}' is not a ${type}`);
    }
};

const checkArray = (type, spec, name, opt, size) => {
    const res = spec[name];
    if ((opt && res) || !opt) {
        assert.ok(Array.isArray(res), `'${name}' is not an array`);
        if (typeof size === 'number') {
            assert.equal(res.length, size, `Wrong length for array '${name}'`);
        }
        res.forEach((x) => {
            if (type === 'json') {
                try {
                    JSON.stringify(x);
                } catch (ex) {
                    throw new Error(`'${name}' is not an array of JSON types`);
                }
            } else {
                assert.equal(typeof x, type,
                             `'${name}' is not an array of ${type}`);
            }
        });
    }
};

const checkArrayJSON = (spec, name, opt, size) =>
    checkArray('json', spec, name, opt, size);

const checkArrayString = (spec, name, opt, size) =>
    checkArray('string', spec, name, opt, size);

const checkArrayBoolean = (spec, name, opt, size) =>
    checkArray('boolean', spec, name, opt, size);

const checkArrayNumber = (spec, name, opt, size) =>
    checkArray('number', spec, name, opt, size);

const checkString = (spec, name, opt) => checkBasicType('string', spec, name,
                                                        opt);
const checkNumber = (spec, name, opt) => checkBasicType('number', spec, name,
                                                        opt);
const checkBoolean = (spec, name, opt) => checkBasicType('boolean', spec, name,
                                                         opt);
const checkObject = (spec, name, opt) => checkBasicType('object', spec, name,
                                                        opt);

const checkResources = function(spec) {
    checkArrayNumber(spec, 'cpus', false, 3);
    checkArrayNumber(spec, 'memory', false, 3);
    checkArrayNumber(spec, 'storage', true, 3);
    checkArrayNumber(spec, 'egress', true, 3);
};

const checkPool = function(spec) {
    checkArrayString(spec, 'poolKey');
    checkArrayString(spec, 'poolValue');
    checkArrayBoolean(spec, 'isGvisor');
};


const checkRedisSpec = function(spec) {
    checkString(spec, 'templateFile');
    checkString(spec, 'k8SNamespace');
    checkString(spec, 'image');
    checkPool(spec.nodePool);
    checkResources(spec.request);
    checkResources(spec.limit);
    checkResources(spec.deltaRequest);
    checkResources(spec.deltaLimit);
    checkNumber(spec, 'updateRatio');
    checkArrayNumber(spec, 'dedicatedVolumeSize');
    checkArrayNumber(spec, 'deltaDedicatedVolumeSize');
    checkNumber(spec, 'maxNFSInstances');
};

const checkAppSpec = function(spec) {
    checkString(spec, 'templateFile');
    checkString(spec, 'k8SNamespace');
    checkPool(spec.nodePool);
    checkResources(spec.request);
    checkResources(spec.limit);
    checkNumber(spec, 'maxInstances');
    checkArrayJSON(spec, 'args');
};

exports.checkSpec = function(spec) {
    checkBoolean(spec, 'useK8SConfig');
    checkNumber(spec, 'refreshInterval');
    checkString(spec, 'appSuffix');
    checkBoolean(spec, 'isUntrusted');
    checkBoolean(spec, 'isIncubator');
    checkBoolean(spec, 'isDeployer');
    checkBoolean(spec, 'isPeople');
    checkBoolean(spec, 'isAccounts');
    checkObject(spec, 'plans');
    checkNumber(spec, 'ratioIncubator');
    checkRedisSpec(spec.redis);
    checkAppSpec(spec.app);
};
