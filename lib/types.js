'use strict';

/**
 * @global
 * @typedef {Object | Array | string | number | null | boolean} jsonType
 *
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;

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
 * @property {string=} appCDN The base url for a CDN service.
 * @property {string=} appSubdirCDN A CDN subdir for cache invalidation.
 * @property {redisSpecType} redis The spec for the redis backend.
 * @property {appSpecType} app The spec for the app processes.
 *
 */


const processCommonSpec = function (spec, errMsg) {
    spec = myUtils.deepClone(spec);
    assert.equal(typeof spec.templateFile, 'string',
                 errMsg + "'templateFile' is not a string");

    spec.templateFile = path.resolve(__dirname, spec.templateFile);
    spec.template = fs.readFileSync(spec.templateFile, {encoding: 'utf8'});
    mustache.parse(spec.template);

    assert.equal(typeof spec.isUntrusted, 'boolean',
                 errMsg + "'isUntrusted' is not a boolean");
    assert.equal(typeof spec.k8SNamespace, 'string',
                 errMsg + "'k8SNamespace' is not a string");
    assert.equal(typeof spec.cpus, 'number',
                 errMsg + "'cpus' is not a number");
    assert.equal(typeof spec.memory, 'number',
                 errMsg + "'memory' is not a number");
    spec.memory = '' + spec.memory + 'M'; // megabytes

    assert.equal(typeof spec.cpusLimit, 'number',
                 errMsg + "'cpusLimit' is not a number");
    assert.equal(typeof spec.memoryLimit, 'number',
                 errMsg + "'memoryLimit' is not a number");
    spec.memoryLimit = '' + spec.memoryLimit + 'M'; // megabytes

    assert.equal(typeof spec.poolKey, 'string',
                 errMsg + "'poolKey' is not a string");
    assert.equal(typeof spec.poolValue, 'string',
                 errMsg + "'poolValue' is not a string");

    return spec;
};

exports.processAppSpec = function(appSpec) {
    appSpec = processCommonSpec(appSpec, "'spec.env.app.");

    assert.equal(typeof appSpec.instances, 'number',
                 "'spec.env.app.instances' is not a number");
    assert.ok(Array.isArray(appSpec.args),
              "'spec.env.app.args' is not an array");
    appSpec.args = JSON.stringify(appSpec.args);
    assert.equal(typeof appSpec.appSuffix, 'string',
                 "'spec.env.app.appSuffix' is not a string");
    assert.equal(typeof appSpec.isDeployer, 'boolean',
                 "'spec.env.app.isDeployer' is not a boolean");
    assert.equal(typeof appSpec.isAccounts, 'boolean',
                 "'spec.env.app.isAccounts' is not a boolean");
    assert.equal(typeof appSpec.isPeople, 'boolean',
                 "'spec.env.app.isPeople' is not a boolean");
    assert.equal(typeof appSpec.isUntrusted, 'boolean',
                 "'spec.env.app.isUntrusted' is not a boolean");
    // ephemeral storage request/limit only for the app not for redis
    assert.equal(typeof appSpec.storage, 'number',
                 "'spec.env.app.storage' is not a number");
    appSpec.storage = '' + appSpec.storage + 'M'; // megabytes
    assert.equal(typeof appSpec.storageLimit, 'number',
                 "'spec.env.app.storageLimit' is not a number");
    appSpec.storageLimit = '' + appSpec.storageLimit + 'M'; // megabytes

    return appSpec;
};

exports.processRedisSpec = function(redisSpec) {
    redisSpec = processCommonSpec(redisSpec, "'spec.env.redis.");
    assert.equal(typeof redisSpec.image, 'string',
                 "'spec.env.redis.image' is not a string");
    return redisSpec;
};
