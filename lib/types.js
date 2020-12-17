'use strict';

const assert = require('assert');

/**
 * @global
 * @typedef {Object | Array | string | number | null | boolean} jsonType
 *
 */


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
 * @property {Array.<number>=} egress The maximum egress bandwith in megabits
 * per second. See `cpus` for the array description.
 */

/**
 * @global
 * @typedef {Object} poolType
 * @property {Array.<string>} poolKey The key to select a node pool. See
 * `cpus` for the array description.
 * @property {Array.<string>} poolValue The value to select a node pool. See
 * `cpus` for the array description.
 * @property {Array.<boolean>} gvisor Whether the node pool enables gvisor. See
 * `cpus` for the array description.
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
 * @property {resourcesType} deltaRequest Incremental resources requested per
 * extra app process.
 * @property {resourcesType} deltaLimit Incremental hard limit on the resources
 * consumed per extra app process.
 * @property {number} updateRatio Update resources every `updateRatio`
 * incremental number of app processes.
 * @property {boolean} isDedicatedVolume True if it has exclusive access to a
 * persistent volume.
 * @property {number} dedicatedVolumeSize Size in gigabytes of the dedicated
 * volume.
 * @property {number} deltaDedicatedVolumeSize Incremental size increase in
 * gigabytes of the dedicated volume per extra app process.
 *
 */

/**
 * @global
 * @typedef {Object} appSpecType
 * @property {string} templateFile The mustache template to patch.
 * @property {string} k8SNamespace The namespace for the service.
 * @property {poolType} nodePool The node pool.
 * @property {string} appSuffix The suffix for the app name, e.g., `cafjs.com`.
 * @property {Array.<string>} services List of dependent services. Currently
 * only `redis` supported.
 * @property {resourcesType} request The resources requested.
 * @property {resourcesType} limit A hard limit on the resources consumed.
 * @property {resourcesType} incubatorRequest The resources requested during
 * incubation.
 * @property {resourcesType} incubatorLimit A hard limit on the resources
 * consumed during incubation.
 * @property {number} instances The number of app processes.
 * @property {number} maxInstances The maximum number of app processes.
 * @property {Array.<jsonType>} args The arguments to the node.js process.
 *
 */

/**
 * @global
 * @typedef {Object} deploymentSpecType
 * @property {boolean} isUntrusted Whether the deployment should be trusted.
 * @property {boolean} isIncubator Whether the deployment is in incubation.
 * @property {boolean} isDeployer Whether it is the deployer app.
 * @property {boolean} isPeople Whether it is the people app.
 * @property {boolean} isAccounts Whether it is the accounts app.
 * @property {boolean} isCDN Whether to change CDN settings.
 * @property {string=} appCDN The base url for a CDN service.
 * @property {string=} appSubdirCDN A CDN subdir for cache invalidation.
 * @property {redisSpecType} redis The spec for the redis backend.
 * @property {appSpecType} app The spec for the app processes.
 *
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

const checkArrayJSON =  (spec, name, opt, size) =>
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

const checkResources = function(spec) {
    checkArrayNumber(spec, 'cpus', false, 3);
    checkArrayNumber(spec, 'memory', false, 3);
    checkArrayNumber(spec, 'storage', false, 3);
    checkArrayNumber(spec, 'egress', false, 3);
};

const checkPool = function(spec) {
    checkArrayString(spec, 'poolKey');
    checkArrayString(spec, 'poolValue');
    checkArrayBoolean(spec, 'gvisor');
};


const checkRedisSpec = function(spec) {
    checkString(spec, 'templateFile');
    checkString(spec, 'k8SNamespace');
    checkString(spec, 'image');
    checkPool(spec, 'nodePool');
    checkResources(spec, 'request');
    checkResources(spec, 'limit');
    checkResources(spec, 'deltaRequest');
    checkResources(spec, 'deltaLimit');
    checkNumber(spec, 'updateRatio');
    checkBoolean(spec, 'isDedicatedVolume');
    checkNumber(spec, 'dedicatedVolumeSize');
    checkNumber(spec, 'deltaDedicatedVolumeSize');

};

const checkAppSpec = function(spec) {
    checkString(spec, 'templateFile');
    checkString(spec, 'k8SNamespace');
    checkPool(spec, 'nodePool');
    checkString(spec, 'appSuffix');
    checkArrayString(spec, 'services');
    checkResources(spec, 'request');
    checkResources(spec, 'limit');
    checkResources(spec, 'incubatorRequest');
    checkResources(spec, 'incubatorLimit');
    checkNumber(spec, 'instances');
    checkNumber(spec, 'maxInstances');
    checkArrayJSON(spec, 'args');
};

exports.checkSpec = function(spec) {
    checkBoolean(spec, 'isUntrusted');
    checkBoolean(spec, 'isIncubator');
    checkBoolean(spec, 'isDeployer');
    checkBoolean(spec, 'isPeople');
    checkBoolean(spec, 'isAccounts');
    checkBoolean(spec, 'isCDN');
    checkString(spec, 'appCDN', true);
    checkString(spec, 'appSubdirCDN', true);
    checkRedisSpec(spec.redis);
    checkAppSpec(spec.app);
};
