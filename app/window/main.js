/// <reference path="../../typings/chrome.d.ts" />
var Helpers;
(function (Helpers) {
    function stringifyFunction(fn) {
        return `(${fn.toString()})();`;
    }
    Helpers.stringifyFunction = stringifyFunction;
    function createTag(fn) {
        const str = fn.toString();
        return (() => {
            var tag = document.createElement('script');
            tag.innerHTML = `(${str})();`;
            document.documentElement.appendChild(tag);
            document.documentElement.removeChild(tag);
        }).toString().replace('str', str);
    }
    function hacksecute(view, fn) {
        if (!view.src) {
            return;
        }
        view.executeScript({
            code: `(${createTag(fn).toString()})();`
                .replace(/\$\{EXTENSIONIDSTRING\}/, chrome.runtime.getURL('').split('://')[1].split('/')[0])
        });
    }
    Helpers.hacksecute = hacksecute;
    let taskIds = 0;
    const taskListeners = {};
    function returnTaskValue(result, id) {
        if (taskListeners[id]) {
            taskListeners[id](result);
        }
        delete taskListeners[id];
    }
    Helpers.returnTaskValue = returnTaskValue;
    ;
    function sendTaskToPage(name, callback) {
        chrome.storage.local.get('tasks', (data) => {
            data['tasks'] = data['tasks'] || [];
            data['tasks'].push({
                name: name,
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
        const arr = [];
        for (let i = 0; i < iterable.length; i++) {
            arr[i] = iterable[i];
        }
        return arr;
    }
    Helpers.toArr = toArr;
})(Helpers || (Helpers = {}));
var YoutubeMusic;
(function (YoutubeMusic) {
    let view = null;
    var Visualization;
    (function (Visualization) {
        let visualizing = false;
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
            Helpers.hacksecute(view, () => {
                if (window.executedYTCA) {
                    return;
                }
                window.executedYTCA = location.href;
                const player = document.querySelector('.html5-video-player');
                const playerApi = document.getElementById('player-api');
                const volumeBar = document.createElement('div');
                const volumeBarBar = document.createElement('div');
                const volumeBarNumber = document.createElement('div');
                const visualizer = document.createElement('div');
                visualizer.classList.add('ytma_visualization_cont');
                document.body.insertBefore(visualizer, document.body.children[0]);
                volumeBar.id = 'yt-ca-volumeBar';
                volumeBarBar.id = 'yt-ca-volumeBarBar';
                volumeBarNumber.id = 'yt-ca-volumeBarNumber';
                let volumeBarTimeout = null;
                let visualizing = false;
                volumeBar.appendChild(volumeBarNumber);
                volumeBar.appendChild(volumeBarBar);
                document.body.appendChild(volumeBar);
                function cleanupData(dataArray) {
                    for (let i in dataArray) {
                        if (dataArray[i] <= -100 || dataArray[i] === -80 || dataArray[i] === -50) {
                            dataArray[i] = 0;
                            continue;
                        }
                        dataArray[i] = (dataArray[i] + 100) / 100;
                    }
                    const newArray = [];
                    //Compress it into a max of 120 bars
                    const delta = (dataArray.length / 120);
                    for (let i = 0; i < dataArray.length; i += delta) {
                        let average = dataArray.slice(i, i + delta).reduce((a, b) => {
                            return a + b;
                        }) / delta;
                        newArray.push(average);
                    }
                    return newArray;
                }
                function renderBars(data) {
                    data.bars.forEach((element, index) => {
                        element.style.transform = `scaleY(${data.parsedArray[index] * 1.5})`;
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
                    const shouldVisualize = document.body.classList.contains('showVisualizer');
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
                    const data = {};
                    data.video = document.querySelector('video');
                    data.ctx = new AudioContext();
                    data.analyser = data.ctx.createAnalyser();
                    data.vidSrc = data.ctx.createMediaElementSource(data.video);
                    data.vidSrc.connect(data.analyser);
                    data.vidSrc.connect(data.ctx.destination);
                    data.dataArray = new Float32Array(data.analyser.frequencyBinCount);
                    data.analyser.getFloatFrequencyData(data.dataArray);
                    data.bars = Array(100).join('a').split('a').map((el) => {
                        let bar = document.createElement('div');
                        bar.classList.add('ytma_visualization_bar');
                        visualizer.appendChild(bar);
                        return bar;
                    });
                    window.setInterval(() => {
                        checkForVisualizer(data);
                    }, 50);
                }
                function prepareVideo() {
                    setTimeout(() => {
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
                                setupVisualizer();
                                localStorage.setItem('loaded', 'ytmusic');
                            }
                        }
                        reloadIfAd();
                    }, 2500);
                }
                prepareVideo();
                document.body.addEventListener('keydown', (e) => {
                    if (e.key === 'h') {
                        //Hide or show video
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
                        expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
                    }));
                }
                //Code that has to be executed "inline"
                function increaseVolume() {
                    let vol = player.getVolume();
                    if (player.isMuted()) {
                        //Treat volume as 0
                        vol = 0;
                        player.unMute();
                    }
                    vol += 5;
                    vol = (vol > 100 ? 100 : vol);
                    setPlayerVolume(vol);
                }
                function lowerVolume() {
                    let vol = player.getVolume();
                    if (!player.isMuted()) {
                        vol -= 5;
                        vol = (vol < 0 ? 0 : vol);
                        setPlayerVolume(vol);
                    }
                }
                function showVolumeBar() {
                    const volume = player.getVolume();
                    localStorage.setItem('volume', volume + '');
                    volumeBarNumber.innerHTML = volume + '';
                    volumeBarBar.style.transform = `scaleX(${volume / 100})`;
                    volumeBar.classList.add('visible');
                    if (volumeBarTimeout !== null) {
                        window.clearTimeout(volumeBarTimeout);
                    }
                    volumeBarTimeout = window.setTimeout(() => {
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
                    videoEl.addEventListener('wheel', (e) => {
                        onScroll(e.deltaY > 0);
                    });
                }
                addListeners();
                function executeTask(name, id) {
                    let result = null;
                    switch (name) {
                        case 'getTime':
                            result = document.querySelector('.html5-video-player').getCurrentTime();
                            break;
                        default:
                            if (name.indexOf('getSongName') > -1) {
                                let timestampContainers = document
                                    .querySelector('#eow-description')
                                    .querySelectorAll('a[href="#"]');
                                const index = ~~name.split('getSongName')[1];
                                const textNodes = [];
                                if (!isNaN(index) && timestampContainers[index]) {
                                    let currentNode = timestampContainers[index].previousSibling;
                                    //Search back until a <br> is found
                                    while (currentNode && currentNode.tagName !== 'BR') {
                                        if (!currentNode.tagName) {
                                            textNodes.push(currentNode.nodeValue);
                                        }
                                        currentNode = currentNode.previousSibling;
                                    }
                                    currentNode = timestampContainers[index].nextSibling;
                                    //Search forward until a <br> is found
                                    while (currentNode && currentNode.tagName !== 'BR') {
                                        if (!currentNode.tagName) {
                                            textNodes.push(currentNode.nodeValue);
                                        }
                                        currentNode = currentNode.nextSibling;
                                    }
                                    //Go through list and find something that resembles a song
                                    for (let i = 0; i < textNodes.length; i++) {
                                        if (/.+-.+/.test(textNodes[i])) {
                                            //This is a song
                                            result = textNodes[i];
                                            break;
                                        }
                                    }
                                    if (!result) {
                                        //Just try this instead
                                        result = textNodes[0];
                                    }
                                }
                                else {
                                    result = null;
                                }
                            }
                            break;
                    }
                    localStorage.setItem(`taskResult${id}`, result);
                }
                function checkForTasks() {
                    let tasks;
                    if ((tasks = localStorage.getItem('tasks'))) {
                        try {
                            tasks = JSON.parse(tasks);
                        }
                        catch (e) {
                            tasks = [];
                        }
                        if (Array.isArray(tasks) && tasks.length > 0) {
                            tasks.forEach((task) => {
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
        let songFoundTimeout = null;
        let songFoundName = '';
        function downloadSong() {
            //Search for it on youtube
            const view = document.createElement('#ytmaWebview');
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
            view.src = `https://www.youtube.com/results?search_query=${encodeURIComponent(songFoundName.trim().replace(/ /g, '+')).replace(/%2B/g, '+')}&page=&utm_source=opensearch`;
            document.body.appendChild(view);
        }
        Downloading.downloadSong = downloadSong;
        document.getElementById('getSongDownload').addEventListener('click', downloadSong);
        function displayFoundSong(name) {
            document.getElementById('getSongName').innerHTML = name;
            const dialog = document.getElementById('getSongDialog');
            dialog.classList.add('visible');
            dialog.classList.add('hoverable');
            if (songFoundTimeout !== null) {
                window.clearTimeout(songFoundTimeout);
            }
            songFoundName = name;
            songFoundTimeout = window.setTimeout(() => {
                dialog.classList.remove('visible');
                window.setTimeout(() => {
                    dialog.classList.remove('hoverable');
                }, 200);
            }, 5000);
        }
        function timestampToSeconds(timestamp) {
            const split = timestamp.split(':');
            let seconds = 0;
            for (let i = split.length - 1; i >= 0; i--) {
                seconds = Math.pow(60, (split.length - (i + 1))) * ~~split[i];
            }
            return seconds;
        }
        function getSongIndex(timestamps, time) {
            for (let i = 0; i < timestamps.length; i++) {
                if (timestamps[i] <= time && timestamps[i + 1] >= time) {
                    return i;
                }
            }
            return timestamps.length - 1;
        }
        function getCurrentSong() {
            Helpers.sendTaskToPage('getTimestamps', (timestamps) => {
                const enableOCR = false;
                if (enableOCR && !timestamps) {
                }
                else if (timestamps) {
                    if (!Array.isArray(timestamps)) {
                        //It's a link to the tracklist
                        window.fetch(timestamps).then((response) => {
                            return response.text();
                        }).then((html) => {
                            const doc = document.createRange().createContextualFragment(html);
                            const tracks = Helpers.toArr(doc.querySelectorAll('.tlpTog')).map((songContainer) => {
                                try {
                                    const nameContainer = songContainer.querySelector('.trackFormat');
                                    const namesContainers = nameContainer.querySelectorAll('.blueTxt, .blackTxt');
                                    const artist = namesContainers[0].innerText;
                                    const songName = namesContainers[1].innerText;
                                    let remix = '';
                                    if (namesContainers[2]) {
                                        remix = ` (${namesContainers[2].innerText} ${namesContainers[3].innerText})`;
                                    }
                                    return {
                                        startTime: timestampToSeconds(songContainer.querySelector('.cueValueField').innerText),
                                        songName: `${artist} - ${songName}${remix}`
                                    };
                                }
                                catch (e) {
                                    return null;
                                }
                            });
                            Helpers.sendTaskToPage('getTime', (time) => {
                                const index = getSongIndex(tracks.filter((track) => {
                                    return !!track;
                                }).map((track) => {
                                    return track.startTime;
                                }), ~~time);
                                displayFoundSong(tracks[index].songName);
                            });
                        });
                    }
                    else {
                        Helpers.sendTaskToPage('getTime', (time) => {
                            const index = getSongIndex(timestamps, ~~time);
                            Helpers.sendTaskToPage('getSongName' + index, (name) => {
                                displayFoundSong(name);
                            });
                        });
                    }
                }
                else {
                    //Show not found toast
                    const toast = document.getElementById('mainToast');
                    toast.classList.add('visible');
                    window.setTimeout(() => {
                        toast.classList.remove('visible');
                    }, 5000);
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
        document.getElementById('youtubeSearchPageView').remove();
        window.open(`http://www.youtube-mp3.org/#v${url.split('?v=')[1]}`, '_blank');
    }
    YoutubeMusic.downloadVideo = downloadVideo;
    var Commands;
    (function (Commands) {
        function lowerVolume() {
            Helpers.hacksecute(view, () => {
                const player = document.querySelector('.html5-video-player');
                let vol = player.getVolume();
                if (!player.isMuted()) {
                    vol -= 5;
                    vol = (vol < 0 ? 0 : vol);
                    player.setVolume(vol);
                }
            });
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
            Helpers.hacksecute(view, () => {
                const player = document.querySelector('.html5-video-player');
                let vol = player.getVolume();
                if (player.isMuted()) {
                    //Treat volume as 0
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
            Helpers.hacksecute(view, () => {
                const player = document.querySelector('.html5-video-player');
                const state = player.getPlayerState();
                if (state === 2) {
                    //Paused
                    player.playVideo();
                }
                else if (state === 1) {
                    //Playing
                    player.pauseVideo();
                }
                else {
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(view, () => {
                const player = document.querySelector('.html5-video-player');
                player.pauseVideo();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(view, () => {
                const player = document.querySelector('.html5-video-player');
                player.playVideo();
            });
        }
        Commands.play = play;
    })(Commands = YoutubeMusic.Commands || (YoutubeMusic.Commands = {}));
    function blockViewAds() {
        const CANCEL = {
            cancel: true
        };
        const AD_URL_REGEX = new RegExp([
            "://[^/]+.doubleclick.net",
            "://[^/]+.googlesyndication.com",
            "/ad_frame?",
            "/api/stats/ads?",
            "/annotations_invideo?",
            "ad3-w+.swf"
        ].join('|'), 'i');
        view.request.onBeforeRequest.addListener((request) => {
            if (AD_URL_REGEX.exec(request.url)) {
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
        view.addEventListener('contentload', (e) => {
            Content.init();
        });
        view.addEventListener('loadcommit', (e) => {
            if (e.isTopLevel) {
                window.setTimeout(Content.init, 1000);
            }
        });
        view.addEventListener('newwindow', (e) => {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', () => {
            view.focus();
        });
        view.addEventListener('keydown', (e) => {
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
            chrome.storage.sync.get('url', (data) => {
                launch(data['url']);
            });
        }
    }
    YoutubeMusic.respondUrl = respondUrl;
    function addListeners() {
        AppWindow.listen('onMinimized', () => {
            if (Visualization.isVisualizing()) {
                Helpers.hacksecute(view, () => {
                    document.body.classList.remove('showVisualizer');
                });
            }
        });
        AppWindow.listen('onRestored', () => {
            if (!AppWindow.app.isMinimized() && Visualization.isVisualizing()) {
                Helpers.hacksecute(view, () => {
                    document.body.classList.add('showVisualizer');
                });
            }
        });
        document.body.addEventListener('keydown', (e) => {
            if (AppWindow.getActiveView() !== 'youtubeMusic') {
                return;
            }
            if (e.key === 'd') {
                Downloading.downloadSong();
            }
            else if (e.key === 'v') {
                Visualization.toggle();
                Helpers.hacksecute(view, () => {
                    document.body.classList.toggle('showVisualizer');
                });
            }
        });
        Helpers.toArr(document.querySelectorAll('.toast .dismissToast')).forEach((toastButton) => {
            toastButton.addEventListener('click', () => {
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
        window.setTimeout(() => {
            addViewListeners();
            document.querySelector('#youtubePlaylistCont').appendChild(view);
            addListeners();
        }, 10);
    }
    YoutubeMusic.setup = setup;
    function onClose() {
        //Save progress
        view.executeScript({
            code: `(${(() => {
                const vidId = location.href.split('v=')[1].split('&')[0];
                let vidIndex = location.href.split('index=')[1];
                if (vidIndex.indexOf('&') > -1) {
                    vidIndex = vidIndex.split('&')[0];
                }
                const [mins, secs] = document.querySelector('.ytp-time-current').innerHTML.split(':');
                const address = 'https://www.youtube.com/watch';
                const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${mins}m${secs}s`;
                chrome.runtime.sendMessage({
                    cmd: 'setUrl',
                    url: url
                });
            }).toString()})()`
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
        const view = document.createElement('webview');
        view.setAttribute('partition', 'persist:netflix');
        view.addEventListener('newwindow', (e) => {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', () => {
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
            window.setTimeout(() => {
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
            //Not possible
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
            //Not possible
        }
        Commands.raiseVolume = raiseVolume;
        function togglePlay() {
            Helpers.hacksecute(Video.videoView, () => {
                const video = document.querySelector('video');
                if (!window.playerStatus) {
                    //The states should be matching now
                    window.playerStatus = video.paused ?
                        'paused' : 'playing';
                }
                const playerStatus = window.playerStatus;
                const videoStatus = video.paused ?
                    'paused' : 'playing';
                const playButton = document.querySelector('.player-control-button');
                if (playerStatus === videoStatus) {
                    //Statusses match up, switch it the normal way
                    playButton.click();
                    window.playerStatus = (window.playerStatus === 'playing' ? 'paused' : 'playing');
                }
                else {
                    //Statusses don't match up, hit the button twice
                    playButton.click();
                    playButton.click();
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(Video.videoView, () => {
                const video = document.querySelector('video');
                video.pause();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(Video.videoView, () => {
                const video = document.querySelector('video');
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
        window.setTimeout(() => {
            Video.videoView.src = 'https://www.netflix.com/browse';
        }, 15);
    }
    Netflix.init = init;
    function onClose() {
        //Go for a semi-clean exit
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
        const view = document.createElement('webview');
        view.setAttribute('partition', 'persist:youtubeSubscriptions');
        view.addEventListener('newwindow', (e) => {
            window.open(e.targetUrl, '_blank');
        });
        window.addEventListener('focus', () => {
            view.focus();
        });
        document.querySelector('#youtubeSubsCont').appendChild(view);
        return view;
    }
    var Commands;
    (function (Commands) {
        function lowerVolume() {
            Helpers.hacksecute(Video.videoView, () => {
                const player = document.querySelector('.html5-video-player');
                let vol = player.getVolume();
                if (!player.isMuted()) {
                    vol -= 5;
                    vol = (vol < 0 ? 0 : vol);
                    player.setVolume(vol);
                }
            });
        }
        Commands.lowerVolume = lowerVolume;
        function raiseVolume() {
            Helpers.hacksecute(Video.videoView, () => {
                const player = document.querySelector('.html5-video-player');
                let vol = player.getVolume();
                if (player.isMuted()) {
                    //Treat volume as 0
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
            Helpers.hacksecute(Video.videoView, () => {
                const player = document.querySelector('.html5-video-player');
                const state = player.getPlayerState();
                if (state === 2) {
                    //Paused
                    player.playVideo();
                }
                else if (state === 1) {
                    //Playing
                    player.pauseVideo();
                }
                else {
                }
            });
        }
        Commands.togglePlay = togglePlay;
        function pause() {
            Helpers.hacksecute(Video.videoView, () => {
                const player = document.querySelector('.html5-video-player');
                player.pauseVideo();
            });
        }
        Commands.pause = pause;
        function play() {
            Helpers.hacksecute(Video.videoView, () => {
                const player = document.querySelector('.html5-video-player');
                player.playVideo();
            });
            if (Video.videoView.src) {
                showVideo();
            }
        }
        Commands.play = play;
        function magicButton() {
            SubBox.subBoxView.executeScript({
                code: Helpers.stringifyFunction(() => {
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
            window.setTimeout(() => {
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
                Video.videoView.addEventListener('contentload', () => {
                    Helpers.hacksecute(Video.videoView, () => {
                        const player = document.querySelector('.html5-video-player');
                        const playerApi = document.getElementById('player-api');
                        const volumeBar = document.createElement('div');
                        const volumeBarBar = document.createElement('div');
                        const volumeBarNumber = document.createElement('div');
                        let volumeBarTimeout = null;
                        volumeBar.id = 'yt-ca-volumeBar';
                        volumeBarBar.id = 'yt-ca-volumeBarBar';
                        volumeBarNumber.id = 'yt-ca-volumeBarNumber';
                        volumeBar.appendChild(volumeBarNumber);
                        volumeBar.appendChild(volumeBarBar);
                        document.body.appendChild(volumeBar);
                        function prepareVideo() {
                            setTimeout(() => {
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
                        document.body.addEventListener('keydown', (e) => {
                            if (e.key === 'k') {
                                //Hide or show video
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
                                expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
                            }));
                        }
                        //Code that has to be executed "inline"
                        function increaseVolume() {
                            let vol = player.getVolume();
                            if (player.isMuted()) {
                                //Treat volume as 0
                                vol = 0;
                                player.unMute();
                            }
                            vol += 5;
                            vol = (vol > 100 ? 100 : vol);
                            setPlayerVolume(vol);
                        }
                        function lowerVolume() {
                            let vol = player.getVolume();
                            if (!player.isMuted()) {
                                vol -= 5;
                                vol = (vol < 0 ? 0 : vol);
                                setPlayerVolume(vol);
                            }
                        }
                        function showVolumeBar() {
                            const volume = player.getVolume();
                            localStorage.setItem('volume', volume + '');
                            volumeBarNumber.innerHTML = volume + '';
                            volumeBarBar.style.transform = `scaleX(${volume / 100})`;
                            volumeBar.classList.add('visible');
                            if (volumeBarTimeout !== null) {
                                window.clearTimeout(volumeBarTimeout);
                            }
                            volumeBarTimeout = window.setTimeout(() => {
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
                            videoEl.addEventListener('wheel', (e) => {
                                onScroll(e.deltaY > 0);
                            });
                        }
                        addListeners();
                    });
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
            window.setTimeout(() => {
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
    function hideVideo() {
        document.getElementById('youtubeSubsCont').classList.remove('showVideo');
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
        document.body.addEventListener('keydown', (e) => {
            if (AppWindow.getActiveView() !== 'youtubeSubscriptions') {
                return;
            }
            if (e.key === 'h') {
                const subsCont = document.getElementById('youtubeSubsCont');
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
        window.setTimeout(() => {
            SubBox.subBoxView.src = 'http://www.youtube.com/feed/subscriptions';
            addKeyboardListeners();
        }, 15);
    }
    YoutubeSubscriptions.init = init;
    function onClose() {
        //Nothing really
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
    const titleBar = document.querySelector('#titleBar');
    let activeView = null;
    const listeners = [];
    function listen(event, callback) {
        listeners.push({
            event: event,
            callback: callback
        });
    }
    AppWindow.listen = listen;
    function fireEvent(event, data) {
        listeners.filter((listener) => {
            return listener.event === event;
        }).forEach((listener) => {
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
        let escapePresses = 0;
        function handleEscapePress() {
            escapePresses++;
            if (escapePresses >= 3) {
                //Close app
                const app = chrome.app.window.current();
                YoutubeMusic.onClose();
                Netflix.onClose();
                YoutubeSubscriptions.onClose();
                window.setTimeout(() => {
                    app.close();
                }, 0);
                return;
            }
            window.setTimeout(() => {
                //Remove it from the array
                escapePresses--;
            }, 1000);
        }
        Exiting.handleEscapePress = handleEscapePress;
    })(Exiting || (Exiting = {}));
    function prepareEventListeners() {
        const events = ['onBoundsChanged', 'onClosed',
            'onFullscreened', 'onMaximized', 'onMinimized', 'onRestored'];
        events.forEach((eventName) => {
            AppWindow.app[eventName].addListener((event) => {
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
        window.addEventListener('focus', () => {
            titleBar.classList.add('focused');
        });
        window.addEventListener('blur', () => {
            titleBar.classList.remove('focused');
        });
        document.querySelector('#fullscreen').addEventListener('click', () => {
            AppWindow.app[AppWindow.app.isFullscreen() ? 'restore' : 'fullscreen']();
        });
        document.querySelector('#minimize').addEventListener('click', () => {
            AppWindow.app.minimize();
        });
        document.querySelector('#maximize').addEventListener('click', () => {
            AppWindow.app[AppWindow.app.isMaximized() ? 'restore' : 'maximize']();
        });
        document.querySelector('#close').addEventListener('click', () => {
            YoutubeMusic.onClose();
            Netflix.onClose();
            YoutubeSubscriptions.onClose();
            window.setTimeout(() => {
                AppWindow.app.close();
            }, 0);
        });
        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const youtubeSearchPageView = document.getElementById('youtubeSearchPageView');
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
            const activeViewView = getActiveViewView().Commands;
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
    }
    AppWindow.onLoadingComplete = onLoadingComplete;
    function onMagicButton() {
        if (getActiveView() === 'youtubeSubscriptions') {
            YoutubeSubscriptions.Commands.magicButton();
        }
    }
    AppWindow.onMagicButton = onMagicButton;
    function switchToview(view, first = false) {
        if (view === activeView && !first) {
            return;
        }
        if (!first) {
            //Pause current view
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
        const viewsEl = document.getElementById('views');
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
})(AppWindow || (AppWindow = {}));
AppWindow.init(window.baseView || 'ytmusic');
