#!/usr/bin/env node
'use strict';
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const myUtils = caf_comp.myUtils;
const json_rpc = caf_core.caf_transport.json_rpc;

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
        if (args.length !== 2) {
            console.log('Usage: k8s_deploy.js create <id> <image>');
            process.exit(1);
        }
        const id = args.shift();
        const image = args.shift();
        const split = json_rpc.splitName(id);
        try {
            await deployer.__ca_createApp__({
                id: id,
                image: image,
                appPublisher: split[0],
                appLocalName: split[1]
            });
        } catch (err) {
            if (err) {
                console.log(myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                console.log('OK');
                deployer.__ca_shutdown__(null, function() {});
            }
        };
    },

    flex: function(deployer, args) {
        if (args.length !== 2) {
            console.log('Usage: k8s_deploy.js flex <id> <#instances>');
            process.exit(1);
        }
        const id = args.shift();
        const instances = parseInt(args.shift());
        deployer.__ca_updateApp__({
            id: id,
            instances: instances
        }, function(err) {
            if (err) {
                console.log(myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                console.log('OK');
                deployer.__ca_shutdown__(null, function() {});
            }
        });
    },

    stat: function(deployer, args) {
        if (args.length !== 0) {
            console.log('Usage: k8s_deploy.js stat');
            process.exit(1);
        }
        deployer.__ca_statAll__(function(err, data) {
            if (err) {
                console.log(myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                console.log(JSON.stringify(data));
                deployer.__ca_shutdown__(null, function() {});
            }
        });
    },

    delete: function(deployer, args) {
        if (args.length !== 1) {
            console.log('Usage: k8s_deploy.js delete <id>');
            process.exit(1);
        }
        const id = args.shift();
        deployer.__ca_deleteApp__({id: id}, function(err) {
            if (err) {
                console.log(myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                console.log('OK');
                deployer.__ca_shutdown__(null, function() {});
            }
        });
    },

    restart: function(deployer, args) {
        if (args.length !== 1) {
            console.log('Usage: k8s_deploy.js restart <id>');
            process.exit(1);
        }
        const id = args.shift();
        deployer.__ca_restartApp__({id: id}, function(err) {
            if (err) {
                console.log(myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                console.log('OK');
                deployer.__ca_shutdown__(null, function() {});
            }
        });
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
                console.log(error.toString());
            }
        } else {
            usage();
        }
    }
});
