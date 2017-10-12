const optionalRequire = (require('optional-require') as optionalRequire)(require);
import { STORED_DATA_FILE } from '../../backgroundLibs/constants/constants';
import { route } from '../../backgroundLibs/routing/routing';
import { Util } from './util';
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
				const Notification = require('electron').Notification;
				const notification = new Notification({
					title: 'Could not store secrets',
					body: 'Could not store secrets'
				});
				notification.show();
				resolve(null);
			} else {
				resolve(null);
			}
		});
	});
}

async function askForSecrets<T extends keyof SecretsMap>(key: T): Promise<SecretsMap[T]> {
	return new Promise<SecretsMap[T]>(async (resolve) => {
		const promptContainer = Util.el('div', 'promptContainer', [
			Util.el('div', 'promptTitle', 'Please fill in these values'),
			Util.el('div', 'promptInputs', [
				Util.el('div', 'promptAPIKey', [
					Util.el('div', 'promptAPIKeyText', 'Youtube API Key:'),
					Util.el('input', 'promptAPIKeyInput', [], {
						props: {
							placeholder: 'Youtube API Key'
						}
					})
				]),
				Util.el('div', 'promptFirebaseConfig', [
					Util.el('div', 'promptFirebaseConfigText', 'Firebase Config:'),
					Util.el('textarea', 'promptFirebaseConfigInput', [], {
						props: {
							placeholder: '{ apiKey: "...", ... }',
							rows: '8'
						}
					})
				])
			]),
			Util.el('div', 'promptButtons', [
				Util.el('div', 'promptOkButton', 'OK', {
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
							await Util.wait(500);

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

export type getSecret = <T extends keyof SecretsMap>(key: T) => Promise<SecretsMap[T]>;

export type SecretsMap = {
	firebaseConfig: FireBaseConfig;
	googleAPIKey: GoogleAPIKey;
};

export type FireBaseConfig = {
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;	
};

export type GoogleAPIKey = string;