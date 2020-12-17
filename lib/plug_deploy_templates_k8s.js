'use strict';
const assert = require('assert');

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;

/**
 * @global
 * @typedef {Object} redisPropsType
 * @property {string} id
 * @property {string} k8SNamespace
 * @property {string} touch Modify to trigger reset.
 * @property {string} timestamp Over time multiple instances of a service have
 * the same `id`, and by adding `timestamp` we can identify their volumes.
 * @property {string} image
 * @property {string} cpus
 * @property {string} memory
 * @property {string} memoryLimit
 * @property {string} cpusLimit
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {string=} dedicatedVolumeSize The disk size in gigabytes.
 * @property {boolean} isDedicatedVolume Whether to use dedicated or nfs.
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
 * @property {string} touch Modify to trigger reset. // duplicate
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
 * @property {string} cpus
 * @property {string} memory
 * @property {string} memoryLimit
 * @property {string} cpusLimit
 * @property {string} storage
 * @property {string} storageLimit
 * @property {string} egressLimit
 * @property {string} poolKey
 * @property {string} poolValue
 * @property {boolean} isCDN Whether to change current CDN settings.
 * @property {string=} appCDN The base url for a CDN service.
 * @property {string=} appSubdirCDN A CDN subdir for cache invalidation.
 * @property {string} props JSON serialized metadata of current deployment.
 *
 *
 */

exports.newTemplates = function(spec) {
    const that = {};

    const redisT = path.resolve(__dirname, spec.redis.templateFile);
    that.redisTemplate = fs.readFileSync(redisT, {encoding: 'utf8'});
    mustache.parse(that.redisTemplate);

    const appT = path.resolve(__dirname, spec.app.templateFile);
    that.appTemplate = fs.readFileSync(appT, {encoding: 'utf8'});
    mustache.parse(that.appTemplate);


    return that;
};
const processCommonSpec = function (spec, errMsg) {
    spec = myUtils.deepClone(spec);

    spec.memory = '' + spec.memory + 'M'; // megabytes


    spec.memoryLimit = '' + spec.memoryLimit + 'M'; // megabytes

    return spec;
};

exports.processAppSpec = function(appSpec) {
    appSpec = processCommonSpec(appSpec, "'spec.env.app.");

    appSpec.args = JSON.stringify(appSpec.args);


    // ephemeral storage request/limit only for the app not for redis

    appSpec.storage = '' + appSpec.storage + 'M'; // megabytes

    appSpec.storageLimit = '' + appSpec.storageLimit + 'M'; // megabytes

    return appSpec;
};
