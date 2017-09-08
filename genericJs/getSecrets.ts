const optionalRequire = (require('optional-require') as optionalRequire)(require);
import { STORED_DATA_FILE } from '../appLibs/constants/constants';
import { Helpers } from '../window/helpers'
import fs = require('fs');

function exists(path: string): Promise<boolean> {
	return new Promise((resolve) => {
		fs.exists(STORED_DATA_FILE, (exists) => {
			resolve(exists);
		});
	});
}

function readFile(path: string): Promise<string> {
	return new Promise((resolve) => {
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				resolve(null);
			} else {
				resolve(data);
			}
		});
	});
}

async function storeSecrets(secrets: SecretsMap): Promise<void> {
	return new Promise<void>((resolve) => {
		fs.writeFile(STORED_DATA_FILE, JSON.stringify(secrets), (err) => {
			if (err) {
				require('electron').remote.dialog.showMessageBox({
					message: 'Could not store secrets',
					type: 'info'
				}, () => {
					resolve(null);	
				});
			} else {
				resolve(null);
			}
		});
	});
}

const el = Helpers.el;

async function askForSecrets<T extends keyof SecretsMap>(key: T): Promise<SecretsMap[T]> {
	return new Promise<SecretsMap[T]>(async (resolve) => {
		const promptContainer = el('div', 'promptContainer', [
			el('div', 'promptTitle', 'Please fill in these values'),
			el('div', 'promptInputs', [
				el('div', 'promptAPIKey', [
					el('div', 'promptAPIKeyText', 'Youtube API Key:'),
					el('input', 'promptAPIKeyInput', [], {
						props: {
							placeholder: 'Youtube API Key'
						}
					})
				]),
				el('div', 'promptFirebaseConfig', [
					el('div', 'promptFirebaseConfigText', 'Firebase Config:'),
					el('textarea', 'promptFirebaseConfigInput', [], {
						props: {
							placeholder: '{ apiKey: "...", ... }',
							rows: '8'
						}
					})
				])
			]),
			el('div', 'promptButtons', [
				el('div', 'promptOkButton', 'OK', {
					listeners: {
						'click': async () => {
							const [ apiKey, firebaseConfig ] = [
								(promptContainer.querySelector('.promptAPIKeyInput') as HTMLInputElement).value,
								(promptContainer.querySelector('.promptFirebaseConfigInput') as HTMLTextAreaElement).value,
							];

							const secrets = {
								firebaseConfig: eval(`let x = ${firebaseConfig}; x;`),
								googleAPIKey: apiKey
							};
							storeSecrets(secrets);

							resolve(secrets[key]);

							await Helpers.wait(200);
							promptContainer.classList.remove('visible');
							await Helpers.wait(500);

							promptContainer.remove();
						}
					}
				})
			])
		]);
		document.body.appendChild(promptContainer);
		promptContainer.classList.add('visible');
	});
}

export async function getSecret<T extends keyof SecretsMap>(key: T): Promise<SecretsMap[T]> {
	const tryRequire = optionalRequire<SecretsMap>('./secrets') || null;
	if (tryRequire) {
		return tryRequire[key];
	} else {
		//No secrets file present, query stored data
		const fileExists = await exists(STORED_DATA_FILE);
		if (fileExists) {
			const file = await readFile(STORED_DATA_FILE);
			let parsedFile: SecretsMap = null;
			if (file && (parsedFile = JSON.parse(file))) {
				return parsedFile[key];
			}
		}
	}
	return await askForSecrets(key);
}

export type getSecret = <T extends keyof SecretsMap>(key: T) => Promise<SecretsMap[T]>

export type SecretsMap = {
	firebaseConfig: FireBaseConfig;
	googleAPIKey: GoogleAPIKey;
}

export type FireBaseConfig = {
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;	
}

export type GoogleAPIKey = string;