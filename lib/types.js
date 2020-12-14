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
