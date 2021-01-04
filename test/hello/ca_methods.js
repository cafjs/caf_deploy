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
"use strict";

exports.methods = {
    async __ca_init__() {
        this.$.log.debug("++++++++++++++++Calling init");
        this.state.pulses = 0;
        this.state.apps = {};
        this.state.pending = {};
        this.$.deploy.setHandleReplyMethod('handleReply');
        return [];
    },
    async __ca_resume__(cp) {
        this.$.log.debug("++++++++++++++++Calling resume: pulses=" +
                         this.state.pulses);

        return [];
    },
    async __ca_pulse__() {
        var self = this;
        this.state.pulses = this.state.pulses + 1;
        this.$.log.debug('<<< Calling Pulse>>>' + this.state.pulses);
        var ids = Object.keys(this.state.apps)
                .map(function(x) {
                    return  self.state.apps[x];
                });
        var all = this.$.deploy.statApps(ids);
        this.$.log.debug('Apps:' + JSON.stringify(all));
        this.$.log.debug('Pending:' + JSON.stringify(this.state.pending));
        return [];
    },
    async handleReply(reqId, err, data) {
        this.$.log.debug('Handle id:' + reqId + ' err:' + JSON.stringify(err) +
                         'data:' + JSON.stringify(data));
        delete this.state.pending[reqId];
        return [];
    },
    async statApps() {
        var self = this;
        var ids = Object.keys(this.state.apps)
                .map(function(x) {
                    return  self.state.apps[x];
                });
        var all = this.$.deploy.statApps(ids);
        return [null, all];
    },
    async addApp(appLocalName, image, isUntrusted, plan) {
        var id = this.$.deploy.createApp(appLocalName, image, isUntrusted,
                                         plan, null, null);
        this.state.apps[appLocalName] = id;
        this.state.pending[id] = (new Date()).getTime();
        return [null, id];
    },
    async deleteApp(appLocalName) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            var reqId = this.$.deploy.deleteApp(id, false);
            this.state.pending[reqId] = (new Date()).getTime();
        }
        return [];
    },

    async restartApp(appLocalName) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            var reqId = this.$.deploy.restartApp(id);
            this.state.pending[reqId] = (new Date()).getTime();
        }
        return [];
    },

    async flexApp(appLocalName, plan, numberOfCAs) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            var reqId = this.$.deploy.flexApp(id, plan, numberOfCAs);
            this.state.pending[reqId] = (new Date()).getTime();
        }
        return [];
    }
};
