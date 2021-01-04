#!/usr/bin/env node
'use strict';
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const assert = require('assert');

const load = function($, spec, name, modules, cb) {
    modules = modules || [];
    modules.push(module);

    caf_comp.load($, spec, name, modules, cb);
};


const usage = function() {
    console.log('Usage: k8s_deploy.js create|flex|stat|delete|restart <args>');
    process.exit(1);
};

const that = {

    async create(deployer, args) {
        if (args.length < 4) {
            console.log('Usage: k8s_deploy.js create <id> <image>' +
                        ' <isUntrusted> <plan> [<timestamp>]');
            process.exit(1);
        }
        const id = args.shift();
        const image = args.shift();
        const isUntrusted = (args.shift() === 'true');
        const plan = args.shift();
        const timestamp = args.shift();
        const options = {id, image, isUntrusted, plan};
        if (timestamp) {
            options.timestamp = timestamp;
        }
        await deployer.__ca_createApp__(options);
        console.log('OK');
        deployer.__ca_shutdown__(null, function() {});
    },

    async flex(deployer, args) {
        if (args.length !== 3) {
            console.log('Usage: k8s_deploy.js flex <id> <plan> <#CAs>');
            process.exit(1);
        }
        const id = args.shift();
        const plan = args.shift();
        const numberOfCAs = parseInt(args.shift());
        await deployer.__ca_statAll__();
        const deployed = deployer.__ca_statApp__(id);
        assert(deployed, 'Unknown app');
        const currentProps = deployed.props;

        await deployer.__ca_updateApp__({id, plan, numberOfCAs, currentProps});
        console.log('OK');
        deployer.__ca_shutdown__(null, function() {});
    },

    async stat(deployer, args) {
        if (args.length !== 0) {
            console.log('Usage: k8s_deploy.js stat');
            process.exit(1);
        }
        const data = await deployer.__ca_statAll__();
        console.log(JSON.stringify(data));
        deployer.__ca_shutdown__(null, function() {});
    },

    async delete(deployer, args) {
        if (args.length !== 2) {
            console.log('Usage: k8s_deploy.js delete <id> <keepData>');
            process.exit(1);
        }
        const id = args.shift();
        const keepData = (args.shift() === 'true');
        await deployer.__ca_statAll__();
        const deployed = deployer.__ca_statApp__(id);
        if (!deployed || !deployed.props) {
            console.log('Missing app, forcing a delete');
            await deployer.__ca_deleteApp__({id, keepData});
        } else {
            const timestamp = deployed.props.redis.timestamp;
            await deployer.__ca_deleteApp__({id, timestamp, keepData});
        }
        console.log('OK');
        deployer.__ca_shutdown__(null, function() {});
    },

    async restart(deployer, args) {
        if (args.length !== 1) {
            console.log('Usage: k8s_deploy.js restart <id>');
            process.exit(1);
        }
        const id = args.shift();
        await deployer.__ca_restartApp__(id);
        console.log('OK');
        deployer.__ca_shutdown__(null, function() {});
    }
};

load(null, null, 'k8s_deploy.json', null, async function(err, $) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        process.exit(1);
    } else {
        const args = process.argv.slice(2);
        const command = args.shift();
        if (command && that[command]) {
            try {
                await that[command]($.deploy, args);
            } catch (error) {
                console.log(myUtils.errToPrettyStr(error));
                process.exit(1);
            }
        } else {
            usage();
        }
    }
});
