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
 * Main package module.
 *
 * @module caf_deploy/main
 *
 */

/* eslint-disable max-len */

/**
 * @external caf_components/gen_plug_ca
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug_ca.html}
 */

/**
 * @external caf_components/gen_plug
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug.html}
 */

/**
 * @external caf_components/gen_proxy
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_proxy.html}
 */

/* eslint-enable max-len */

exports.plug = require('./plug_deploy.js');
exports.plug_ca = require('./plug_ca_deploy.js');
exports.proxy = require('./proxy_deploy.js');
