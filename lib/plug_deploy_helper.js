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
 * Helper methods to deploy apps in Cloud Foundry.
 *
 */
var caf = require('caf_core');
var async = caf.async;
var fs = require('fs');
var zlib = require('zlib');
var tar = require('tar');
var path = require('path');
var rimraf = require('rimraf');

// for compatibility with npm tarballs all files have a common prefix dir
var DEFAULT_PREFIX = 'package';

var debugF = function($, msg, serviceName, cb) {
    return function(err, data) {
        if (err) {
            $.log.debug(msg + serviceName);
        }
        cb(err, data);
    };
};

var safeF = function(cb) {
    return function(err, data) {
        if (err || data) {
            cb(err, data);
        } else {
            // ensure it can be used in async.waterfall
            cb(err, true);
        }
    };
};

var deployServices = function($, vmc, services, appName, cb) {
    async.forEach(services, function(service, cb0) {
                      var serviceName = service + '_' + appName;
                      var msg = 'plug_deploy:cannot deploy service:';
                      vmc.createService(serviceName, service,
                                        debugF($, msg, serviceName, cb0));
                  }, safeF(cb));
};

var bindServices = function($, vmc, services, appName, cb) {
    async.forEach(services, function(service, cb0) {
                      var serviceName = service + '_' + appName;
                      var msg = 'plug_deploy:cannot bind service:';
                      vmc.bindService(serviceName, appName,
                                      debugF($, msg, serviceName, cb0));
                  }, safeF(cb));
};


var deleteServices = function($, vmc, services, appName, cb) {
    async.forEach(services, function(service, cb0) {
                      var serviceName = service + '_' + appName;
                      var msg = 'plug_deploy:cannot delete service:';
                      vmc.deleteService(serviceName,
                                        debugF($, msg, serviceName, cb0));
                  }, safeF(cb));
};

exports.infoApp = function($, vmc, appName, cb) {
    vmc.appInfo(appName, function(err, data) {
                    if (err) {
                        $.log.trace('Error:infoApp  for ' + appName +
                                    ' error:' + err);
                        cb(null, false);
                    } else {
                        if (data) {
                            $.log.trace('infoApp  for ' + appName +
                                       ' info:' + JSON.stringify(data));
                            cb(null, data);
                        } else {
                            cb(null, false);
                        }
                    }
                });
};

exports.deleteApp = function($, vmc, appName, services, cb) {
    async.series([
                     function(cb0) {
                         vmc.deleteApp(appName, cb0);
                     },
                     function(cb0) {
                         deleteServices($, vmc, services, appName, cb0);
                     }
                 ], safeF(cb));
};

exports.deployApp = function($, vmc, appName, appDir, manifest, services, cb) {
    async.series([
                     function(cb0) {
                         vmc.push(appName, appDir, manifest, cb0);
                     },
                     function(cb0) {
                         deployServices($, vmc, services, appName, cb0);
                     },
                     function(cb0) {
                         bindServices($, vmc, services, appName, cb0);
                     },
                     function(cb0) {
                         vmc.start(appName, cb0);
                     }
                 ], safeF(cb));
};

exports.expand = function(name, fileName, cb) {

    var appDir;
    var resultDir;
    fileName = path.resolve(fileName);

     async.waterfall([
                         function(cb0) {
                             // file exists?
                             var cb1 = function(exists) {
                                 if (exists) {
                                     cb0(null,
                                         path.join(path.dirname(fileName),
                                                   name));
                                 } else {
                                     cb0('file:' + fileName +
                                         ' does not exist');
                                 }
                             };
                             path.exists(fileName, cb1);
                         },
                         function(dir, cb0) {
                             // 'rm -rf' old dir, no error if it doesn't exist
                             appDir = dir;
                             rimraf(appDir, safeF(cb0));
                         },
                         function(ignore, cb0) {
                             fs.mkdir(appDir, '755', safeF(cb0));
                         },
                         function(ignore, cb0) {
                             var fileIn = fs.createReadStream(fileName);
                             var unzip = zlib.createGunzip();
                             fileIn = fileIn.pipe(unzip);
                             fileIn.on('error', function(err) {
                                           fileIn.removeAllListeners();
                                           cb0('cannot read file: ' + err);
                                       });
                             var fout = tar.Extract({ path: appDir});
                             fileIn.pipe(fout);
                             fout.on('error', function(err) {
                                         fileIn.removeAllListeners();
                                         fout.removeAllListeners();
                                         cb0('cannot extract' + err);
                                     });
                             fout.on('close', function() {
                                         fileIn.removeAllListeners();
                                         fout.removeAllListeners();
                                         cb0(null, null);
                                     });
                         },
                         function(ignore, cb0) {
                             fs.readdir(appDir, safeF(cb0));
                         },
                         function(dirFiles, cb0) {
                             if (dirFiles.length === 1) {
                                 resultDir =  path.join(appDir,dirFiles[0]);
                                 fs.stat(resultDir, cb0);
                             } else {
                                 cb0('>1 entries in top level dir' +
                                     JSON.stringify(dirFiles));
                             }
                         },
                         function(stats, cb0) {
                             if (stats.isDirectory()) {
                                 cb0(null, resultDir);
                             } else {
                                 cb0('top level entry not a dir');
                             }
                         }
                     ], safeF(cb));


};
