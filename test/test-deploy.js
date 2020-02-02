"use strict"

var hello = require('./hello/main.js');
var app = hello;
var caf_core = require('caf_core');
var myUtils = caf_core.caf_components.myUtils;
var async = caf_core.async;
var cli = caf_core.caf_cli;

var CA_OWNER_1='deployother1';
var CA_LOCAL_NAME_1='bar1';
var FROM_1 =  CA_OWNER_1 + '-' + CA_LOCAL_NAME_1;

process.on('uncaughtException', function (err) {
               console.log("Uncaught Exception: " + err);
               console.log(myUtils.errToPrettyStr(err));
               process.exit(1);

});

module.exports = {
    setUp: function (cb) {
       var self = this;
        app.init( {name: 'top'}, 'framework.json', null,
                      function(err, $) {
                          if (err) {
                              console.log('setUP Error' + err);
                              console.log('setUP Error $' + $);
                              // ignore errors here, check in method
                              cb(null);
                          } else {
                              self.$ = $;
                              cb(err, $);
                          }
                      });
    },
    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            this.$.top.__ca_graceful_shutdown__(null, cb);
        }
    },

    oneDeploy: function(test) {
        var self = this;
        test.expect(4);

        var s1;
        var from1 = FROM_1;
        async.series(
            [
                function(cb) {
                    s1 = new cli.Session('ws://foo-xx.vcap.me:3000', from1, {
                        from : from1
                    });
                    s1.onopen = function() {
                        s1.addApp('myfoo1', 'gcr.io/cafjs-k8/root-helloworld', {}, cb);
                    };
                },
                function(cb) {
                    setTimeout(function() {
                        s1.statApps(function(err, data) {
                            test.ifError(err);
                            test.equal(data[0].tasksRunning, 1);
                            console.log(data);
                            cb(null);
                        });
                    }, 60000);
                },
                function(cb) {
                    setTimeout(function() {
                        s1.flexApp('myfoo1', 3, cb);
                    }, 30000);
                },
                function(cb) {
                    setTimeout(function() {
                        s1.restartApp('myfoo1', cb);
                    }, 15000);
                },
                function(cb) {
                    setTimeout(function() {
                        s1.deleteApp('myfoo1', cb);
                    }, 10000);
                },
                function(cb) {
                    s1.onclose = function(err) {
                        test.ifError(err);
                        cb(null, null);
                    };
                    s1.close();
                }
            ], function(err, res) {
                test.ifError(err);
                test.done();
            });
    }
};
