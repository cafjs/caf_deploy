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
 * Manages deployed apps  by this CA.
 *
 *
 *
 * The name of this component in a ca.json description should be 'deploy'.
 *
 * @name caf_deploy/plug_ca_deploy
 * @namespace
 * @augments caf_components/gen_plug_ca
 *
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugCA = caf_comp.gen_plug_ca;
var json_rpc = require('caf_transport').json_rpc;
var deploy_util = require('./plug_deploy_util');

/**
 * Factory method for an app deployment plug for this CA.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {

        var that = genPlugCA.constructor($, spec);

        var caOwner = json_rpc.splitName($.ca.__ca_getName__())[0];

       // transactional ops
        var target = {
            createAppImpl: function(appOptions, cb0) {
                $._.$.deploy.__ca_createApp__(appOptions, cb0);
            },
            deleteAppImpl: function(appOptions, cb0) {
                $._.$.deploy.__ca_deleteApp__(appOptions, cb0);
            },
            restartAppImpl: function(appOptions, cb0) {
                $._.$.deploy.__ca_restartApp__(appOptions, cb0);
            },
            updateAppImpl: function(appOptions, cb0) {
                $._.$.deploy.__ca_updateApp__(appOptions, cb0);
            }
        };

        that.__ca_setLogActionsTarget__(target);

        that.createApp =  function(appLocalName, image, options) {
            var id = json_rpc.joinName(caOwner, appLocalName);
            var appOptions = {
                id : id,
                image: image,
                appPublisher: caOwner,
                appLocalName: appLocalName
            };
            appOptions.instances = (options.instances ? options.instances : 1);
            appOptions.args = (Array.isArray(options.args) ? options.args : []);
            that.__ca_lazyApply__("createAppImpl", [appOptions]);
            return id;
        };

        that.deleteApp =  function(id) {
            that.__ca_lazyApply__("deleteAppImpl", [{id: id}]);
        };

        that.restartApp =  function(id) {
            that.__ca_lazyApply__("restartAppImpl", [{id: id}]);
        };

        that.flexApp =  function(id, instances) {
            var split = json_rpc.splitName(id);
            assert(split[0] === caOwner);
            var deployed = $._.$.deploy.__ca_statApp__(id);
            var deployUtil = deploy_util.newUtil();
            var redisPort = deployUtil.extractRedisPort(deployed);
            var image = deployed.container.docker.image;
            assert(image);
            var appOptions = {
                id: id,
                instances: instances,
                image: image,
                appPublisher: caOwner,
                appLocalName: split[1],
                args: deployed.args,
                redisPort: redisPort
            };
            that.__ca_lazyApply__("updateAppImpl", [appOptions]);
        };

        that.getAllRedisPorts = function() {
            return $._.$.deploy.__ca_getAllRedisPorts__();
        };

        that.statApps = function(ids) {
            return ids.map(function(x) {
                return $._.$.deploy.__ca_statApp__(x);
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
