/*
 * Copyright 2018 balena
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const { basename } = require('path');

// Device identification
function uid(a) {
  return a
    ? (a ^ (Math.random() * 16)).toString(16)
    : ([1e15] + 1e15).replace(/[01]/g, uid);
}
// Test identification
const id = `${Math.random()
  .toString(36)
  .substring(2, 10)}`;

module.exports = options => {
  return {
    id,
    balenaOS: {
      config: {
        uuid: uid(),
        pubKey: options.BALENA_TESTS_BALENAOS_SSH_PUBKEY,
      },
      download: {
        type: options.BALENA_TESTS_DOWNLOAD_TYPE,
        version: options.BALENA_TESTS_DOWNLOAD_VERSION,
        source: options.BALENA_TESTS_DOWNLOAD_SOURCE,
      },
      network: {
        wired: options.BALENA_TESTS_NETWORK_WIRED,
        wireless: options.BALENA_TESTS_NETWORK_WIRELESS,
      },
    },
    worker: {
      type: options.BALENA_TESTS_WORKER_TYPE,
    },
  };
};
