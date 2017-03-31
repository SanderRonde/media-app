"use strict";
var AdBlocking;
(function (AdBlocking) {
    var ready = false;
    var rules = null;
    function getList() {
        return window.fetch(chrome.runtime.getURL('/adblocking/easylist.txt')).then(function (response) {
            return response.text();
        });
    }
    var alphabetChar = /[a-z|A-Z]/;
    function stringToRegex(url) {
        return new RegExp(url.split('').map(function (char) {
            if (char === '*') {
                return '([a-z|A-Z]|[0-9])+';
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
            if (rules.path[i].exec(url) && path.endsWith(rules.path[i].exec(url)[0])) {
                return true;
            }
        }
        return false;
    }
    function BlockAd(url) {
        if (!ready) {
            return false;
        }
        if (isBlocked(url)) {
            console.log("Blocked ad from loading " + url);
            return true;
        }
        return false;
    }
    AdBlocking.BlockAd = BlockAd;
})(AdBlocking || (AdBlocking = {}));
var Helpers;
(function (Helpers) {
    function stringifyFunction(fn) {
        return "(" + fn.toString() + ")();";
    }
    Helpers.stringifyFunction = stringifyFunction;
    function toQueryString(obj) {
        var parts = [];
        for (var key in obj) {
            parts.push(key + "=" + obj[key]);
        }
        return "?" + parts.join('&');
    }
    Helpers.toQueryString = toQueryString;
    function createTag(fn) {
        var str = fn.toString();
        return (function () {
            var tag = document.createElement('script');
            tag.innerHTML = "(" + str + ")();";
            document.documentElement.appendChild(tag);
            document.documentElement.removeChild(tag);
        }).toString().replace('str', str);
    }
    function hacksecute(view, fn) {
        if (!view.src) {
            return;
        }
        view.executeScript({
            code: ("(" + createTag(fn).toString() + ")();")
                .replace(/\$\{EXTENSIONIDSTRING\}/, chrome.runtime.getURL('').split('://')[1].split('/')[0])
        });
    }
    Helpers.hacksecute = hacksecute;
    var taskIds = 0;
    var taskListeners = {};
    function returnTaskValue(result, id) {
        if (taskListeners[id]) {
            taskListeners[id](result);
        }
        delete taskListeners[id];
    }
    Helpers.returnTaskValue = returnTaskValue;
    ;
    function sendTaskToPage(name, page, callback) {
        chrome.storage.local.get('tasks', function (data) {
            data['tasks'] = data['tasks'] || [];
            data['tasks'].push({
                name: name,
                page: page,
                id: ++taskIds
            });
            taskListeners[taskIds] = callback;
            chrome.storage.local.set({
                tasks: data['tasks']
            });
        });
    }
    Helpers.sendTaskToPage = sendTaskToPage;
    function toArr(iterable) {
        var arr = [];
        for (var i = 0; i < iterable.length; i++) {
            arr[i] = iterable[i];
        }
        return arr;
    }
    Helpers.toArr = toArr;
})(Helpers || (Helpers = {}));
var YoutubeMusic;
(function (YoutubeMusic) {
    var view = null;
    var Visualization;
    (function (Visualization) {
        var visualizing = false;
        function isVisualizing() {
            return visualizing;
        }
        Visualization.isVisualizing = isVisualizing;
        function toggle() {
            visualizing = !visualizing;
        }
        Visualization.toggle = toggle;
    })(Visualization || (Visualization = {}));
    var Content;
    (function (Content) {
        function init() {
            Helpers.hacksecute(view, function () {
                if (window.executedYTCA) {
                    return;
                }
                window.executedYTCA = location.href;
                var player = document.querySelector('.html5-video-player');
                var playerApi = document.getElementById('player-api');
                var volumeBar = document.createElement('div');
                var volumeBarBar = document.createElement('div');
                var volumeBarNumber = document.createElement('div');
                var visualizer = document.createElement('div');
                visualizer.classList.add('ytma_visualization_cont');
                document.body.insertBefore(visualizer, document.body.children[0]);
                volumeBar.id = 'yt-ca-volumeBar';
                volumeBarBar.id = 'yt-ca-volumeBarBar';
                volumeBarNumber.id = 'yt-ca-volumeBarNumber';
                var volumeBarTimeout = null;
                var visualizing = false;
                volumeBar.appendChild(volumeBarNumber);
                volumeBar.appendChild(volumeBarBar);
                document.body.appendChild(volumeBar);
                function cleanupData(dataArray) {
                    for (var i in dataArray) {
                        if (dataArray[i] <= -100 || dataArray[i] === -80 || dataArray[i] === -50) {
                            dataArray[i] = 0;
                            continue;
                        }
                        dataArray[i] = (dataArray[i] + 100) / 100;
                    }
                    var newArray = [];
                    var delta = (dataArray.length / 120);
                    for (var i = 0; i < dataArray.length; i += delta) {
                        var average = dataArray.slice(i, i + delta).reduce(function (a, b) {
                            return a + b;
                        }) / delta;
                        newArray.push(average);
                    }
                    return newArray;
                }
                function renderBars(data) {
                    data.bars.forEach(function (element, index) {
                        element.style.transform = "scaleY(" + data.parsedArray[index] * 1.5 + ")";
                    });
                }
                function visualize() {
                    this.analyser.getFloatFrequencyData(this.dataArray);
                    this.parsedArray = cleanupData(this.dataArray);
                    renderBars(this);
                    if (visualizing) {
                        window.requestAnimationFrame(visualize.bind(this));
                    }
                }
                function checkForVisualizer(data) {
                    var shouldVisualize = document.body.classList.contains('showVisualizer');
                    if (visualizing === shouldVisualize) {
                        return;
                    }
                    if (shouldVisualize) {
                        visualizing = true;
                        document.body.classList.add('showVisualizer');
                        window.requestAnimationFrame(visualize.bind(data));
                    }
                    else {
                        document.body.classList.remove('showVisualizer');
                        visualizing = false;
                    }
                }
                function setupVisualizer() {
                    var data = {};
                    data.video = document.querySelector('video');
                    data.ctx = new AudioContext();
                    data.analyser = data.ctx.createAnalyser();
                    data.vidSrc = data.ctx.createMediaElementSource(data.video);
                    data.vidSrc.connect(data.analyser);
                    data.vidSrc.connect(data.ctx.destination);
                    data.dataArray = new Float32Array(data.analyser.frequencyBinCount);
                    data.analyser.getFloatFrequencyData(data.dataArray);
                    data.bars = Array(100).join('a').split('a').map(function (el) {
                        var bar = document.createElement('div');
                        bar.classList.add('ytma_visualization_bar');
                        visualizer.appendChild(bar);
                        return bar;
                    });
                    window.setInterval(function () {
                        checkForVisualizer(data);
                    }, 50);
                }
                function prepareVideo() {
                    var timePassed = 0;
                    setTimeout(function () {
                        timePassed += 500;
                        function reloadIfAd() {
                            if (player.getAdState() === 1) {
                                window.location.reload();
                            }
                            if (player.getPlayerState() === 3) {
                                window.setTimeout(reloadIfAd, 250);
                                timePassed += 250;
                            }
                            else {
                                window.setTimeout(function () {
                                    player.setPlaybackQuality('hd1080');
                                    if (player.getPlaybackQuality() !== 'hd1080') {
                                        player.setPlaybackQuality('hd720');
                                    }
                                    if (document.querySelector('.ytp-size-button')
                                        .getAttribute('title') === 'Theatermodus') {
                                        player.setSizeStyle(true, true);
                                    }
                                    setupVisualizer();
                                    localStorage.setItem('loaded', 'ytmusic');
                                }, Math.max(2500 - timePassed, 0));
                            }
                        }
                        reloadIfAd();
                    }, 500);
                }
                prepareVideo();
                document.body.addEventListener('keydown', function (e) {
                    if (e.key === 'h') {
                        document.body.classList.toggle('showHiddens');
                    }
                });
                function updateSizes() {
                    playerApi.style.width = window.innerWidth + 'px';
                    playerApi.style.height = (window.innerHeight - 15) + 'px';
                    player.setSize();
                }
                updateSizes();
                window.addEventListener('resize', updateSizes);
                function setPlayerVolume(volume) {
                    player.setVolume(volume);
                    localStorage.setItem('yt-player-volume', JSON.stringify({
                        data: JSON.stringify({
                            volume: volume,
                            muted: (volume === 0)
                        }),
                        creation: Date.now(),
                        expiration: Date.now() + (30 * 24 * 60 * 60 * 1000)
                    }));
                }
                function increaseVolume() {
                    var vol = player.getVolume();
                    if (player.isMuted()) {
                        vol = 0;
                        player.unMute();
                    }
                    if (vol <= 10) {
                        vol += 1;
                    }
                    else {
                        vol += 5;
                    }
                    vol = (vol > 100 ? 100 : vol);
                    setPlayerVolume(vol);
                }
                function lowerVolume() {
                    var vol = player.getVolume();
                    if (!player.isMuted()) {
                        if (vol <= 10) {
                            vol -= 1;
                        }
                        else {
                            vol -= 5;
                        }
                        vol = (vol < 0 ? 0 : vol);
                        setPlayerVolume(vol);
                    }
                }
                function showVolumeBar() {
                    var volume = player.getVolume();
                    localStorage.setItem('volume', volume + '');
                    volumeBarNumber.innerHTML = volume + '';
                    volumeBarBar.style.transform = "scaleX(" + volume / 100 + ")";
                    volumeBar.classList.add('visible');
                    if (volumeBarTimeout !== null) {
                        window.clearTimeout(volumeBarTimeout);
                    }
                    volumeBarTimeout = window.setTimeout(function () {
                        volumeBar.classList.remove('visible');
                        volumeBarTimeout = null;
                    }, 2000);
                }
                function onScroll(isDown) {
                    if (isDown) {
                        lowerVolume();
                    }
                    else {
                        increaseVolume();
                    }
                    showVolumeBar();
                }
                function addListeners() {
                    var videoEl = document.querySelector('video');
                    videoEl.addEventListener('wheel', function (e) {
                        onScroll(e.deltaY > 0);
                    });
                }
                addListeners();
                function executeTask(name, id) {
                    var result = null;
                    switch (name) {
                        case 'getTime':
                            result = document.querySelector('.html5-video-player').getCurrentTime();
                            break;
                        default:
                            if (name.indexOf('getSongName') > -1) {
                                var timestampContainers = document
                                    .querySelector('#eow-description')
                                    .querySelectorAll('a[href="#"]');
                                var index = ~~name.split('getSongName')[1];
                                var textNodes = [];
                                if (!isNaN(index) && timestampContainers[index]) {
                                    var currentNode = timestampContainers[index].previousSibling;
                                    while (currentNode && currentNode.tagName !== 'BR') {
                                        if (!currentNode.tagName) {
                                            textNodes.push(currentNode.nodeValue);
                                        }
                                        currentNode = currentNode.previousSibling;
                                    }
                                    currentNode = timestampContainers[index].nextSibling;
                                    while (currentNode && currentNode.tagName !== 'BR') {
                                        if (!currentNode.tagName) {
                                            textNodes.push(currentNode.nodeValue);
                                        }
                                        currentNode = currentNode.nextSibling;
                                    }
                                    for (var i = 0; i < textNodes.length; i++) {
                                        if (/.+-.+/.test(textNodes[i])) {
                                            result = textNodes[i];
                                            break;
                                        }
                                    }
                                    if (!result) {
                                        result = textNodes[0];
                                    }
                                }
                                else {
                                    result = null;
                                }
                            }
                            break;
                    }
                    localStorage.setItem("taskResult" + id, result + '');
                }
                function checkForTasks() {
                    var tasks;
                    if ((tasks = localStorage.getItem('tasks'))) {
                        try {
                            tasks = JSON.parse(tasks);
                        }
                        catch (e) {
                            tasks = [];
                        }
                        if (Array.isArray(tasks) && tasks.length > 0) {
                            tasks.forEach(function (task) {
                                executeTask(task.name, task.id);
                            });
                            localStorage.setItem('tasks', '[]');
                        }
                    }
                }
                window.setInterval(checkForTasks, 50);
            });
        }
        Content.init = init;
    })(Content || (Content = {}));
    var Downloading;
    (function (Downloading) {
        var songFoundTimeout = null;
        var songFoundName = '';
        function downloadSong() {
            var view = document.createElement('webview');
            view.id = 'youtubeSearchPageView';
            view.addContentScripts([{
                    name: 'youtubeSearchJs',
                    matches: ['*://*/*'],
                    js: {
                        files: ['/youtube/youtubeSearch/youtubeSearch.js']
                    },
                    run_at: 'document_end'
                }, {
                    name: 'youtubeSearchCss',
                    matches: ['*://*/*'],
                    css: {
                        files: ['/youtube/youtubeSearch/youtubeSearch.css']
                    },
                    run_at: "document_start"
                }]);
            view.src = "https://www.youtube.com/results?search_query=" + encodeURIComponent(songFoundName.trim().replace(/ /g, '+')).replace(/%2B/g, '+') + "&page=&utm_source=opensearch";
            document.body.appendChild(view);
        }
        Downloading.downloadSong = downloadSong;
        document.getElementById('getSongDownload').addEventListener('click', downloadSong);
        function displayFoundSong(name) {
            document.getElementById('getSongName').innerHTML = name;
            var dialog = document.getElementById('getSongDialog');
            dialog.classList.add('visible');
            dialog.classList.add('hoverable');
            if (songFoundTimeout !== null) {
                window.clearTimeout(songFoundTimeout);
            }
            songFoundName = name;
            songFoundTimeout = window.setTimeout(function () {
                dialog.classList.remove('visible');
                window.setTimeout(function () {
                    dialog.classList.remove('hoverable');
                }, 200);
            }, 5000);
        }
        function timestampToSeconds(timestamp) {
            var split = timestamp.split(':');
            var seconds = 0;
            for (var i = split.length - 1; i >= 0; i--) {
                seconds = Math.pow(60, (split.length - (i + 1))) * ~~split[i];
            }
            return seconds;
        }
        function getSongIndex(timestamps, time) {
            for (var i = 0; i < timestamps.length; i++) {
                if (timestamps[i] <= time && timestamps[i + 1] >= time) {
                    return i;
                }
            }
            return timestamps.length - 1;
        }
        function findOn1001Tracklists(name, url) {
            return new Promise(function (resolve) {
                var websiteWebview = document.createElement('webview');
                var currentPage = 'none';
                websiteWebview.addContentScripts([{
                        name: 'comm',
                        matches: ['*://*/*'],
                        js: {
                            files: [
                                '/genericJs/comm.js',
                                '/youtube/1001tracklists/content.js'
                            ]
                        }
                    }]);
                websiteWebview.addEventListener('contentload', function () {
                    if (currentPage === 'none') {
                        currentPage = 'main';
                    }
                    else if (currentPage === 'main') {
                        currentPage = 'results';
                    }
                    if (currentPage === 'main') {
                        Helpers.sendTaskToPage(JSON.stringify([
                            'searchFor', name
                        ]), '1001tracklists', function () {
                        });
                    }
                    else if (currentPage === 'results') {
                        Helpers.sendTaskToPage(JSON.stringify([
                            'findItem', url
                        ]), '1001tracklists', function (result) {
                            if (result !== 'null' && result !== 'false' && result) {
                                getTrackFrom1001TracklistsUrl(result);
                            }
                            else {
                                resolve(false);
                            }
                            websiteWebview.remove();
                        });
                    }
                });
                websiteWebview.src = 'https://www.1001tracklists.com';
                document.body.appendChild(websiteWebview);
            });
        }
        function getUrlHTML(url, data) {
            if (data === void 0) { data = {
                method: 'GET'
            }; }
            return new Promise(function (resolve) {
                window.fetch(url, data).then(function (response) {
                    return response.text();
                }).then(function (html) {
                    var doc = document.createRange().createContextualFragment(html);
                    resolve(doc);
                });
            });
        }
        function getTrackFrom1001TracklistsUrl(url) {
            getUrlHTML(url).then(function (doc) {
                var tracks = Helpers.toArr(doc.querySelectorAll('.tlpTog')).map(function (songContainer) {
                    try {
                        var nameContainer = songContainer.querySelector('.trackFormat');
                        var namesContainers = nameContainer.querySelectorAll('.blueTxt, .blackTxt');
                        var artist = namesContainers[0].innerText;
                        var songName = namesContainers[1].innerText;
                        var remix = '';
                        if (namesContainers[2]) {
                            remix = " (" + namesContainers[2].innerText + " " + namesContainers[3].innerText + ")";
                        }
                        if (songContainer.querySelector('.cueValueField').innerText === '') {
                            return null;
                        }
                        var timeField = songContainer.querySelector('.cueValueField').innerText;
                        return {
                            startTime: timeField === '' ? timestampToSeconds(timeField) : null,
                            songName: artist + " - " + songName + remix
                        };
                    }
                    catch (e) {
                        return null;
                    }
                });
                Helpers.sendTaskToPage('getTime', 'youtube', function (time) {
                    var index = getSongIndex(tracks.filter(function (track) {
                        return !!track;
                    }).map(function (track) {
                        return track.startTime;
                    }), ~~time);
                    var unsure = false;
                    if (tracks[index - 1] && tracks[index - 1].startTime === null) {
                        unsure = true;
                    }
                    else if (tracks[index + 1] && tracks[index + 1].startTime === null) {
                        unsure = true;
                    }
                    var trackName = tracks[index].songName;
                    displayFoundSong(unsure ? "???" + trackName + "???" : trackName);
                });
            });
        }
        function getCurrentSong() {
            Helpers.sendTaskToPage('getTimestamps', 'youtube', function (timestamps) {
                var enableOCR = false;
                if (enableOCR && !timestamps) {
                }
                else if (timestamps.found === true) {
                    var data_1 = timestamps.data;
                    if (!Array.isArray(data_1)) {
                        getTrackFrom1001TracklistsUrl(data_1);
                    }
                    else {
                        Helpers.sendTaskToPage('getTime', 'youtube', function (time) {
                            var index = getSongIndex(data_1, ~~time);
                            Helpers.sendTaskToPage('getSongName' + index, 'youtube', function (name) {
                                displayFoundSong(name);
                            });
                        });
                    }
                }
                else {
                    findOn1001Tracklists(timestamps.data.name, timestamps.data.url).then(function (found) {
                        if (!found) {
                            var toast_1 = document.getElementById('mainToast');
                            toast_1.classList.add('visible');
                            window.setTimeout(function () {
                                toast_1.classList.remove('visible');
                            }, 5000);
                        }
                    });
                }
            });
        }
        Downloading.getCurrentSong = getCurrentSong;
    })(Downloading || (Downloading = {}));
    function getCurrentSong() {
        Downloading.getCurrentSong();
    }
    YoutubeMusic.getCurrentSong = getCurrentSong;
    function downloadVideo(url) {
        var searchPageView = document.getElementById('youtubeSearchPageView');
        searchPageView && searchPageView.remove();
        window.open("http://www.youtube-mp3.org/#v" + url.split('?v=')[1], '_blank');
    }
    YoutubeMusic.downloadVideo = downloadVideo;
    var Commands;
    (function (Commands) {
        function lowerVolume() {
            Helpers.hacksecute(view, function () {
                var player = document.querySelector('.html5-video-player');
                var vol = player.getVolume();
                if (!player.isMuted()) {
                    if (vol <= 10) {
                        vol -= 1;
                    }
                    vol = (vol < 0 ? 0 : vol);
                    player.setVolume(vol);
                }
            });
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
            Helpers.hacksecute(view, function () {
                var player = document.querySelector('.html5-video-player');
                var vol = player.getVolume();
                if (player.isMuted()) {
                    vol = 0;
                    player.unMute();
                }
                if (vol <= 10) {
                    vol += 1;
                }
                vol = (vol > 100 ? 100 : vol);
                player.setVolume(vol);
            });
        }
        Commands.raiseVolume = raiseVolume;
        function togglePlay() {
            Helpers.hacksecute(view, function () {
                var player = document.querySelector('.html5-video-player');
                var state = player.getPlayerState();
                if (state === 2) {
                    player.playVideo();
                }
                else if (state === 1) {
                    player.pauseVideo();
                }
                else {
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(view, function () {
                var player = document.querySelector('.html5-video-player');
                player.pauseVideo();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(view, function () {
                var player = document.querySelector('.html5-video-player');
                player.playVideo();
            });
        }
        Commands.play = play;
    })(Commands = YoutubeMusic.Commands || (YoutubeMusic.Commands = {}));
    function blockViewAds() {
        var CANCEL = {
            cancel: true
        };
        view.request.onBeforeRequest.addListener(function (request) {
            if (AdBlocking.BlockAd(request.url)) {
                return CANCEL;
            }
            return {
                cancel: false
            };
        }, {
            urls: ['*://*/*']
        }, ['blocking']);
    }
    function addViewListeners() {
        blockViewAds();
        view.addContentScripts([{
                name: 'js',
                matches: ['*://*/*'],
                js: {
                    files: [
                        '/genericJs/comm.js',
                        '/youtube/content/content.js'
                    ]
                },
                run_at: 'document_end'
            }, {
                name: 'css',
                matches: ['*://*/*'],
                css: {
                    files: ['/youtube/content/content.css']
                },
                run_at: 'document_start'
            }]);
        view.addEventListener('contentload', function (e) {
            Content.init();
        });
        view.addEventListener('loadcommit', function (e) {
            if (e.isTopLevel) {
                window.setTimeout(Content.init, 1000);
            }
        });
        view.addEventListener('newwindow', function (e) {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', function () {
            view.focus();
        });
        view.addEventListener('keydown', function (e) {
            if (e.key === '?') {
                YoutubeMusic.getCurrentSong();
            }
        });
    }
    function launch(url) {
        view.src = url;
    }
    function respondUrl(response) {
        if (response && typeof response === 'string') {
            launch(response);
        }
        else {
            chrome.storage.sync.get('url', function (data) {
                launch(data['url']);
            });
        }
    }
    YoutubeMusic.respondUrl = respondUrl;
    function addListeners() {
        AppWindow.listen('onMinimized', function () {
            if (Visualization.isVisualizing()) {
                Helpers.hacksecute(view, function () {
                    document.body.classList.remove('showVisualizer');
                });
            }
        });
        AppWindow.listen('onRestored', function () {
            if (!AppWindow.app.isMinimized() && Visualization.isVisualizing()) {
                Helpers.hacksecute(view, function () {
                    document.body.classList.add('showVisualizer');
                });
            }
        });
        document.body.addEventListener('keydown', function (e) {
            if (AppWindow.getActiveView() !== 'ytmusic') {
                return;
            }
            if (e.key === 'd') {
                Downloading.downloadSong();
            }
            else if (e.key === 'v') {
                Visualization.toggle();
                Helpers.hacksecute(view, function () {
                    document.body.classList.toggle('showVisualizer');
                });
            }
        });
        Helpers.toArr(document.querySelectorAll('.toast .dismissToast')).forEach(function (toastButton) {
            toastButton.addEventListener('click', function () {
                toastButton.parentNode.classList.remove('visible');
            });
        });
    }
    function init() {
        chrome.runtime.sendMessage({
            cmd: 'getUrl'
        });
    }
    YoutubeMusic.init = init;
    function setup() {
        view = document.createElement('webview');
        view.id = 'ytmaWebview';
        view.setAttribute('partition', 'persist:youtube-music-app');
        window.setTimeout(function () {
            addViewListeners();
            document.querySelector('#youtubePlaylistCont').appendChild(view);
            addListeners();
        }, 10);
    }
    YoutubeMusic.setup = setup;
    function onClose() {
        view.executeScript({
            code: "(" + (function () {
                var vidId = location.href.split('v=')[1].split('&')[0];
                var vidIndex = location.href.split('index=')[1];
                if (vidIndex.indexOf('&') > -1) {
                    vidIndex = vidIndex.split('&')[0];
                }
                var _a = document.querySelector('.ytp-time-current').innerHTML.split(':'), mins = _a[0], secs = _a[1];
                var address = 'https://www.youtube.com/watch';
                var url = address + "?v=" + vidId + "&list=WL&index=" + vidIndex + "&t=" + mins + "m" + secs + "s";
                chrome.runtime.sendMessage({
                    cmd: 'setUrl',
                    url: url
                });
            }).toString() + ")()"
        });
    }
    YoutubeMusic.onClose = onClose;
    function onFocus() {
        view.focus();
    }
    YoutubeMusic.onFocus = onFocus;
})(YoutubeMusic || (YoutubeMusic = {}));
var Netflix;
(function (Netflix) {
    function initView() {
        var view = document.createElement('webview');
        view.setAttribute('partition', 'persist:netflix');
        view.addEventListener('newwindow', function (e) {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', function () {
            view.focus();
        });
        document.querySelector('#netflixCont').appendChild(view);
        return view;
    }
    var Video;
    (function (Video) {
        Video.videoView = null;
        function setup() {
            Video.videoView = initView();
            Video.videoView.id = 'netflixWebView';
            window.setTimeout(function () {
                Video.videoView.addContentScripts([{
                        name: 'js',
                        matches: ['*://*/*'],
                        js: {
                            files: [
                                '/genericJs/comm.js',
                                '/netflix/video/video.js'
                            ]
                        },
                        run_at: 'document_idle'
                    }]);
            }, 10);
        }
        Video.setup = setup;
    })(Video || (Video = {}));
    var Commands;
    (function (Commands) {
        function lowerVolume() {
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
        }
        Commands.raiseVolume = raiseVolume;
        function togglePlay() {
            Helpers.hacksecute(Video.videoView, function () {
                var video = document.querySelector('video');
                if (!window.playerStatus) {
                    window.playerStatus = video.paused ?
                        'paused' : 'playing';
                }
                var playerStatus = window.playerStatus;
                var videoStatus = video.paused ?
                    'paused' : 'playing';
                var playButton = document.querySelector('.player-control-button');
                if (playerStatus === videoStatus) {
                    playButton.click();
                    window.playerStatus = (window.playerStatus === 'playing' ? 'paused' : 'playing');
                }
                else {
                    playButton.click();
                    playButton.click();
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(Video.videoView, function () {
                var video = document.querySelector('video');
                video.pause();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(Video.videoView, function () {
                var video = document.querySelector('video');
                video.play();
            });
        }
        Commands.play = play;
    })(Commands = Netflix.Commands || (Netflix.Commands = {}));
    function setup() {
        Video.setup();
    }
    Netflix.setup = setup;
    function init() {
        window.setTimeout(function () {
            Video.videoView.src = 'https://www.netflix.com/browse';
        }, 15);
    }
    Netflix.init = init;
    function onClose() {
        Video.videoView.src && Video.videoView.back();
    }
    Netflix.onClose = onClose;
    function onFocus() {
        Video.videoView.focus();
    }
    Netflix.onFocus = onFocus;
})(Netflix || (Netflix = {}));
var YoutubeSubscriptions;
(function (YoutubeSubscriptions) {
    function initView() {
        var view = document.createElement('webview');
        view.setAttribute('partition', 'persist:youtubeSubscriptions');
        view.addEventListener('newwindow', function (e) {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', function () {
            view.focus();
        });
        document.querySelector('#youtubeSubsCont').appendChild(view);
        return view;
    }
    var Commands;
    (function (Commands) {
        function lowerVolume() {
            Helpers.hacksecute(Video.videoView, function () {
                var player = document.querySelector('.html5-video-player');
                var vol = player.getVolume();
                if (!player.isMuted()) {
                    vol -= 5;
                    vol = (vol < 0 ? 0 : vol);
                    player.setVolume(vol);
                }
            });
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
            Helpers.hacksecute(Video.videoView, function () {
                var player = document.querySelector('.html5-video-player');
                var vol = player.getVolume();
                if (player.isMuted()) {
                    vol = 0;
                    player.unMute();
                }
                vol += 5;
                vol = (vol > 100 ? 100 : vol);
                player.setVolume(vol);
            });
        }
        Commands.raiseVolume = raiseVolume;
        function togglePlay() {
            Helpers.hacksecute(Video.videoView, function () {
                var player = document.querySelector('.html5-video-player');
                var state = player.getPlayerState();
                if (state === 2) {
                    player.playVideo();
                }
                else if (state === 1) {
                    player.pauseVideo();
                }
                else {
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(Video.videoView, function () {
                var player = document.querySelector('.html5-video-player');
                player.pauseVideo();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(Video.videoView, function () {
                var player = document.querySelector('.html5-video-player');
                player.playVideo();
            });
            if (Video.videoView.src) {
                showVideo();
            }
        }
        Commands.play = play;
        function magicButton() {
            SubBox.subBoxView.executeScript({
                code: Helpers.stringifyFunction(function () {
                    window.videos.selected.goLeft();
                    window.videos.selected.launchCurrent();
                })
            });
        }
        Commands.magicButton = magicButton;
    })(Commands = YoutubeSubscriptions.Commands || (YoutubeSubscriptions.Commands = {}));
    var Video;
    (function (Video) {
        Video.videoView = null;
        function setup() {
            Video.videoView = initView();
            Video.videoView.id = 'youtubeSubsVideoView';
            window.setTimeout(function () {
                Video.videoView.addContentScripts([{
                        name: 'css',
                        matches: ['*://*/*'],
                        css: {
                            files: [
                                '/youtube/content/content.css',
                                '/youtubeSubs/video/youtubeVideo.css'
                            ]
                        },
                        run_at: 'document_start'
                    }]);
                Video.videoView.addEventListener('contentload', function () {
                    Helpers.hacksecute(Video.videoView, function () {
                        var player = document.querySelector('.html5-video-player');
                        var playerApi = document.getElementById('player-api');
                        var volumeBar = document.createElement('div');
                        var volumeBarBar = document.createElement('div');
                        var volumeBarNumber = document.createElement('div');
                        var volumeBarTimeout = null;
                        volumeBar.id = 'yt-ca-volumeBar';
                        volumeBarBar.id = 'yt-ca-volumeBarBar';
                        volumeBarNumber.id = 'yt-ca-volumeBarNumber';
                        volumeBar.appendChild(volumeBarNumber);
                        volumeBar.appendChild(volumeBarBar);
                        document.body.appendChild(volumeBar);
                        function prepareVideo() {
                            setTimeout(function () {
                                function reloadIfAd() {
                                    if (player.getAdState() === 1) {
                                        window.location.reload();
                                    }
                                    if (player.getPlayerState() === 3) {
                                        window.setTimeout(reloadIfAd, 250);
                                    }
                                    else {
                                        player.setPlaybackQuality('hd1080');
                                        if (player.getPlaybackQuality() !== 'hd1080') {
                                            player.setPlaybackQuality('hd720');
                                        }
                                        if (document.querySelector('.ytp-size-button')
                                            .getAttribute('title') === 'Theatermodus') {
                                            player.setSizeStyle(true, true);
                                        }
                                        localStorage.setItem('loaded', 'ytmusic');
                                    }
                                }
                                reloadIfAd();
                            }, 2500);
                        }
                        prepareVideo();
                        document.body.addEventListener('keydown', function (e) {
                            if (e.key === 'k') {
                                document.body.classList.toggle('showHiddens');
                            }
                        });
                        function updateSizes() {
                            playerApi.style.width = window.innerWidth + 'px';
                            playerApi.style.height = (window.innerHeight - 15) + 'px';
                            player.setSize();
                        }
                        updateSizes();
                        window.addEventListener('resize', updateSizes);
                        function setPlayerVolume(volume) {
                            player.setVolume(volume);
                            localStorage.setItem('yt-player-volume', JSON.stringify({
                                data: JSON.stringify({
                                    volume: volume,
                                    muted: (volume === 0)
                                }),
                                creation: Date.now(),
                                expiration: Date.now() + (30 * 24 * 60 * 60 * 1000)
                            }));
                        }
                        function increaseVolume() {
                            var vol = player.getVolume();
                            if (player.isMuted()) {
                                vol = 0;
                                player.unMute();
                            }
                            vol += 5;
                            vol = (vol > 100 ? 100 : vol);
                            setPlayerVolume(vol);
                        }
                        function lowerVolume() {
                            var vol = player.getVolume();
                            if (!player.isMuted()) {
                                vol -= 5;
                                vol = (vol < 0 ? 0 : vol);
                                setPlayerVolume(vol);
                            }
                        }
                        function showVolumeBar() {
                            var volume = player.getVolume();
                            localStorage.setItem('volume', volume + '');
                            volumeBarNumber.innerHTML = volume + '';
                            volumeBarBar.style.transform = "scaleX(" + volume / 100 + ")";
                            volumeBar.classList.add('visible');
                            if (volumeBarTimeout !== null) {
                                window.clearTimeout(volumeBarTimeout);
                            }
                            volumeBarTimeout = window.setTimeout(function () {
                                volumeBar.classList.remove('visible');
                                volumeBarTimeout = null;
                            }, 2000);
                        }
                        function onScroll(isDown) {
                            if (isDown) {
                                lowerVolume();
                            }
                            else {
                                increaseVolume();
                            }
                            showVolumeBar();
                        }
                        function addListeners() {
                            var videoEl = document.querySelector('video');
                            videoEl.addEventListener('wheel', function (e) {
                                onScroll(e.deltaY > 0);
                            });
                        }
                        addListeners();
                    });
                });
                Video.videoView.addEventListener('keydown', function (e) {
                    if (e.key === 'd') {
                        YoutubeMusic.downloadVideo(Video.videoView.src);
                    }
                });
            }, 10);
        }
        Video.setup = setup;
    })(Video || (Video = {}));
    var SubBox;
    (function (SubBox) {
        SubBox.subBoxView = null;
        function setup() {
            SubBox.subBoxView = initView();
            SubBox.subBoxView.id = 'youtubeSubsSubBoxView';
            window.setTimeout(function () {
                SubBox.subBoxView.addContentScripts([{
                        name: 'js',
                        matches: ['*://*/*'],
                        js: {
                            files: [
                                '/genericJs/comm.js',
                                '/youtubeSubs/subBox/subBox.js'
                            ]
                        },
                        run_at: 'document_end'
                    }, {
                        name: 'css',
                        matches: ['*://*/*'],
                        css: {
                            files: ['/youtubeSubs/subBox/subBox.css']
                        },
                        run_at: 'document_start'
                    }]);
            }, 10);
        }
        SubBox.setup = setup;
    })(SubBox || (SubBox = {}));
    function showVideo() {
        document.getElementById('youtubeSubsCont').classList.add('showVideo');
        Video.videoView.focus();
    }
    function changeVideo(url) {
        Video.videoView.src = url;
        showVideo();
    }
    YoutubeSubscriptions.changeVideo = changeVideo;
    function setup() {
        SubBox.setup();
        Video.setup();
    }
    YoutubeSubscriptions.setup = setup;
    function addKeyboardListeners() {
        document.body.addEventListener('keydown', function (e) {
            if (AppWindow.getActiveView() !== 'youtubeSubscriptions') {
                return;
            }
            if (e.key === 'h') {
                var subsCont = document.getElementById('youtubeSubsCont');
                if (subsCont.classList.contains('showVideo')) {
                    subsCont.classList.remove('showVideo');
                    SubBox.subBoxView.focus();
                }
                else {
                    subsCont.classList.add('showVideo');
                    Video.videoView.focus();
                }
            }
        });
    }
    function init() {
        window.setTimeout(function () {
            SubBox.subBoxView.src = 'http://www.youtube.com/feed/subscriptions';
            addKeyboardListeners();
        }, 15);
    }
    YoutubeSubscriptions.init = init;
    function onClose() {
    }
    YoutubeSubscriptions.onClose = onClose;
    function onFocus() {
        if (document.getElementById('youtubeSubsCont').classList.contains('showVideo')) {
            Video.videoView.focus();
        }
        else {
            SubBox.subBoxView.focus();
        }
    }
    YoutubeSubscriptions.onFocus = onFocus;
})(YoutubeSubscriptions || (YoutubeSubscriptions = {}));
var AppWindow;
(function (AppWindow) {
    AppWindow.app = chrome.app.window.current();
    var titleBar = document.querySelector('#titleBar');
    var activeView = null;
    var listeners = [];
    function listen(event, callback) {
        listeners.push({
            event: event,
            callback: callback
        });
    }
    AppWindow.listen = listen;
    function fireEvent(event, data) {
        listeners.filter(function (listener) {
            return listener.event === event;
        }).forEach(function (listener) {
            listener.callback(data);
        });
    }
    function getViewByName(name) {
        switch (name) {
            case 'ytmusic':
                return YoutubeMusic;
            case 'netflix':
                return Netflix;
            case 'youtubeSubscriptions':
                return YoutubeSubscriptions;
        }
    }
    AppWindow.getViewByName = getViewByName;
    var Exiting;
    (function (Exiting) {
        var escapePresses = 0;
        function handleEscapePress() {
            escapePresses++;
            if (escapePresses >= 3) {
                var app_1 = chrome.app.window.current();
                YoutubeMusic.onClose();
                Netflix.onClose();
                YoutubeSubscriptions.onClose();
                window.setTimeout(function () {
                    app_1.close();
                }, 0);
                return;
            }
            window.setTimeout(function () {
                escapePresses--;
            }, 1000);
        }
        Exiting.handleEscapePress = handleEscapePress;
    })(Exiting || (Exiting = {}));
    function prepareEventListeners() {
        var events = ['onBoundsChanged', 'onClosed',
            'onFullscreened', 'onMaximized', 'onMinimized', 'onRestored'];
        events.forEach(function (eventName) {
            AppWindow.app[eventName].addListener(function (event) {
                fireEvent(eventName, event);
            });
        });
    }
    function updateButtonsState() {
        titleBar.classList[AppWindow.app.isMaximized() ? 'add' : 'remove']('maximized');
        titleBar.classList[AppWindow.app.isFullscreen() ? 'add' : 'remove']('fullscreen');
    }
    function setupListeners() {
        listen('onMaximized', updateButtonsState);
        listen('onFullscreened', updateButtonsState);
        listen('onRestored', updateButtonsState);
        window.addEventListener('focus', function () {
            titleBar.classList.add('focused');
            onFocus();
        });
        window.addEventListener('blur', function () {
            titleBar.classList.remove('focused');
        });
        document.querySelector('#fullscreen').addEventListener('click', function () {
            AppWindow.app[AppWindow.app.isFullscreen() ? 'restore' : 'fullscreen']();
        });
        document.querySelector('#minimize').addEventListener('click', function () {
            AppWindow.app.minimize();
        });
        document.querySelector('#maximize').addEventListener('click', function () {
            AppWindow.app[AppWindow.app.isMaximized() ? 'restore' : 'maximize']();
        });
        document.querySelector('#close').addEventListener('click', function () {
            YoutubeMusic.onClose();
            Netflix.onClose();
            YoutubeSubscriptions.onClose();
            window.setTimeout(function () {
                AppWindow.app.close();
            }, 0);
        });
        document.body.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var youtubeSearchPageView = document.getElementById('youtubeSearchPageView');
                if (youtubeSearchPageView) {
                    youtubeSearchPageView.remove();
                    return;
                }
                Exiting.handleEscapePress();
            }
            else if (e.key === 'F11') {
                chrome.runtime.sendMessage({
                    cmd: 'toggleFullscreen'
                });
            }
            else if (e.key === 'F1') {
                switchToview('youtubeSubscriptions');
            }
            else if (e.key === 'F2') {
                switchToview('ytmusic');
            }
            else if (e.key === 'F3') {
                switchToview('netflix');
            }
        });
    }
    function addRuntimeListeners() {
        chrome.runtime.onMessage.addListener(function (message) {
            var activeViewView = getActiveViewView().Commands;
            switch (message.cmd) {
                case 'lowerVolume':
                    activeViewView.lowerVolume();
                    break;
                case 'raiseVolume':
                    activeViewView.raiseVolume();
                    break;
                case 'pausePlay':
                    activeViewView.togglePlay();
                    break;
                case 'pause':
                    activeViewView.pause();
                    break;
                case 'play':
                    activeViewView.play();
                    break;
            }
        });
    }
    function showSpinner() {
        document.getElementById('spinner').classList.add('active');
        document.getElementById('spinnerCont').classList.remove('hidden');
    }
    function hideSpinner() {
        document.getElementById('spinnerCont').classList.add('hidden');
        document.getElementById('spinner').classList.remove('active');
    }
    AppWindow.loadedViews = [];
    function onLoadingComplete(view) {
        console.log('loading ' + view + 'complete');
        AppWindow.loadedViews.push(view);
        if (activeView === view) {
            hideSpinner();
        }
        else {
            getViewByName(view).Commands.pause();
        }
    }
    AppWindow.onLoadingComplete = onLoadingComplete;
    function onMagicButton() {
        if (getActiveView() === 'youtubeSubscriptions') {
            YoutubeSubscriptions.Commands.magicButton();
        }
    }
    AppWindow.onMagicButton = onMagicButton;
    function switchToview(view, first) {
        if (first === void 0) { first = false; }
        if (view === activeView && !first) {
            return;
        }
        if (!first) {
            getActiveViewView().Commands.pause();
        }
        if (AppWindow.loadedViews.indexOf(view) === -1) {
            showSpinner();
            getViewByName(view).init();
        }
        else {
            hideSpinner();
        }
        activeView = view;
        getActiveViewView().onFocus();
        getActiveViewView().Commands.play();
        var viewsEl = document.getElementById('views');
        viewsEl.classList.remove('ytmusic', 'netflix', 'youtubeSubscriptions');
        viewsEl.classList.add(view);
    }
    AppWindow.switchToview = switchToview;
    function init(startView) {
        activeView = startView;
        prepareEventListeners();
        setupListeners();
        addRuntimeListeners();
        YoutubeMusic.setup();
        Netflix.setup();
        YoutubeSubscriptions.setup();
        switchToview(startView, true);
    }
    AppWindow.init = init;
    function getActiveView() {
        return activeView;
    }
    AppWindow.getActiveView = getActiveView;
    function getActiveViewView() {
        return getViewByName(getActiveView());
    }
    AppWindow.getActiveViewView = getActiveViewView;
    function onFocus() {
        getActiveViewView().onFocus();
    }
    AppWindow.onFocus = onFocus;
})(AppWindow || (AppWindow = {}));
AppWindow.init(window.baseView || 'ytmusic');
