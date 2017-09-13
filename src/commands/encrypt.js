/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import readline from 'readline';
import fse from 'fs-extra';
import cryptoModule from '../utils/cryptoModule';
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';
import {
	ERROR_PASSPHRASE_VERIFICATION_FAIL,
	getPassphraseFromPrompt,
} from '../utils/input';

const ERROR_PREFIX = 'Could not encrypt: ';
const createErrorMessage = str => `${ERROR_PREFIX}${str}`;

const ERROR_MESSAGE_MISSING = createErrorMessage('No message was provided.');
const ERROR_PASSPHRASE_ENV_VARIABLE_NOT_SET = createErrorMessage('Passphrase environmental variable not set.');
const ERROR_FILE_DOES_NOT_EXIST = createErrorMessage('File does not exist.');
const ERROR_FILE_UNREADABLE = createErrorMessage('File could not be read.');

const messageOptionDescription = `
Specifies a source for the message you would like to encrypt. If a message is provided directly as an argument, this option will be ignored.
The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.

Examples:
- \`--message file:/path/to/my/message.txt\`
- \`--message stdin\`
`.trim();

const splitSource = (source) => {
	const delimiter = ':';
	const sourceParts = source.split(delimiter);
	return {
		sourceType: sourceParts[0],
		sourceIdentifier: sourceParts.slice(1).join(delimiter),
	};
};

const getStdIn = ({ getMessage, getPassphrase }) => new Promise((resolve) => {
	if (!getMessage && !getPassphrase) return resolve({});

	const lines = [];
	const rl = readline.createInterface({ input: process.stdin });

	const handleLine = line => (
		getMessage
			? lines.push(line)
			: resolve({ passphrase: line }) || rl.close()
	);
	const handleClose = () => {
		const messageLines = getPassphrase ? lines.slice(1) : lines;
		return resolve({
			message: getMessage ? messageLines.join('\n') : null,
			passphrase: getPassphrase ? lines[0] : null,
		});
	};

	return rl
		.on('line', handleLine)
		.on('close', handleClose);
});

const getMessageFromFile = async path => fse.readFileSync(path, 'utf8');

const getMessage = async (arg, source, { message }) => {
	if (arg) return arg;
	if (typeof message === 'string') return message;
	if (!source) {
		throw new Error(ERROR_MESSAGE_MISSING);
	}

	const { sourceType, sourceIdentifier } = splitSource(source);

	if (sourceType !== 'file') {
		throw new Error('Unknown message source type: Must be one of `file`, or `stdin`.');
	}

	return getMessageFromFile(sourceIdentifier);
};

const getPassphraseFromEnvVariable = (key) => {
	const passphrase = process.env[key];
	if (!passphrase) {
		throw new Error(ERROR_PASSPHRASE_ENV_VARIABLE_NOT_SET);
	}
	return passphrase;
};

const getPassphraseFromFile = path => new Promise((resolve, reject) => {
	const stream = fse.createReadStream(path);
	const handleReadError = (error) => {
		stream.close();
		reject(error);
	};
	const handleLine = (line) => {
		stream.close();
		resolve(line);
	};

	stream.on('error', handleReadError);

	readline.createInterface({ input: stream })
		.on('error', handleReadError)
		.on('line', handleLine);
});

const getPassphraseFromSource = async (source, { passphrase }) => {
	if (passphrase) return passphrase;

	const { sourceType, sourceIdentifier } = splitSource(source);

	switch (sourceType) {
	case 'env':
		return getPassphraseFromEnvVariable(sourceIdentifier);
	case 'file':
		return getPassphraseFromFile(sourceIdentifier);
	case 'pass':
		return sourceIdentifier;
	default:
		throw new Error('Unknown passphrase source type: Must be one of `env`, `file`, or `stdin`. Leave blank for prompt.');
	}
};

const handleMessageAndPassphrase = (vorpal, recipient) => ([passphrase, message]) => {
	const passphraseString = passphrase.toString();
	return cryptoModule.encrypt(message, passphraseString, recipient);
};

const handleError = (error) => {
	const { name, message } = error;

	if (message === ERROR_PASSPHRASE_VERIFICATION_FAIL) {
		return { error: createErrorMessage(message) };
	}
	if (message.match(/ENOENT/)) {
		return { error: ERROR_FILE_DOES_NOT_EXIST };
	}
	if (message.match(/EACCES/)) {
		return { error: ERROR_FILE_UNREADABLE };
	}

	return { error: message || name };
};

const encrypt = vorpal => ({ message, recipient, options }) => {
	const messageSource = options.message;
	const passphraseSource = options.passphrase;
	const getPassphrase = passphraseSource
		? getPassphraseFromSource.bind(null, passphraseSource)
		: getPassphraseFromPrompt.bind(null, vorpal);

	return getStdIn({
		getPassphrase: passphraseSource === 'stdin',
		getMessage: messageSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(stdIn),
			getMessage(message, messageSource, stdIn),
		]))
		.then(handleMessageAndPassphrase(vorpal, recipient))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <recipient> [message]')
		.option('-m, --message <source>', messageOptionDescription)
		.option(...commonOptions.passphrase)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description('Encrypt a message for a given recipient public key using your secret passphrase. \n E.g. encrypt "Hello world" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;
