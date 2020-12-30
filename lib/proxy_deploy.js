// Modifications copyright 2020 Caf.js Labs and contributors
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
const caf_core = require('caf_core');
const caf_comp = caf_core.caf_components;
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {
    try {
        const that = genProxy.create($, spec);

        /**
         * Sets the name of the method in this CA that will process reply
         *  messages.
         *
         * To ignore replies, just set it to `null`.
         *
         * The type of the method should be `async function(requestId, error,
         * data)`
         *
         * where:
         *
         *  *  `requestId`: is an unique identifier to match the request.
         *  *  `error`: a deployment error.
         *  *  `data`: a deployment response.
         *
         * @param {string| null} methodName The name of this CA's method that
         *  process reply messages.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias setHandleReplyMethod
         *
         */
        that.setHandleReplyMethod = function(methodName) {
            $._.setHandleReplyMethod(methodName);
        };

        /**
         * Creates a new app.
         *
         * @param {string} appLocalName A name for this app that will be
         * qualified by the owner of this CA, i.e., 'owner-appLocalName'.
         * @param {string} image A Docker image containing the app.
         * @param {boolean} isUntrusted  Whether it is not a core app, i.e.,
         * not trusted by the  system.
         * @param {string} plan The strategy for flexing resources.
         * @param {{cdnType|null} cdn An override for the image CDN settings.
         * @param {string|null} timestamp An optional tag to recover state from
         * a previous service instance.
         *
         * @return {string} An id to identify this app instance.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias createApp
         */
        that.createApp = function(appLocalName, image, isUntrusted, plan,
                                  cdn, timestamp) {
            return $._.createApp(appLocalName, image, isUntrusted, plan, cdn,
                                 timestamp);
        };


        /**
         * Deletes the deployed app.
         *
         * @param {string} id An instance identifier.
         * @param {boolean} keepData Whether to keep the app state.
         * @return {string} A request identifier.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias deleteApp
         */
        that.deleteApp = function(id, keepData) {
            return $._.deleteApp(id, keepData);
        };


        /**
         * Restarts the app, using a newer image if available.
         *
         * @param {string} id An instance identifier.
         *
         * @return {string} A request identifier.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias restartApp
         */
        that.restartApp = function(id) {
            return $._.restartApp(id);
        };

        /**
         * Changes the number of instances for this app.
         *
         * A zero value suspends the app without losing its state.
         *
         * @param {string} id An instance identifier.
         * @param {string} plan The strategy for flexing resources.
         * @param {number} numberOfCAs The number of active CAs.
         *
         * @return {string} A request identifier.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias flexApp
         */
        that.flexApp = function(id, plan, numberOfCAs) {
            return $._.flexApp(id, plan, numberOfCAs);
        };

        /**
         * Returns the most recent, locally-cached information about a
         * collection of apps.
         *
         *
         * @param {Array<string>} ids An array of app identifiers.
         *
         * @return {Array.<Object>} Status info for these apps. `null` element
         * in the array means missing app.
         *
         * @memberof! module:caf_deploy/proxy_deploy#
         * @alias statApps
         */
        that.statApps = function(ids) {
            return $._.statApps(ids);
        };

        Object.freeze(that);
        return [null, that];
    } catch (err) {
        return [err];
    }
};
