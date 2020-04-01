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
 * Deploys applications on Kubernetes on behalf of CAs.
 *
 *  The name of this component in framework.json should be 'deploy'
 *
 *
 * @module caf_deploy/plug_deploy
 * @augments external:caf_components/gen_plug
 */
const assert = require('assert');
const plug_deploy_kubernetes = require('./plug_deploy_kubernetes');

exports.newInstance = async function($, spec) {
    try {
        assert.equal(typeof spec.env.targetPaaS, 'string',
                     "'spec.env.targetPaaS' is not a string");
        if (spec.env.targetPaaS === 'kubernetes') {
            return plug_deploy_kubernetes.newInstance($, spec);
        } else {
            return [new Error('Invalid targetPaaS: ' + spec.env.targetPaaS)];
        }
    } catch (err) {
        return [err];
    }
};
