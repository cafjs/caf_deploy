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
 * Proxy that enables a CA to deploy other applications.
 *
 * @name caf_deploy/proxy_deploy
 * @namespace
 * @augments gen_proxy
 */

var caf = require('caf_core');
var genProxy = caf.gen_proxy;

/*
 * Factory method to create a proxy to a CF deployment service.
 * 
 */
exports.newInstance = function(context, spec, secrets, cb) {

    var that = genProxy.constructor(spec, secrets);
    var deploy = secrets.deploy_ca;

    /**
     * Deploys (or updates if already deployed) an application in CF.
     * 
     * @param name A name for this app.
     * @param fileName A local file name with a compressed tar file of
     * this app and dependencies (tgz using npm conventions of
     * using `package` as top level dir).
     * 
     * @name caf_deploy/proxy_deploy#deployApp
     * @function 
     */
    that.deployApp = function(name, fileName) {
        deploy.deployApp(name, fileName);
    };


    /**
     * Deletes deployed app.
     * 
     * @param name Name of deployed app.
     * 
     * @name caf_deploy/proxy_deploy#deleteApp
     * @function  
     */
    that.deleteApp = function(name) {
        deploy.deleteApp(name);
    };

    /**
     * Refreshes the status of the deployed apps.
     * 
     * This is done asynchronously, and the framework will send this
     *  CA a message invoking method `updatedInfoMethod` when there is
     *  some update news.
     * 
     *  The actual CA method named in argument `updatedInfoMethod`
     * should have signature `function(caf.cb)`
     *
     * Typically,  this method will call `getAppsInfo` to
     * find out what has changed.
     * 
     * @param {string} updatedInfoMethod The name of CA method that should
     * be invoked when new info is available on deployed apps.
     *  
     * @name caf_deploy/proxy_deploy#refreshInfo
     * @function  
     *
     */
    that.refreshInfo = function(updatedInfoMethod) {
        deploy.refreshInfo(updatedInfoMethod);
    };

    /**
     * Returns status of deployed apps.
     *
     * @return {{<the app name>: {state: string, instances: number}}}
     * The cached status of the deployed apps.
     * 
     * @name caf_deploy/proxy_deploy#getAppsInfo
     * @function  
     */
    that.getAppsInfo = function() {
        return deploy.getAppsInfo();
    };

    Object.freeze(that);
    cb(null, that);
};
