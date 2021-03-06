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

const _ = require('lodash');
const Parser = require('tap-parser');
const Bluebird = require('bluebird');
const { Duplex } = require('stream');
const stringStream = require('string-to-stream');
const symbols = require('figures');
const indentString = require('indent-string');

const LF = require('os').EOL;

const wrapParser = tap => {
	const dup = Duplex();

	// eslint-disable-next-line no-underscore-dangle
	dup._read = () => {
		_.noop();
	};

	// eslint-disable-next-line no-underscore-dangle
	dup._write = (buf, enc, next) => {
		tap.write(buf);
		next();
	};

	dup.on('finish', () => {
		tap.end();
	});

	tap.on('assert', test => {
		dup.emit('test', test);
	});

	tap.on('complete', results => {
		dup.emit('complete', results);
	});

	return dup;
};

class Formatter {
	constructor(output) {
		this.output = output;
		this.output.push(`# Tests ${LF}`);

		this.output.on('test', test => {
			this.test(test);
		});

		this.output.on('complete', results => {
			this.summary(results);

			if (results.failures) {
				this.fail(results.failures);
			}
		});

		return this.output;
	}

	test(test) {
		this.output.push(test);
	}

	summary(summary) {
		this.output.push(summary);
	}

	fail(fail) {
		this.output.push(fail);
	}
}

class MarkdownFormatter extends Formatter {
	test(test) {
		this.output.push(
			` - ${test.ok ? symbols.tick : symbols.cross} ${test.name}${LF}`,
		);
	}

	summary(summary) {
		const output = [LF];
		output.push('# Summary');
		output.push(`- planned: ${summary.plan.end}`);
		output.push(`- pass: ${summary.pass}`);
		output.push(`- fail: ${summary.fail}`);
		this.output.push(output.join(LF));
	}

	fail(fail) {
		const indent = 4;
		const output = [LF];
		output.push('# Fails');

		fail.forEach(entry => {
			output.push(`## ${entry.name}`);
			output.push(indentString(`${symbols.cross} ${entry.name}`, indent));
			output.push(
				indentString(`${JSON.stringify(entry.diag, null, indent)}`, indent),
			);
		});

		this.output.push(output.join(LF));
	}
}

exports.markDownFormat = results => {
	return new Bluebird((resolve, reject) => {
		let output = '';
		const stream = stringStream(results).pipe(
			new MarkdownFormatter(wrapParser(new Parser())),
		);

		stream.on('data', data => {
			output += data.toString('utf8');
		});

		stream.on('error', error => {
			reject(error);
		});

		stream.on('finish', data => {
			resolve(output);
		});
	});
};
