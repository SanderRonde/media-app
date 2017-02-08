"use strict";
var ready = false;
var rules = null;
function getList() {
    return window.fetch(chrome.runtime.getURL('/adblocking/easylist.txt')).then(function (response) {
        return response.text();
    });
}
var alphabetChar = /[a-Z]/;
function stringToRegex(url) {
    return new RegExp(url.split('').map(function (char) {
        if (char === '*') {
            return '([a-Z]|[0-9])+';
        }
        return (alphabetChar.exec(char) ? char : '\\' + char);
    }).join(''));
}
function processLine(line) {
    if (line.indexOf('##') > -1) {
        return null;
    }
    if (line.startsWith('/')) {
        return {
            type: 'path',
            rule: stringToRegex(line)
        };
    }
    else if (line.startsWith('||') && line.endsWith('^')) {
        return {
            type: 'endsWith',
            rule: stringToRegex(line)
        };
    }
    else if (line.startsWith('|') && line.endsWith('|')) {
        return {
            type: 'fullMatch',
            rule: stringToRegex(line)
        };
    }
    return null;
}
function preProcessList(list) {
    var res = list.map(function (line) {
        return processLine(line);
    }).filter(function (el) {
        return el !== null;
    });
    return {
        fullMatch: res.filter(function (item) { return item.type === 'fullMatch'; }).map(function (item) { return item.rule; }),
        endsWith: res.filter(function (item) { return item.type === 'endsWith'; }).map(function (item) { return item.rule; }),
        path: res.filter(function (item) { return item.type === 'path'; }).map(function (item) { return item.rule; })
    };
}
new Promise(function (resolve) {
    getList().then(function (fetchedList) {
        rules = preProcessList(fetchedList.split('\n'));
        resolve();
    });
}).then(function () {
    ready = true;
});
function splitURL(url) {
    var noProtocol = url.split('://')[1];
    var hostAndPathSplit = noProtocol.split('/');
    return {
        path: hostAndPathSplit[1],
        host: hostAndPathSplit[0]
    };
}
function getHost(url) {
    return url.split('://')[1].split('/')[0];
}
function isBlocked(url) {
    var _a = splitURL(url), path = _a.path, host = _a.host;
    for (var i = 0; i < rules.fullMatch.length; i++) {
        if (rules.fullMatch[i].exec(url)) {
            return true;
        }
    }
    for (var i = 0; i < rules.endsWith.length; i++) {
        if (rules.endsWith[i].exec(url) && host.endsWith(rules.endsWith[i].exec(url)[0])) {
            return true;
        }
    }
    for (var i = 0; i < rules.path.length; i++) {
        if (rules.path[i].exec(url) && path.endsWith(rules.endsWith[i].exec(url)[0])) {
            return true;
        }
    }
}
function BlockAd(url) {
    if (!ready) {
        return false;
    }
    return isBlocked(url);
}
exports.BlockAd = BlockAd;
