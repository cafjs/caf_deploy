'use strict';
const assert = require('assert');

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;

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

    that.createProps = function() {
        // redis
        const spec = myUtils.clone(redisSpec);
        spec.id = appProps.id;
        spec.timestamp = (new Date()).getTime().toString();
        spec.touch = (new Date()).toISOString();
        spec.isUntrusted = appProps.isUntrusted;

        // apps
        const pec = myUtils.clone(appSpec);
        myUtils.mixin(spec, appProps);
        spec.redisNamespace = redisSpec.k8SNamespace;
        spec.touch = (new Date()).toISOString();


    };

    that.createPatches = function() {
        //app
        const replica = {
            spec: {
                replicas: appProps.instances
            }
        };


    };

    return that;
};
const processCommonSpec = function (spec, errMsg) {
    spec = myUtils.deepClone(spec);


    return spec;
};

exports.processAppSpec = function(appSpec) {
    appSpec = processCommonSpec(appSpec, "'spec.env.app.");

    appSpec.args = JSON.stringify(appSpec.args);



    return appSpec;
};
