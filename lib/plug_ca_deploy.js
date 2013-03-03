/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

/**
 * Handles deploying/updating apps  for one CA. Remembers the apps deployed by
 *  this CA but it does not
 * try to redeploy applications after migration or failure. It
 * participates in the (message) transaction avoiding deployments if there are
 * other failures.
 *
 *
 * The name of this component in a ca.json description should be deploy_ca.
 * 
 * @name caf_deploy/plug_ca_deploy
 * @namespace
 * @augments gen_transactional
 *
 */
var caf = require('caf_core');
var genTransactional = caf.gen_transactional;
var json_rpc = caf.json_rpc;
var myutils = caf.myutils;

var deployAppOp = function(name, fileName) {
    return {'op' : 'deployApp', 'name' : name, 'fileName': fileName};

};

var deleteAppOp = function(name) {
     return {'op' : 'deleteApp', 'name' : name};

};

var refreshInfoOp = function(updatedInfoMethod) {
     return {'op' : 'refreshInfo', 'updatedInfoMethod' : updatedInfoMethod};
};

exports.newInstance = function(context, spec, secrets, cb) {

    var $ = context;
    var logActions = [];

    var that = genTransactional.constructor(spec, secrets);
    // hostnames cannot have underscores, only hyphens
    var prefix = secrets.myId.replace(/_/g,'-')  + '-';

    var appsInfo = {};

    var wrapName = function(name) {
        if (name && (name.indexOf(prefix) === 0)) {
            return name;
        } else {
            return prefix + name;
        }
    };

    var unwrapName = function(name) {
        if (name && (name.indexOf(prefix) === 0)) {
            return name.slice(prefix.length);
        } else {
            return name;
        }
    };

    that.deployApp = function(name, fileName) {
        logActions.push(deployAppOp(name, fileName));
    };

    that.deleteApp = function(name) {
        logActions.push(deleteAppOp(name));
    };

    that.refreshInfo = function(updatedInfoMethod) {
        logActions.push(refreshInfoOp(updatedInfoMethod));
    };

    that.getAppsInfo = function() {
        return Object.freeze(myutils.clone(appsInfo));
    };

    var newNotifyF = function(methodName) {
        // type of newAppsInfo {<app_name> :  {status: <string>, instances:..}}
        return function(newAppsInfo, cb0) {
            var cb1 = function(err, data) {
                if (err) {
                    cb0(err);
                } else {
                    if (json_rpc.isSystemError(data)) {
                        /*
                         * CA shutdown. Cleanup cached resource.
                         */
                        cb0(data);
                    } else {
                        // ignore application errors
                        cb0(err, data);
                    }
                }
            };
            for (var appName in newAppsInfo) {
               appsInfo[unwrapName(appName)] = newAppsInfo[appName];
            }

            // signature is function(cb)
            var notifMsg = json_rpc.request(json_rpc.SYSTEM_TOKEN,
                                            secrets.myId,
                                            json_rpc.SYSTEM_FROM,
                                            json_rpc.SYSTEM_SESSION_ID,
                                            methodName);
            secrets.inqMgr && secrets.inqMgr.process(notifMsg, cb1);
        };
    };

    var replayLog = function() {
        logActions.forEach(
            function(action) {
                switch (action.op) {
                case 'deployApp' :
                    appsInfo[action.name] =
                        appsInfo[action.name] || {};
                    $.deploy_mux.deployApp(secrets.myId, wrapName(action.name),
                                           action.fileName);
                    break;
                case 'deleteApp':
                    delete appsInfo[action.name];
                    $.deploy_mux.deleteApp(secrets.myId, wrapName(action.name));
                    break;
                case 'refreshInfo':
                    var notifyF = newNotifyF(action.updatedInfoMethod);
                    $.deploy_mux.refreshInfo(secrets.myId, notifyF);
                    break;
                default:
                    throw new Error('CA Deploy : invalid log action ' +
                                    action.op);
                }
            });
        logActions = [];
    };


    // Framework methods

    that.__ca_init__ = function(cb0) {
        logActions = [];
        cb0(null);
    };

    that.__ca_resume__ = function(cp, cb0) {
        cp = cp || {};
        appsInfo = cp.appsInfo || {};
        logActions = cp.logActions || [];
        replayLog();
        cb0(null);
    };

    that.__ca_begin__ = function(msg, cb0) {
        logActions = [];
        cb0(null);
    };

    that.__ca_prepare__ = function(cb0) {
        cb0(null, JSON.stringify({'appsInfo' : appsInfo,
                                  'logActions' : logActions}));
    };

    that.__ca_commit__ = function(cb0) {
        replayLog();
        cb0(null);
    };

    that.__ca_abort__ = function(cb0) {
        logActions = [];
        cb0(null);
    };

    cb(null, that);

};
