'use strict';
const assert = require('assert');

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;

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
