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

/*
 * Deploys applications on Cloud Foundry on behalf of CAs.
 *
 *  The name of this component in framework.json should be deploy_mux
 *
 * The properties in env:
 *  'target'  CF target installation, i.e., http://api.cf-external.com (also
 *  can be specifed as sys property CF_TARGET)
 *  'user'  CF user account (also can be specifed as sys
 * property CF_USER)
 *  'password' CF passwd for that account (also can be specifed as sys
 * property CF_PASSWORD)
 * 
 * @name caf_deploy/plug_deploy
 * @namespace
 * @augments gen_plug
 */
var caf = require('caf_core');
var genPlug = caf.gen_plug;
var async = caf.async;
var vmcjs = require('vmcjs');
var helper = require('./plug_deploy_helper');
var url = require('url');

/**
 * Factory method to create a deploy service connector.
 */
exports.newInstance = function(context, spec, secrets, cb) {

    var $ = context;
    var target = spec.env.target || process.env.CF_TARGET;
    var parsedTarget = url.parse(target);
    var rootTarget = parsedTarget.hostname.replace('api', '');
    var user = spec.env.user || process.env.CF_USER;
    var password = spec.env.password || process.env.CF_PASSWORD;

    var memory = spec.env.memory || 64;
    var instances = spec.env.instances || 1;
    var services = spec.env.services || [];

    var vmc = new vmcjs.VMC(target, user, password);
    var that = genPlug.constructor(spec, secrets);

    var newManifest = function(appName) {
        return {
            resources: {
                memory: memory
            },
            instances: instances,
            name: appName,
            staging: {
                framework: 'node',
                runtime: null
            },
            uris: [appName + rootTarget]
        };
    };

    that.deployApp = function(caId, name, fileName) {
        var dir;
        if (name.indexOf(caId + '_') === 0) {
            async.waterfall([
                                function(cb0) {
                                  //unzip, untar
                                    helper.expand(name, fileName, cb0);
                                },
                                function(appDir, cb0) {
                                    dir = appDir;
                                    //check if already deployed
                                    helper.infoApp($, vmc, name, cb0);
                                },
                                function(isUp, cb0) {
                                     // update or deploy
                                    if (isUp) {
                                        vmc.update(name, dir, cb0);
                                    } else {
                                        // deploy, bind services, and start
                                        helper.deployApp($, vmc, name, dir,
                                                         newManifest(name),
                                                         services, cb0);
                                    }
                                }
                            ],
                            function(err, data) {
                                if (err) {
                                    var msg = 'plug_deploy:err deploying app:';
                                    $.log.debug(msg + err);
                                }
                            });
        } else {
            $.log.debug('plug_deploy: deploying app of a different CA:' +
                        name + ' with CA Id:' + caId);
        }
    };

    that.deleteApp = function(caId, name) {
        if (name.indexOf(caId + '_') === 0) {
            helper.deleteApp($, vmc, name, services,
                             function(err, data) {
                                 if (err) {
                                     var msg = 'plug_deploy:err deleting app:';
                                     $.log.debug(msg + err);
                                 }
                             });
        } else {
            $.log.debug('plug_deploy: deleting app of a different CA:' +
                        name + ' with CA Id:' + caId);
        }
    };

    that.refreshInfo = function(caId, notifyF) {
        vmc.apps(function(err, apps) {
                     if (err) {
                         $.log.error('Cannot list apps error:' + err);
                     } else {
                         /*
                          * Type of apps is :
                          * [{name : <string>, instances: <integer>,
                          * runningInstances: <integer>,
                          * state:<string 'STOPPED' |'STARTED'  >,
                          *  uris :[<strings>], services :[<string>],..}]
                          *
                          */
                         var result = {};
                         for (var i = 0; i < apps.length; i++) {
                             var appName = apps[i].name;
                             if (appName.indexOf(caId + '_') === 0) {
                                 result[appName] = apps[i];
                             }
                         }
                         var cb0 = function(err, data) {
                             if (err) {
                                 $.log.debug('plug_deploy: cannot notify CA' +
                                             err);
                             }
                         };
                         notifyF(result, cb0);
                     }
                 });
    };

    $.log.debug('New deploy plug');

    var cb0 = function(err, data) {
      if (err) {
          $.log.error('Cannot login in CF with target:' + target + ' user:' +
                     user + ' passwd:' + password);
          cb(err);
      } else {
          cb(null, that);
      }
    };
    vmc.login(cb0);
 };
