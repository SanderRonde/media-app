const optionalRequire = (require('optional-require') as optionalRequire)(require);
import { STORED_DATA_FILE } from '../renderer/constants/constants';
import { route } from '../renderer/routing/routing'
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

async function askForSecrets<T extends keyof SecretsMap>(key: T): Promise<SecretsMap[T]> {
	return new Promise<SecretsMap[T]>(async (resolve) => {
		const promptContainer = Helpers.el('div', 'promptContainer', [
			Helpers.el('div', 'promptTitle', 'Please fill in these values'),
			Helpers.el('div', 'promptInputs', [
				Helpers.el('div', 'promptAPIKey', [
					Helpers.el('div', 'promptAPIKeyText', 'Youtube API Key:'),
					Helpers.el('input', 'promptAPIKeyInput', [], {
						props: {
							placeholder: 'Youtube API Key'
						}
					})
				]),
				Helpers.el('div', 'promptFirebaseConfig', [
					Helpers.el('div', 'promptFirebaseConfigText', 'Firebase Config:'),
					Helpers.el('textarea', 'promptFirebaseConfigInput', [], {
						props: {
							placeholder: '{ apiKey: "...", ... }',
							rows: '8'
						}
					})
				])
			]),
			Helpers.el('div', 'promptButtons', [
				Helpers.el('div', 'promptOkButton', 'OK', {
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
	const tryRequire = optionalRequire<SecretsMap>(await route('./genericJs/secrets')) || null;
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