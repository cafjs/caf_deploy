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

'use strict';

/**
 * Proxy that enables a CA to deploy other applications.
 *
 * @module caf_deploy/proxy_deploy
 * @augments external:caf_components/gen_proxy
 */
var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var genProxy = caf_comp.gen_proxy;

exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * Creates a new app.
     *
     * The type `caf.createAppOptions` is:
     *
     *     {args: Array.<caf.json>, instances: number, memory: number}
     *
     * @param {string} appLocalName A name for this app that will be qualified
     *  by the owner of this CA, i.e., 'owner-appLocalName'.
     * @param {string} image A Docker image containing the app.
     * @param {caf.createAppOptions} options Extra options to configure this
     * app. Memory is in megabytes.
     *
     * @return {string} An id to identify this app instance.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias createApp
     */
    that.createApp = function(appLocalName, image, options) {
        return $._.createApp(appLocalName, image, options);
    };


    /**
     * Deletes deployed app.
     *
     * @param {string} id An instance identifier.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias deleteApp
     */
    that.deleteApp = function(id) {
        $._.deleteApp(id);
    };


    /**
     * Restarts the app, using a newer image if available.
     *
     * @param {string} id An instance identifier.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias restartApp
     */
    that.restartApp = function(id) {
        $._.restartApp(id);
    };

    /**
     * Changes the number of instances for this app.
     *
     * A zero value suspends the app without losing its state.
     *
     * @param {string} id An instance identifier.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias flexApp
     */
    that.flexApp = function(id, numInstances) {
        $._.flexApp(id, numInstances);
    };

    /**
     * Returns the most recent, locally-cached information about a collection of
     *  apps.
     *
     *
     * @param {Array<string>} ids An array of app identifiers.
     *
     * @return {Array.<Object>} Status info for these apps. `null` element in
     * the array means missing app.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias statApps
     */
    that.statApps = function(ids) {
        return $._.statApps(ids);
    };

    /**
     * Returns all the Redis ports being used by deployed applications.
     *
     *  This is useful for management applications that need to have a global
     *  view of what has been deployed.
     *
     * This is a privileged operation that needs to be explicitly enabled with
     * `spec.env.listAllRedisPorts=true` in `framework.json`.
     *
     * @return {{appName: port} Map of ports used by Redis instances.
     *
     * @memberof! module:caf_deploy/proxy_deploy#
     * @alias getAllRedisPorts
     */
    that.getAllRedisPorts = function() {
        return $._.getAllRedisPorts();
    };

    Object.freeze(that);
    cb(null, that);
};
