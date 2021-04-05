# Quick start guide for leviathan

This is a quick start guide for using the leviathan remote testing framework, with a testbot. As a prerequisite for this guide, you will have to prepare your testbot, using the following [guide](https://github.com/balena-io/testbot-hardware/blob/master/documentation/getting-started.md).

## Run your first test
Once you have set up a testbot you can run your first tests.

- Ensure you have `docker` installed on your machine.
- Clone and setup the [leviathan](https://github.com/balena-io/leviathan) with instructions mentioned in the [README](https://github.com/balena-os/leviathan/blob/master/README.md).
- Navigate to the `workspace` directory in the project using `cd workspace/`
- Create a `config.js` file in the `workspace` directory using the following template:
  
```js
module.exports = {
	deviceType: '<DUT device type, for example "raspberrypi3-64">',
	suite: `${__dirname}/../suites/os`,
	config: {
		networkWired: false,
		networkWireless: true,
		downloadType: 'local',
		interactiveTests: false,
	},
	image: `${__dirname}/my-image.img.gz`,
	workers: ['http://<short UUID of your testbot in balenaCloud>.local'],
};
```

- Run the `run-tests.sh` script from `workspace` directory and watch the logs. You should get a report about executing the OS testing suite on your DUT.

```shell script
./run-tests.sh
```

The last line in the `config.json` assumes you are on the same network with the testbot. Please enable the public URL in balenaCloud and use it instead if it's not the case. Note, that on some Linux distributions, the container will not be able to resolve `.local` addresses. If you face this problem until we find a proper solution, you can replace this address with your device's local IP (copy it from the device summary page on balenaCloud).

Information on Config properties:
- `networkWired` and `networkWireless` properties for configuration of Network Manager. Used to configure the right mode of connection for the DUT to connect to the Access Point (AP) created by the Testbot.
- `downloadType` configures where the OS will be staged for upload to Testbot. `local` is the only available value for it at the moment.
- `interactiveTests` If it's a semi-auto test or not.

The OS image should be kept under the `workspace` directory (the path after `__dirname` in the config is a path relative to the workspace dir).

Do make sure if you are using a Raspberrypi3 64-bit image, then the `deviceType` property needs to be `raspberrypi3-64`

## Writing new tests in Leviathan

The leviathan framework runs 'suites'. A suite is a collection of tests and a configuration for the environment. The current suite that runs on meta-balena & balena-raspberrypi PRs can be found [here on GitHub](https://github.com/balena-os/meta-balena/tree/master/tests/suites/os).

Leviathan comprises a client, which sends test suites, and a testbot, which will listen for and execute suites. The client is a container that you can run on your laptop, or within an automated workflow to send tests to a testbot.

As you can see from the linked meta-balena directory, we can set up a directory containing a test suite as follows:
- `tests` - Folder containing actual tests
- `conf.js` - File assigning configuration options
- `package.json` - File containing the node dependencies to install for the test suite
- `suite.js` - File where you can select what tests are run as part of the suite, and define your setup code to run before the tests start.

Inside the tests folder, you can add the actual test logic. The recommended approach is to add a folder for each test (with an appropriate name), and inside, keep any assets associated with the test. The test can be written within a file called `index.js`. The tests folder will look something like:

- tests
    - test-1
        - assets
        - index.js - the test is written in this file
    - test-2
        - assets
        - index.js
    - .
    - .
    - etc 


## How do I add a new test?

To add a new test, you could either create a new suite, or a add a test to an existing suite.
For reference, an old PR [adding a test](https://github.com/balena-os/leviathan/commit/0ec26632881ef2c262e67d30ebccaaf0611b01ad#diff-df7b8717d54947445c5900174e15e5cf) to the OS test suite in Leviathan.

### Adding a test/tests to an existing suite

1. Navigate to the suite folder where the test needs to be added (for example https://github.com/balena-os/meta-balena/tree/master/tests/suites/os). 
2. Navigate to the `/tests` directory inside that suite.
3. Create a new directory `<MY_NEw_TEST>`, with an appropriate name for your test.
4. Inside this new directory, create an `index.js` file
5. Inside `index.js`, test logic lives (details about writing the test logic are explained in the next section)
6. Going back to the suite directory, navigate to `suite.js`
7. Inside `suite.js`, towards the botton of the file, there will be an array named `tests`, add your new test to it like this:
```js
tests: [
	'./tests/fingerprint',
	'./tests/led',
	'./tests/config-json',
	'./tests/connectivity',
	'./tests/<MY_NEw_TEST>',
	],
```
8. Ensure that any new dependencies used in your test are added to the `package.json`


### Writing the test logic

Tests must be written in node, and are ingested by a framework called [node-tap](https://node-tap.org/docs/api/asserts/). 
To write a new test, inside `tests/<MY_NEw_TEST>/index.js` , we can use the following template (note that this file can contain a set of tests - you just have to have multiple objects in the `tests` array!)

Each test is an asychnronous function, assigned to the `run` attribute of a test.

```js
'use strict';

module.exports = {
	title: 'Your name for the collection of tests in this file goes here',
	tests: [
		{
			title: 'The test name goes here',
			run: async function(test) { //put your test within an async function!
				// Here you can write the test logic for example
				// let result = 4 + 4  // this is equal to 8

				// Here you can use an assertion to determine the result of the test for example:
				// test.is(result, 4, 'Message'); // the .is assertion checks that result === 4 as it isn't, this test will fail!
				// test.is(result, 8, 'Message'); // the .is assertion checks that result === 8 as it is, this test will pass!
				// the supported assertions can be seen here: https://node-tap.org/docs/api/asserts/
			},
		},
	],
};
```

More examples of test logic can be seen here: https://github.com/balena-os/leviathan/blob/master/suites/os/tests/fingerprint/index.js for a very simple test, and here: https://github.com/balena-os/leviathan/blob/master/suites/os/tests/connectivity.js for more complex tests. 

One of the most useful methods to control the DUT, is to use:
```js
await this.context.get().worker.executeCommandInHostOS('command line command',this.context.get().link);
```
This will execute the given command in the HostOS of the DUT. 

This section will be expanded as we discover more...

### Writing a new suite

A new test suite can be created if desired. For unmanaged OS tests, I would recommend just adding tests to the existing OS test suite - however, if a new suite is desired, one can be created using the folder structure described at the start of this document. 

## Tips

### Worker
The worker class can be used to control the testbot hardware. In the `suite.js` file, you can create an instance of it, and then use its methods to flash the DUT, power it on/off, and set up a network AP for the DUT to connect to. 

```js		
const Worker = this.require('common/worker');
this.suite.context.set({
	worker: new Worker(DEVICE_TYPE_SLUG, this.getLogger()), // Add an instance of worker to the context
});
const Worker = this.require('common/worker');
const worker = new Worker(DEVICE_TYPE_SLUG, this.getLogger())
```

The `this.getLogger()` method gets the logger that can be used from any suite.
Once you have an instance of the`Worker class, you can use its methods like this:

```js
const Worker = this.require('common/worker');
const worker = new Worker(DEVICE_TYPE_SLUG, this.getLogger())

await worker.network(network: {
	ssid: SSID,
	psk: PASSWORD,
	nat: true,
})
await worker.off() // turn off the power to the DUT
await worker.flash() // flash the DUT
await worker.on()

```

Another helpful method of the worker is `executeCommandInHostOs`, which lets you execute command line operations in the host OS of the DUT.
Assuming that the DUT is connected to the AP of the testbot:
```js
const Worker = this.require('common/worker');
const worker = new Worker(DEVICE_TYPE_SLUG, this.getLogger())
await worker.executeCommandInHostOS('cat /etc/hostname', `${UUID}.local`);
```

### Context
The context class lets you share instances of objects across different tests. For example, if we made an instance of the worker class in a suite, as above, other tests would not be able to see it. An instance of the context class has a `set()` and a `get()` method, to both add or fetch objects from the context. An example can be seen below:

```js
const Worker = this.require('common/worker');

this.suite.context.set({
	worker: new Worker(DEVICE_TYPE_SLUG, this.getLogger()), // Add an instance of worker to the context
});

await this.context.get().worker.flash() // flash the DUT with the worker instance thats in the context
```

The context can be used to share anything between tests - device uuids, app names and so on.

### OS helpers
The `BalenaOS` helper class can be used to configure and unpack the OS image that you will use in the test. This allows you to inject config options and network credentials into your image.

```js
const network_conf = {
	ssid: SSID,
	psk: PASSWORD,
	nat: true,
}

const os = new BalenaOS(
	{
		deviceType: DEVICE_TYPE_SLUG,
		network: network_conf,
		configJson: {
			uuid: UUID,
			persistentLogging: true,
		},
	},
	this.getLogger(),
);

await os.fetch({
	type: this.suite.options.balenaOS.download.type,
	version: this.suite.options.balenaOS.download.version,
	releaseInfo: this.suite.options.balenaOS.releaseInfo,
});

await os.configure()

```

Alternatively, you can use the CLI to perform these functions - the CLI is imported in the testing environment:
```js
await exec(`balena login --token ${API_KEY}`);

await exec(
	`balena os configure ${PATH_TO_IMAGE}-a ${
	} --config-network wifi --config-wifi-key ${
		PASSWORD
	}  --config-wifi-ssid ${
		PASSWORD
	}  `,
); 
```

### Using balena sdk
Balena SDK is imported into the testing environment by default, so you can create an instance of the SDK and use it to manipulate the device or applications from within tests (in this exampe using context so we can use it in all tests): 

```js
this.suite.context.set({
	balena: {
		sdk: getSdk({
			apiUrl: 'https://api.balena-cloud.com/',
		}),
		sshKey: { label: LABEL},
	}
});

await this.context.get().balena.sdk.auth.loginWithToken(TOKEN);
await this.context.get().balena.sdk.models.application.create({
	name: APP_NAME,
	deviceType: DEVICE_TYPE_SLUG,
	organization: ORG,
})
```

### Suite node dependencies
Each suite also has its own `package.json` that can be used to list dependencies for any tests in that suite, if those packages aren'y already present within the testing environment.

### Teardowns
You can register functions to be carried out upon "teardown" of the suite or test. These will execute when the test ends, regardless of passing or failing:

```js
this.suite.teardown.register(() => {
	this.log('Worker teardown');
	return this.context.get().worker.teardown();
});
```

If registered in the suite, this will be carried out upon the suite (the collection of tests) ending. You can also add individual teardowns within tests, that will execute when the individual test has ended. In this example here, within the test, we create an applciation, and after the test, we wish to remove that application:

```js
module.exports = {
	title: 'Example',
		tests: [
			{
				title: 'Move device to another application',
				run: async function(test) {
					// create an app
					await this.context.get().balena.sdk.models.application.create({
						name: APP,
						deviceType: DEVICE_TYPE,
						organization: ORG,
					});
					// Register a teardown that will remove the test when the test ends
					this.teardown.register(() => {
						return this.context.get().balena.sdk.models.application.remove(APP);
					});

					// THE REST OF THE TEST CODE
				}
			}
		]
}
```

### What should go in the suite.js of a suite
The recommended pattern is to put the code that gets the device into the state ready for the tests, into the suite. 
Usually, this will include:
- creating an instance of the worker class
- configuring the OS image with the correct configuration and network settings
- setting up the network of the testbot (using `Worker.network()`)
- flashing the DUT (using `Worker.flash()`)
- Checking that the device is online
- listing the tests
