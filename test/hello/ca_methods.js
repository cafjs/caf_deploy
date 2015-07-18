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
    "__ca_init__" : function(cb) {
        this.$.log.debug("++++++++++++++++Calling init");
        this.state.pulses = 0;
        this.state.apps = {};
        cb(null);
    },
    "__ca_resume__" : function(cp, cb) {
        this.$.log.debug("++++++++++++++++Calling resume: pulses=" +
                         this.state.pulses);

        cb(null);
    },
    "__ca_pulse__" : function(cb) {
        var self = this;
        this.state.pulses = this.state.pulses + 1;
        this.$.log.debug('<<< Calling Pulse>>>' + this.state.pulses);
        var ids = Object.keys(this.state.apps)
                .map(function(x) {
                    return  self.state.apps[x];
                });
        var all = this.$.deploy.statApps(ids);
        this.$.log.debug('Apps:' + JSON.stringify(all));
        cb(null);
    },
    statApps: function(cb) {
        var self = this;
        var ids = Object.keys(this.state.apps)
                .map(function(x) {
                    return  self.state.apps[x];
                });
        var all = this.$.deploy.statApps(ids);
        cb(null, all);
    },
    getAllRedisPorts: function(cb) {
        cb(null, this.$.deploy.getAllRedisPorts());
    },
    addApp: function(appLocalName, image, options, cb) {
        var id = this.$.deploy.createApp(appLocalName, image, options);
        this.state.apps[appLocalName] = id;
        cb(null, id);
    },
    deleteApp: function(appLocalName, cb) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            this.$.deploy.deleteApp(id);
        }
        cb(null);
    },

    restartApp: function(appLocalName, cb) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            this.$.deploy.restartApp(id);
        }
        cb(null);
    },

    flexApp:  function(appLocalName, instances, cb) {
        var id =  this.state.apps[appLocalName];
        if (id) {
            this.$.deploy.flexApp(id, instances);
        }
        cb(null);
    }
};
