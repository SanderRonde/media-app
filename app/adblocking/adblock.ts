let ready: boolean = false;
let rules: {
	fullMatch: Array<RegExp>;
	endsWith: Array<RegExp>;
	path: Array<RegExp>;
} = null;

interface RuleBase {
	type: 'fullMatch'|'endsWith'|'path';
	rule: RegExp;
}

interface FullMatchType extends RuleBase {
	type: 'fullMatch';
}

interface EndsWithType extends RuleBase {
	type: 'endsWith';
}

interface PathType extends RuleBase {
	type: 'path';
}

type Rule = FullMatchType|EndsWithType|PathType;

function getList(): Promise<string> { 
	return window.fetch(chrome.runtime.getURL('/adblocking/easylist.txt')).then((response) => {
		return response.text();
	});
}

const alphabetChar = /[a-Z]/;
function stringToRegex(url: string): RegExp {
	return new RegExp(url.split('').map((char) => {
		if (char === '*') {
			return '([a-Z]|[0-9])+';
		}
		return (alphabetChar.exec(char) ? char : '\\' + char);
	}).join(''));
}

function processLine(line: string): Rule {
	if (line.indexOf('##') > -1) {
		return null;
	}

	if (line.startsWith('/')) {
		return {
			type: 'path',
			rule: stringToRegex(line)
		};
	} else if (line.startsWith('||') && line.endsWith('^')) {
		return {
			type: 'endsWith',
			rule: stringToRegex(line)
		}
	} else if (line.startsWith('|') && line.endsWith('|')) {
		return {
			type: 'fullMatch',
			rule: stringToRegex(line)
		};
	}
	return null;
}

function preProcessList(list: Array<string>): {
	fullMatch: Array<RegExp>;
	endsWith: Array<RegExp>;
	path: Array<RegExp>;
} {
	const res = list.map((line) => {
		return processLine(line);
	}).filter((el) => {
		return el !== null;
	});
	return {
		fullMatch: res.filter(item => item.type === 'fullMatch').map(item => item.rule),
		endsWith: res.filter(item => item.type === 'endsWith').map(item => item.rule),
		path: res.filter(item => item.type === 'path').map(item => item.rule)
	}
}

new Promise((resolve) => {
	getList().then((fetchedList) => {
		rules = preProcessList(fetchedList.split('\n'));
		resolve();
	});
}).then(() => {
	ready = true;
});

function splitURL(url: string): {
	path: string;
	host: string;
} {
	const noProtocol = url.split('://')[1];
	const hostAndPathSplit = noProtocol.split('/');
	return {
		path: hostAndPathSplit[1],
		host: hostAndPathSplit[0]
	}
}

function isBlocked(url: string): boolean {
	const { path, host } = splitURL(url);

	for (let i = 0; i < rules.fullMatch.length; i++) {
		if (rules.fullMatch[i].exec(url)) {
			return true;
		}
	}
	for (let i = 0; i < rules.endsWith.length; i++) {
		if (rules.endsWith[i].exec(url) && host.endsWith(rules.endsWith[i].exec(url)[0])) {
			return true;
		}
	}
	for (let i = 0; i < rules.path.length; i++) {
		if (rules.path[i].exec(url) && path.endsWith(rules.endsWith[i].exec(url)[0])) {
			return true;
		}
	}
	return false;
}

export function BlockAd(url: string): boolean {
	if (!ready) {
		return false;
	}

	return isBlocked(url);
}