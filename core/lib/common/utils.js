/*
 * Copyright 2017 balena
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

require('any-promise/register/bluebird');

const isEmpty = require('lodash/isEmpty');
const forEach = require('lodash/forEach');
const noop = require('lodash/noop');
const assignIn = require('lodash/assignIn');
const assign = require('lodash/assign');
const replace = require('lodash/replace');
const trim = require('lodash/trim');

const Bluebird = require('bluebird');
const exec = Bluebird.promisify(require('child_process').exec);
const { fork } = require('child_process');
const { fs } = require('mz');
const inquirer = require('inquirer');
const keygen = Bluebird.promisify(require('ssh-keygen'));
const path = require('path');
const repl = require('repl');
const SSH = require('node-ssh');

const printInstructionsSet = (title, instructions) => {
  if (isEmpty(instructions)) {
    return;
  }

  console.log(`==== ${title}`);

  forEach(instructions, instruction => {
    console.log(`- ${instruction}`);
  });
};

const getSSHClientDisposer = config => {
  const createSSHClient = conf => {
    return Bluebird.resolve(
      new SSH().connect(
        assignIn(
          {
            agent: process.env.SSH_AUTH_SOCK
          },
          conf
        )
      )
    );
  };

  return createSSHClient(config).disposer(client => {
    client.dispose();
  });
};

module.exports = {
  executeCommandOverSSH: async (command, config) => {
    return Bluebird.using(getSSHClientDisposer(config), client => {
      return client
        .exec(command, [], {
          stream: 'both'
        })
        .catch(x => {
          console.log(x);
          throw x;
        });
    });
  },
  waitUntil: async (promise, _times = 20, _delay = 30000) => {
    // Here is where we will store the failure of the promise if any
    let error;

    const _waitUntil = async timesR => {
      if (timesR === 0) {
        throw new Error(`Condition ${promise} timed out`);
      }

      try {
        const result = await promise();

        error = null;

        if (result) {
          return;
        }
      } catch (err) {
        error = err;
      }

      await Bluebird.delay(_delay);

      return _waitUntil(timesR - 1);
    };

    try {
      await _waitUntil(_times);
    } catch (err) {
      if (error != null) {
        throw error;
      }

      throw err;
    }
  },
  runManualTestCase: async testCase => {
    // Some padding space to make it easier to the eye
    await Bluebird.delay(50);
    printInstructionsSet('PREPARE', testCase.prepare);
    printInstructionsSet('DO', testCase.do);
    printInstructionsSet('ASSERT', testCase.assert);
    printInstructionsSet('CLEANUP', testCase.cleanup);

    return (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'result',
        message: 'Did the test pass?',
        default: false
      }
    ])).result;
  },
  getDeviceUptime: async connection => {
    const start = process.hrtime()[0];
    const uptime = await connection("cut -d ' ' -f 1 /proc/uptime");

    return Number(uptime) - (start - process.hrtime()[0]);
  },
  clearHandlers: events => {
    forEach(events, event => {
      process.on(event, noop);
    });
  },
  repl: (context, options) => {
    return new Bluebird((resolve, _reject) => {
      const prompt = repl.start({
        prompt: `${options.name} > `,
        useGlobal: true,
        terminal: true
      });

      assign(prompt.context, context);

      prompt.on('exit', () => {
        resolve();
      });
    });
  },
  searchAndReplace: async (filePath, regex, replacer) => {
    const content = await fs.readFile(filePath, 'utf-8');
    return fs.writeFile(filePath, replace(content, regex, replacer), 'utf-8');
  },
  createSSHKey: keyPath => {
    return fs
      .access(path.dirname(keyPath))
      .then(async () => {
        const keys = await keygen({
          location: keyPath
        });
        await exec(`ssh-add ${keyPath}`);
        return keys;
      })
      .get('pubKey')
      .then(trim);
  },
  promiseStream: stream => {
    return new Bluebird((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  },
  forkCode: (code, opts) => {
    return fork(path.join(__dirname, 'vm.js'), [code], opts);
  }
};