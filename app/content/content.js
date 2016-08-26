window.saveProgress = () => {
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
}

const canv = document.createElement('canvas');
canv.width = 1280;
canv.height = 720;
const ctx = canv.getContext('2d');

function updateColors() {
	ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
	const uri = canv.toDataURL('image/png');
	const img = document.createElement('img');
	img.src = uri;	
	
	const usedColors = {};
	[
		ctx.getImageData(0, 0, canv.width, 2).data,
		ctx.getImageData(0, canv.height - 2, canv.width, 2).data,
		ctx.getImageData(0, 2, 2, canv.height - 4).data,
		ctx.getImageData(canv.width - 4, 2, 2, canv.height - 4).data
	].forEach((dataSet) => {
		for (let i = 0; i < dataSet.length; i += 4) {
			const str = `${dataSet[i]},${dataSet[i + 1]},${dataSet[i + 2]}`;
			usedColors[str] = (
				usedColors[str] ? usedColors[str] + 1 : 1
			);
		}
	});

	//Turn obj into array
	let mostUsedColor = 'rgb(255,255,255)';
	let mostUsedColorCount = 0;
	for (let color in usedColors) {
		if (usedColors.hasOwnProperty(color)) {
			if (usedColors[color] > mostUsedColorCount) {
				mostUsedColor = color;
				mostUsedColorCount = usedColors[color];
			}
		}
	}

	document.querySelector('video').style.backgroundColor = `rgb(${mostUsedColor})`;
}

function uncirculizeWord(word) {
	return {
		bbox: word.bbox,
		text: word.text,
		confidence: word.confidence,
		choices: word.choices
	}
}

const imageModel = [];
function uploadImageModel(newData) {
	imageModel.push({
		lines: newData.lines.map((line) => {
			return {
				bbox: line.bbox,
				text: line.text,
				confidence: line.confidence,
				words: line.words.map(uncirculizeWord)
			}
		}),
		text: newData.text,
		words: newData.words.map(uncirculizeWord)
	});
	chrome.storage.local.set({
		imageModel: imageModel
	});
}

function updateImageModel() {
	ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
	const img = new Image();
	img.src = canv.toDataURL('image/png');

	Tesseract.recognize(img, {
		lang: 'eng'
	}).then((result) => {
		uploadImageModel(result);
	});
}

window.setInterval(updateColors, 10000);
updateColors();
//window.setInterval(updateImageModel, 5000);
//updateImageModel();
window.setInterval(window.saveProgress, 30000);

//Ad blocking
! function(a) {
    function i(t) {
        if (e[t]) return e[t].exports;
        var o = e[t] = {
            exports: {},
            id: t,
            loaded: !1
        };
        return a[t].call(o.exports, o, o.exports, i), o.loaded = !0, o.exports
    }
    var e = {};
    return i.m = a, i.c = e, i.p = "", i(0)
}([function(a, i, e) {
    a.exports = e(1)
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }

    function o(a) {
        if (a && a.__esModule) return a;
        var i = {};
        if (null != a)
            for (var e in a) Object.prototype.hasOwnProperty.call(a, e) && (i[e] = a[e]);
        return i["default"] = a, i
    }

    function n(a, i) {
        if (!(a instanceof i)) throw new TypeError("Cannot call a class as a function")
    }
    var s = function() {
        function a(a, i) {
            for (var e = 0; e < i.length; e++) {
                var t = i[e];
                t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(a, t.key, t)
            }
        }
        return function(i, e, t) {
            return e && a(i.prototype, e), t && a(i, t), i
        }
    }();
    e(2);
    var r = e(3),
        u = o(r),
        c = e(5),
        h = t(c),
        l = e(7),
        m = t(l),
        d = e(8),
        k = t(d),
        g = e(9),
        f = t(g),
        p = e(10),
        y = e(11),
        b = t(y),
        v = e(14),
        x = t(v),
        w = /^https?:\/\/(\w*.)?youtube.com/i,
        z = /^https?:\/\/.*\.youtube.com\/ptracking/,
        j = (0, b["default"])(m["default"], 2e3),
        C = function() {
            function a() {
                n(this, a), this.loadOptions(), this.requestPathDetector = new f["default"](w), this.blocker = new x["default"], this.fetchEarlyTabs(), this.bindEvents()
            }
            return s(a, [{
                key: "bindEvents",
                value: function() {
                    var a = this;
                    chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this)), chrome.runtime.onInstalled.addListener(function(i) {
                        "install" === i.reason ? a.onInstalled(i) : "update" === i.reason && a.onUpdated(i)
                    }), chrome.runtime.onMessage.addListener(this.onMessage.bind(this)), chrome.webRequest.onBeforeRequest.addListener(this.onBeforeWebRequest.bind(this), {
                        urls: ["http://*/*", "https://*/*"],
                        types: ["main_frame", "stylesheet", "script", "image", "object", "sub_frame", "xmlhttprequest", "other"]
                    }, ["blocking"])
                }
            }, {
                key: "onBeforeWebRequest",
                value: function(a) {
                    return this.requestPathDetector.addContext(a), this.requestPathDetector.test(a) ? this._adblockEnabled && this.blocker.isAdRequest(a) ? (j(this.adblockEnabled, a.tabId), {
                        cancel: !0
                    }) : this._annotationsBlockEnabled && this.blocker.isAnnotationsRequest(a) ? (j(this.adblockEnabled, a.tabId), {
                        cancel: !0
                    }) : void(this._adblockEnabled && this.isYoutubeTrackingURL(a.url) && h["default"].incr("videoViewCount")) : void 0
                }
            }, {
                key: "onTabUpdated",
                value: function(a, i, e) {
                    i.favIconUrl || this.isYoutubeURL(e.url) && (j(this.adblockEnabled, a), this.adblockEnabled && (0, k["default"])(a))
                }
            }, {
                key: "isYoutubeURL",
                value: function(a) {
                    return w.test(a)
                }
            }, {
                key: "isYoutubeTrackingURL",
                value: function(a) {
                    return z.test(a)
                }
            }, {
                key: "loadOptions",
                value: function() {
                    var a = u.DEFAULT_OPTIONS;
                    this.adblockEnabled = h["default"].get("adblockEnabled", a.adblockEnabled), this.annotationsBlockEnabled = h["default"].get("annotationsBlockEnabled", a.annotationsBlockEnabled), this.autoUpdate = h["default"].get("autoUpdate", a.autoUpdate)
                }
            }, {
                key: "restoreDefaults",
                value: function() {
                    var a = this,
                        i = u.DEFAULT_OPTIONS;
                    Object.keys(i).forEach(function(e) {
                        a[e] = i[e]
                    })
                }
            }, {
                key: "onMessage",
                value: function(a, i, e) {
                    switch (a.action) {
                        case "toggle:adblockEnabled":
                            e(this.adblockEnabled = !this.adblockEnabled);
                            break;
                        case "toggle:annotationsBlockEnabled":
                            e(this.annotationsBlockEnabled = !this.annotationsBlockEnabled);
                            break;
                        case "TOGGLE_SETTING":
                            e(this[a.setting] = !this[a.setting])
                    }
                }
            }, {
                key: "onInstalled",
                value: function(a) {
                    this.restoreDefaults(), (0, p.trackEvent)("Extension", "installed", chrome.runtime.getManifest().version), this.openInstallPage()
                }
            }, {
                key: "fetchEarlyTabs",
                value: function() {
                    chrome.tabs.query({
                        url: "*://*.youtube.com/*"
                    }, function(a) {
                        a.forEach(function(a) {
                            (0, k["default"])(a.id)
                        })
                    })
                }
            }, {
                key: "openInstallPage",
                value: function() {
                    chrome.tabs.create({
                        url: chrome.runtime.getURL("pages/install.html"),
                        active: !0
                    }, function() {
                        h["default"].set("repairPageTiggerd", !0)
                    })
                }
            }, {
                key: "onUpdated",
                value: function(a) {
                    (0, p.trackEvent)("Extension", "updated", chrome.runtime.getManifest().version);
                    var i = 0 === a.previousVersion.indexOf("3.");
                    i && chrome.storage.local.remove("filterList")
                }
            }, {
                key: "adblockEnabled",
                set: function(a) {
                    return this._adblockEnabled = a, h["default"].set("adblockEnabled", a), j(a), a
                },
                get: function() {
                    return this._adblockEnabled
                }
            }, {
                key: "annotationsBlockEnabled",
                set: function(a) {
                    return this._annotationsBlockEnabled = a, h["default"].set("annotationsBlockEnabled", a), a
                },
                get: function() {
                    return this._annotationsBlockEnabled
                }
            }, {
                key: "autoUpdate",
                set: function(a) {
                    return h["default"].set("autoUpdate", a), a
                },
                get: function() {
                    return h["default"].get("autoUpdate")
                }
            }, {
                key: "videoViewCount",
                get: function() {
                    return h["default"].get("videoViewCount", 0)
                }
            }]), a
        }();
    window.store = h["default"], window.app = new C
}, function(a, i, e) {
    "use strict"
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(4),
        n = t(o),
        s = chrome.runtime.id;
    i.EXTENSION_ID = s;
    var r = "https://chrome.google.com/webstore/detail/" + s;
    i.WEBSTORE_LINK = r;
    var u = "https://chrome.google.com/webstore/detail/" + s + "/reviews";
    i.WEBSTORE_REVIEW_LINK = u;
    var c = "http://www.facebook.com/plugins/like.php?href=" + encodeURIComponent(r) + "&send=false&layout=standard&width=450&show_faces=true&font&colorscheme=light&action=recommend&height=80&appId=314647198631310";
    i.FACEBOOK_IFRAME_LIKE_LINK = c;
    var h = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(r);
    i.FACEBOOK_SHARE_LINK = h;
    var l = localStorage["ads:enabled"],
        m = localStorage["annotations:enabled"],
        d = {
            adblockEnabled: (0, n["default"])(l) ? !0 : l,
            annotationsBlockEnabled: (0, n["default"])(m) ? !1 : m,
            autoUpdate: !0
        };
    i.DEFAULT_OPTIONS = d
}, function(a, i) {
    function e(a) {
        return void 0 === a
    }
    a.exports = e
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(6),
        n = t(o);
    n["default"].incr = function(a) {
        var i = arguments.length <= 1 || void 0 === arguments[1] ? 1 : arguments[1],
            e = this.get(a, 0) + i;
        return this.set(a, e), e
    }, i["default"] = n["default"], a.exports = i["default"]
}, function(a, i, e) {
    ! function(e, t) {
        "undefined" != typeof a && a.exports && (i = a.exports = t(e, i))
    }(this, function(a, i) {
        "use strict";
        return Array.prototype.indexOf || (Array.prototype.indexOf = function(a) {
            var i = this.length >>> 0,
                e = Number(arguments[1]) || 0;
            for (e = 0 > e ? Math.ceil(e) : Math.floor(e), 0 > e && (e += i); i > e; e++)
                if (e in this && this[e] === a) return e;
            return -1
        }), i.prefix = "", i._getPrefixedKey = function(a, i) {
            return i = i || {}, i.noPrefix ? a : this.prefix + a
        }, i.set = function(a, i, e) {
            var t = this._getPrefixedKey(a, e);
            try {
                localStorage.setItem(t, JSON.stringify({
                    data: i
                }))
            } catch (o) {
                console
            }
        }, i.get = function(a, i, e) {
            var t, o = this._getPrefixedKey(a, e);
            try {
                t = JSON.parse(localStorage.getItem(o))
            } catch (n) {
                try {
                    t = localStorage[o] ? JSON.parse('{"data":"' + localStorage.getItem(o) + '"}') : null
                } catch (n) {
                    console
                }
            }
            return null === t ? i : "undefined" != typeof t.data ? t.data : i
        }, i.sadd = function(a, e, t) {
            var o, n = this._getPrefixedKey(a, t),
                s = i.smembers(a);
            if (s.indexOf(e) > -1) return null;
            try {
                s.push(e), o = JSON.stringify({
                    data: s
                }), localStorage.setItem(n, o)
            } catch (r) {
                console
            }
        }, i.smembers = function(a, i) {
            var e, t = this._getPrefixedKey(a, i);
            try {
                e = JSON.parse(localStorage.getItem(t))
            } catch (o) {
                e = null
            }
            return null === e ? [] : e.data || []
        }, i.sismember = function(a, e, t) {
            this._getPrefixedKey(a, t);
            return i.smembers(a).indexOf(e) > -1
        }, i.getAll = function() {
            var a = Object.keys(localStorage);
            return a.map(function(a) {
                return i.get(a)
            })
        }, i.srem = function(a, e, t) {
            var o, n, s = this._getPrefixedKey(a, t),
                r = i.smembers(a, e);
            n = r.indexOf(e), n > -1 && r.splice(n, 1), o = JSON.stringify({
                data: r
            });
            try {
                localStorage.setItem(s, o)
            } catch (u) {
                console
            }
        }, i.rm = function(a) {
            localStorage.removeItem(a)
        }, i.flush = function() {
            localStorage.clear()
        }, i
    })
}, function(a, i) {
    "use strict";

    function e(a) {
        var i = a.tabId,
            e = a.path,
            t = a.title;
        chrome.browserAction.setIcon({
            tabId: i,
            path: e
        }, function() {
            chrome.runtime.lastError || chrome.browserAction.setTitle({
                tabId: i,
                title: t
            })
        })
    }

    function t(a, i) {
        return i ? void e(a ? {
            tabId: i,
            path: s,
            title: o
        } : {
            tabId: i,
            path: r,
            title: n
        }) : void chrome.tabs.query({
            url: "*://*.youtube.com/*"
        }, function(i) {
            i.forEach(function(i) {
                t(a, i.id)
            })
        })
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = t;
    var o = chrome.i18n.getMessage("page_action_title"),
        n = chrome.i18n.getMessage("disabled"),
        s = {
            19: "../images/icon-19.png",
            38: "../images/icon-38.png"
        },
        r = {
            19: "../images/icon-19-disabled.png",
            38: "../images/icon-38-disabled.png"
        };
    a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e(a) {
        chrome.tabs.executeScript(a, {
            file: "scripts/content.branding.js",
            runAt: "document_start"
        }, function() {
            chrome.runtime.lastError || (chrome.tabs.insertCSS(a, {
                file: "styles/content.blocker.css"
            }), chrome.tabs.insertCSS(a, {
                file: "styles/content.branding.css"
            }))
        })
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e(a, i) {
        if (!(a instanceof i)) throw new TypeError("Cannot call a class as a function")
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var t = function() {
            function a(a, i) {
                for (var e = 0; e < i.length; e++) {
                    var t = i[e];
                    t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(a, t.key, t)
                }
            }
            return function(i, e, t) {
                return e && a(i.prototype, e), t && a(i, t), i
            }
        }(),
        o = function() {
            function a(i) {
                e(this, a), this.GC_CYCLE = 5e3, this.GC_MIN_AGE = 5e3, this.ADD_CONTEXT_TYPES = ["main_frame", "sub_frame"], this.tabStore = new Map, this.frameStore = new Map, this.lastTabContext = null, this.matchURLRegex = i, this.loadInitalTabs(), this.bindEvents(), setInterval(this.collectGarbage.bind(this), this.GC_CYCLE)
            }
            return t(a, [{
                key: "getAllTabs",
                value: function(a) {
                    chrome.tabs.query({}, a)
                }
            }, {
                key: "collectGarbage",
                value: function() {
                    var a = this;
                    this.getAllTabs(function(i) {
                        var e = Date.now(),
                            t = i.map(function(a) {
                                return a.id
                            });
                        a.tabStore.forEach(function(i, o) {
                            var n = i.timeStamp + a.GC_MIN_AGE < e; - 1 === t.indexOf(o) && n && a.tabStore["delete"](o)
                        })
                    })
                }
            }, {
                key: "loadInitalTabs",
                value: function() {
                    var a = this;
                    this.getAllTabs(function(i) {
                        i.forEach(function(i) {
                            a.tabStore.set(i.id, {
                                url: i.url,
                                tabId: i.id
                            })
                        })
                    })
                }
            }, {
                key: "bindEvents",
                value: function() {
                    var a = this;
                    chrome.tabs.onUpdated.addListener(function(i, e, t) {
                        var o = t.url;
                        a._addTabContext({
                            tabId: i,
                            url: o
                        })
                    }), chrome.tabs.onRemoved.addListener(this.removeTab.bind(this)), chrome.tabs.onReplaced.addListener(function(i, e) {
                        a.removeTab(e)
                    })
                }
            }, {
                key: "removeTab",
                value: function(a) {
                    var i = this;
                    this.tabStore["delete"](a), this.frameStore.forEach(function(e) {
                        e.tabId === a && i.frameStore["delete"](e.frameId)
                    })
                }
            }, {
                key: "contextFactory",
                value: function(a) {
                    var i = a.tabId,
                        e = a.frameId,
                        t = a.parentFrameId,
                        o = a.url,
                        n = a.timeStamp,
                        s = void 0 === n ? Date.now() : n,
                        r = this.matchURLRegex.test(o);
                    return {
                        tabId: i,
                        frameId: e,
                        parentFrameId: t,
                        url: o,
                        timeStamp: s,
                        isTargetURL: r
                    }
                }
            }, {
                key: "_addTabContext",
                value: function(a) {
                    this.lastTabContext = this.contextFactory(a), this.tabStore.set(a.tabId, this.lastTabContext)
                }
            }, {
                key: "_addFrameContext",
                value: function(a) {
                    var i = this.contextFactory(a);
                    this.frameStore.set(a.frameId, i)
                }
            }, {
                key: "isRootContext",
                value: function(a) {
                    var i = a.type;
                    return -1 !== this.ADD_CONTEXT_TYPES.indexOf(i)
                }
            }, {
                key: "addContext",
                value: function(a) {
                    return this.isRootContext(a) ? 0 === a.frameId ? this._addTabContext(a) : this._addFrameContext(a) : void 0
                }
            }, {
                key: "getStack",
                value: function(a) {
                    var i = arguments.length <= 1 || void 0 === arguments[1] ? [] : arguments[1],
                        e = a.tabId,
                        t = a.frameId,
                        o = a.parentFrameId;
                    if (-1 === e) {
                        if (t > 0) {
                            var n = this.frameStore.get(t);
                            i.push(n)
                        }
                        return i
                    }
                    if (0 === t) {
                        var n = this.tabStore.get(e);
                        return i.push(n), i
                    }
                    if (t > 0) {
                        var n = this.frameStore.get(t);
                        i.push(n)
                    }
                    if (0 === o) {
                        var n = this.tabStore.get(e);
                        return i.push(n), i
                    }
                    if (o > 0) {
                        var n = this.frameStore.get(o);
                        if (!n) {
                            var s = this.tabStore.get(e);
                            return i.push(s), i
                        }
                        return this.getStack(n, i)
                    }
                    return i
                }
            }, {
                key: "test",
                value: function(a) {
                    var i = this.getStack(a);
                    return i.some(function(a) {
                        return a ? a.isTargetURL : !1
                    })
                }
            }]), a
        }();
    i["default"] = o, a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e(a, i, e, o, n) {
        t.push(["_trackEvent", a, i, e, o, n])
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i.trackEvent = e;
    var t = window._gaq = [];
    t.push(["_setAccount", "UA-55554816-1"]), t.push(["_trackPageview"]),
        function() {
            var a = document.createElement("script");
            a.type = "text/javascript", a.async = !0, a.src = "https://ssl.google-analytics.com/ga.js";
            var i = document.getElementsByTagName("script")[0];
            i.parentNode.insertBefore(a, i)
        }(), i["default"] = t
}, function(a, i, e) {
    function t(a, i, e) {
        var t = !0,
            r = !0;
        if ("function" != typeof a) throw new TypeError(s);
        return e === !1 ? t = !1 : o(e) && (t = "leading" in e ? !!e.leading : t, r = "trailing" in e ? !!e.trailing : r), n(a, i, {
            leading: t,
            maxWait: +i,
            trailing: r
        })
    }

    function o(a) {
        var i = typeof a;
        return !!a && ("object" == i || "function" == i)
    }
    var n = e(12),
        s = "Expected a function";
    a.exports = t
}, function(a, i, e) {
    function t(a, i, e) {
        function t() {
            p && clearTimeout(p), d && clearTimeout(d), b = 0, d = p = y = void 0
        }

        function n(i, e) {
            e && clearTimeout(e), d = p = y = void 0, i && (b = c(), k = a.apply(f, m), p || d || (m = f = void 0))
        }

        function u() {
            var a = i - (c() - g);
            0 >= a || a > i ? n(y, d) : p = setTimeout(u, a)
        }

        function h() {
            n(x, p)
        }

        function l() {
            if (m = arguments, g = c(), f = this, y = x && (p || !w), v === !1) var e = w && !p;
            else {
                d || w || (b = g);
                var t = v - (g - b),
                    o = 0 >= t || t > v;
                o ? (d && (d = clearTimeout(d)), b = g, k = a.apply(f, m)) : d || (d = setTimeout(h, t))
            }
            return o && p ? p = clearTimeout(p) : p || i === v || (p = setTimeout(u, i)), e && (o = !0, k = a.apply(f, m)), !o || p || d || (m = f = void 0), k
        }
        var m, d, k, g, f, p, y, b = 0,
            v = !1,
            x = !0;
        if ("function" != typeof a) throw new TypeError(s);
        if (i = 0 > i ? 0 : +i || 0, e === !0) {
            var w = !0;
            x = !1
        } else o(e) && (w = !!e.leading, v = "maxWait" in e && r(+e.maxWait || 0, i), x = "trailing" in e ? !!e.trailing : x);
        return l.cancel = t, l
    }

    function o(a) {
        var i = typeof a;
        return !!a && ("object" == i || "function" == i)
    }
    var n = e(13),
        s = "Expected a function",
        r = Math.max,
        u = n(Date, "now"),
        c = u || function() {
            return (new Date).getTime()
        };
    a.exports = t
}, function(a, i) {
    function e(a) {
        return !!a && "object" == typeof a
    }

    function t(a, i) {
        var e = null == a ? void 0 : a[i];
        return s(e) ? e : void 0
    }

    function o(a) {
        return n(a) && m.call(a) == r
    }

    function n(a) {
        var i = typeof a;
        return !!a && ("object" == i || "function" == i)
    }

    function s(a) {
        return null == a ? !1 : o(a) ? d.test(h.call(a)) : e(a) && u.test(a)
    }
    var r = "[object Function]",
        u = /^\[object .+?Constructor\]$/,
        c = Object.prototype,
        h = Function.prototype.toString,
        l = c.hasOwnProperty,
        m = c.toString,
        d = RegExp("^" + h.call(l).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
    a.exports = t
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }

    function o(a, i) {
        if (!(a instanceof i)) throw new TypeError("Cannot call a class as a function")
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var n = function() {
            function a(a, i) {
                for (var e = 0; e < i.length; e++) {
                    var t = i[e];
                    t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(a, t.key, t)
                }
            }
            return function(i, e, t) {
                return e && a(i.prototype, e), t && a(i, t), i
            }
        }(),
        s = e(15),
        r = t(s),
        u = e(62),
        c = t(u),
        h = "https://easylist-downloads.adblockplus.org/easylist.txt",
        l = "../assets/easylist.txt",
        m = /^https?:\/\/www.youtube.com\/annotations_invideo\?/,
        d = new RegExp(["://[^/]+.doubleclick.net", "://[^/]+.googlesyndication.com", "/ad_frame?", "/api/stats/ads?", "/annotations_invideo?", "ad3-w+.swf"].join("|"), "i"),
        k = function() {
            function a() {
                o(this, a), this.engine = new r["default"], this.storage = chrome.storage.local, this.ready = !1, this.load()
            }
            return n(a, [{
                key: "getLocalList",
                value: function(a) {
                    return (0, c["default"])(a)
                }
            }, {
                key: "getRemoteList",
                value: function(a) {
                    return fetch(a).then(function(a) {
                        return a.text()
                    })
                }
            }, {
                key: "getRaw",
                value: function() {
                    return this.getRemoteList(h)["catch"](this.getLocalList.bind(this, l))
                }
            }, {
                key: "getCached",
                value: function() {
                    var a = this;
                    return new Promise(function(i, e) {
                        a.storage.get("cachedFilterList", function(a) {
                            var t = a.cachedFilterList;
                            t && t.net && t.net.categories ? i(t) : e("noCachedList")
                        })
                    })
                }
            }, {
                key: "loadRaw",
                value: function() {
                    var a = this;
                    return this.getRaw().then(function(i) {
                        return a.engine.compile(i)
                    })
                }
            }, {
                key: "loadCached",
                value: function() {
                    var a = this;
                    return this.getCached().then(function(i) {
                        return a.engine.applyCompiled(i)
                    })
                }
            }, {
                key: "saveCached",
                value: function(a) {
                    this.storage.set({
                        cachedFilterList: a
                    })
                }
            }, {
                key: "load",
                value: function() {
                    var a = this;
                    return this.loadCached()["catch"](function(i) {
                        a.loadRaw().then(a.saveCached.bind(a))
                    }).then(function() {
                        a.ready = !0
                    })
                }
            }, {
                key: "update",
                value: function() {
                    this.engine.reset(), this.loadRaw()
                }
            }, {
                key: "fallbackBlocker",
                value: function(a) {
                    var i = (a.type, a.url);
                    return d.regExp.test(i)
                }
            }, {
                key: "isAdRequest",
                value: function(a) {
                    var i = a.type,
                        e = a.url;
                    return this.ready ? this.engine.matchString({
                        pageDomain: "youtube.com",
                        pageHostname: "www.youtube.com",
                        requestURL: e,
                        requestType: i
                    }) : this.fallbackBlocker({
                        type: i,
                        url: e
                    })
                }
            }, {
                key: "isAnnotationsRequest",
                value: function(a) {
                    return m.test(a.url)
                }
            }]), a
        }();
    i["default"] = k, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }

    function o(a, i) {
        if (!(a instanceof i)) throw new TypeError("Cannot call a class as a function")
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var n = function() {
            function a(a, i) {
                for (var e = 0; e < i.length; e++) {
                    var t = i[e];
                    t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(a, t.key, t)
                }
            }
            return function(i, e, t) {
                return e && a(i.prototype, e), t && a(i, t), i
            }
        }(),
        s = e(16),
        r = t(s),
        u = e(53),
        c = t(u),
        h = e(18),
        l = (t(h), e(17)),
        m = t(l),
        d = {
            skipCosmetic: !1
        };
    Object.assign || Object.defineProperty(Object, "assign", {
        enumerable: !1,
        configurable: !0,
        writable: !0,
        value: function(a) {
            if (void 0 === a || null === a) throw new TypeError("Cannot convert first argument to object");
            for (var i = Object(a), e = 1; e < arguments.length; e++) {
                var t = arguments[e];
                if (void 0 !== t && null !== t) {
                    t = Object(t);
                    for (var o = Object.keys(t), n = 0, s = o.length; s > n; n++) {
                        var r = o[n],
                            u = Object.getOwnPropertyDescriptor(t, r);
                        void 0 !== u && u.enumerable && (i[r] = t[r])
                    }
                }
            }
            return i
        }
    });
    var k = function() {
        function a() {
            var i = arguments.length <= 0 || void 0 === arguments[0] ? {} : arguments[0];
            o(this, a), this.config = Object.assign(d, i), this.uri = m["default"], this.net = new r["default"], this.cosmetic = new c["default"]
        }
        return n(a, [{
            key: "reset",
            value: function() {
                this.net.reset(), this.cosmetic.reset()
            }
        }, {
            key: "compile",
            value: function(a) {
                for (var i = a.length, e = [], t = /\s/, o = /^[\d:f]/, n = /\s+(?:broadcasthost|local|localhost|localhost\.localdomain)(?=\s|$)/, s = /^(?:0\.0\.0\.0|127\.0\.0\.1|::1|fe80::1%lo0)/, r = 0, u = void 0, c = void 0, h = void 0, l = void 0, m = void 0, d = void 0; i > r;)
                    if (u = a.indexOf("\n", r), -1 === u && (u = a.indexOf("\r", r), -1 === u && (u = i)), h = l = a.slice(r, u).trim(), c = r, r = u + 1, 0 !== h.length && (m = h.charAt(0), "!" !== m && "[" !== m && !this.cosmetic.compile(h, e) && "#" !== m)) {
                        if (d = h.indexOf("#"), -1 !== d && t.test(h.charAt(d - 1)) && (h = h.slice(0, d).trim()), o.test(m)) {
                            if (n.test(h)) continue;
                            h = h.replace(s, "").trim()
                        }
                        0 !== h.length && this.net.compile(h, e)
                    }
                a = null;
                var k = e.join("\n");
                return this._applyCompiledFilters(k), this._toSelfie()
            }
        }, {
            key: "getFilterCount",
            value: function() {
                return {
                    net: this.net.getFilterCount(),
                    cosmetic: this.cosmetic.getFilterCount()
                }
            }
        }, {
            key: "applyCompiled",
            value: function(a) {
                var i = a.net,
                    e = a.cosmetic;
                this.net.fromSelfie(i), this.cosmetic.fromSelfie(e)
            }
        }, {
            key: "matchString",
            value: function() {
                var a;
                return !!(a = this.net).matchString.apply(a, arguments)
            }
        }, {
            key: "getCosmeticFilter",
            value: function() {
                var a;
                return (a = this.cosmetic).retrieveDomainSelectors.apply(a, arguments)
            }
        }, {
            key: "_applyCompiledFilters",
            value: function(a) {
                for (var i = 0, e = a.length; e > i;) i = this.cosmetic.fromCompiledContent(a, i, this.config.skipCosmetic), i = this.net.fromCompiledContent(a, i)
            }
        }, {
            key: "_toSelfie",
            value: function() {
                return {
                    net: this.net.toSelfie(),
                    cosmetic: this.cosmetic.toSelfie()
                }
            }
        }]), a
    }();
    i["default"] = k, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(17),
        n = e(22),
        s = t(n),
        r = e(23),
        u = (t(r), e(24)),
        c = t(u),
        h = e(25),
        l = t(h),
        m = e(26),
        d = t(m),
        k = e(28),
        g = t(k),
        f = e(31),
        p = t(f),
        y = e(32),
        b = t(y),
        v = e(33),
        x = t(v),
        w = e(34),
        z = t(w),
        j = e(35),
        C = t(j),
        _ = e(36),
        O = t(_),
        q = e(37),
        S = t(q),
        T = e(38),
        A = t(T),
        H = e(39),
        P = t(H),
        B = e(41),
        M = t(B),
        F = e(42),
        R = t(F),
        I = e(43),
        E = t(I),
        L = e(44),
        G = t(L),
        D = e(45),
        U = t(D),
        N = e(46),
        $ = t(N),
        V = e(47),
        K = t(V),
        W = e(48),
        J = t(W),
        Y = e(49),
        X = t(Y),
        Z = e(50),
        Q = t(Z),
        aa = e(51),
        ia = t(aa),
        ea = e(30),
        ta = t(ea),
        oa = e(52),
        na = function(a, i) {
            if (i.slice(0 - a.length) !== a) return !1;
            var e = i.charAt(i.length - a.length - 1);
            return "." === e || "" === e
        },
        sa = function() {
            this.reAnyToken = /[%0-9a-z]+/g, this.tokens = [], this.filterParser = new ia["default"], this.reset()
        };
    sa.prototype.reset = function() {
        this.frozen = !1, this.processedFilterCount = 0, this.acceptedCount = 0, this.rejectedCount = 0, this.allowFilterCount = 0, this.blockFilterCount = 0, this.duplicateCount = 0, this.duplicateBuster = {}, this.categories = Object.create(null), this.filterParser.reset(), this.filterCounts = {}, this.keyRegister = void 0, this.tokenRegister = void 0, this.fRegister = null
    }, sa.prototype.freeze = function() {
        histogram("allFilters", this.categories), this.duplicateBuster = {};
        var a, i = this.categories;
        for (var e in i) a = i[e]["."], void 0 !== a && a.freeze();
        this.filterParser.reset(), this.frozen = !0
    }, sa.prototype.factories = {
        "[]": l["default"],
        a: d["default"],
        ah: g["default"],
        "0a": p["default"],
        "0ah": b["default"],
        "1a": x["default"],
        "1ah": z["default"],
        "|a": C["default"],
        "|ah": O["default"],
        "a|": S["default"],
        "a|h": A["default"],
        "||a": P["default"],
        "||ah": M["default"],
        "//": R["default"],
        "//h": E["default"],
        "{h}": G["default"],
        _: U["default"],
        _h: $["default"],
        "||_": K["default"],
        "||_h": J["default"]
    }, sa.prototype.toSelfie = function() {
        var a = function(a) {
                var i, e, t, o, n, s = [];
                for (var r in a)
                    if (s.push("k2	" + r), i = a[r], s.push(i.fid + "	" + i.toSelfie()), "[]" === i.fid)
                        for (e = i.filters, t = e.length, o = 0; t > o; o++) n = e[o], s.push(n.fid + "	" + n.toSelfie());
                return s.join("\n")
            },
            i = function(i) {
                var e = [];
                for (var t in i) e.push("k1	" + t), e.push(a(i[t]));
                return e.join("\n")
            };
        return {
            processedFilterCount: this.processedFilterCount,
            acceptedCount: this.acceptedCount,
            rejectedCount: this.rejectedCount,
            allowFilterCount: this.allowFilterCount,
            blockFilterCount: this.blockFilterCount,
            duplicateCount: this.duplicateCount,
            categories: i(this.categories)
        }
    }, sa.prototype.fromSelfie = function(a) {
        this.frozen = !0, this.processedFilterCount = a.processedFilterCount, this.acceptedCount = a.acceptedCount, this.rejectedCount = a.rejectedCount, this.allowFilterCount = a.allowFilterCount, this.blockFilterCount = a.blockFilterCount, this.duplicateCount = a.duplicateCount;
        for (var i, e, t, o, n, s, r, u, c = this.categories, h = null, l = a.categories, m = l.length, d = 0; m > d;) o = l.indexOf("\n", d), 0 > o && (o = m), n = l.slice(d, o), d = o + 1, s = n.indexOf("	"), r = n.slice(0, s), "k1" !== r ? "k2" !== r ? (u = this.factories[r], null !== h ? h.add(u.fromSelfie(n.slice(s + 1))) : h = t[e] = u.fromSelfie(n.slice(s + 1))) : (e = n.slice(s + 1), h = null) : (i = n.slice(s + 1), t = c[i] = Object.create(null), h = null)
    }, sa.prototype.compile = function(a, i) {
        var e = a.trim();
        if (0 === e.length) return !1;
        var t = e.charAt(0);
        if ("[" === t || "!" === t) return !1;
        var o = this.filterParser.parse(e);
        if (o.elemHiding) return !1;
        if (o.unsupported) return !1;
        if (o.hostnamePure && this.compileHostnameOnlyFilter(o, i)) return !0;
        var n = this.compileFilter(o, i);
        return n !== !1
    }, sa.prototype.compileHostnameOnlyFilter = function(a, i) {
        if (0 === a.domainOpt.length) {
            var e = oa.AnyParty;
            a.firstParty !== a.thirdParty && (e = a.firstParty ? oa.FirstParty : oa.ThirdParty);
            var t = a.action | a.important | e,
                o = a.types;
            if (0 === o) return i.push("n\x0B" + (0, c["default"])(t) + "\x0B.\x0B" + a.f), !0;
            var n = 1;
            do 1 & o && i.push("n\x0B" + (0, c["default"])(t | n << 4) + "\x0B.\x0B" + a.f), n += 1, o >>>= 1; while (0 !== o);
            return !0
        }
    }, sa.prototype.compileFilter = function(a, i) {
        if (a.makeToken(), "" === a.token) return !1;
        var e = oa.AnyParty;
        a.firstParty !== a.thirdParty && (e = a.firstParty ? oa.FirstParty : oa.ThirdParty);
        var t = (0, Q["default"])(a);
        return null === t ? !1 : (this.compileToAtomicFilter(t, a, e, i), !0)
    }, sa.prototype.compileToAtomicFilter = function(a, i, e, t) {
        var o = i.action | i.important | e,
            n = i.types;
        if (0 === n) return void t.push("n\x0B" + (0, c["default"])(o) + "\x0B" + i.token + "\x0B" + a.fid + "\x0B" + a.compile(i));
        var s = 1;
        do 1 & n && t.push("n\x0B" + (0, c["default"])(o | s << 4) + "\x0B" + i.token + "\x0B" + a.fid + "\x0B" + a.compile(i)), s += 1, n >>>= 1; while (0 !== n)
    }, sa.prototype.fromCompiledContent = function(a, i) {
        for (var e, t, o, n, s, r, u, c = a.length; c > i;) {
            if ("n" !== a.charAt(i)) return i;
            e = a.indexOf("\n", i), -1 === e && (e = c), t = a.slice(i + 2, e), o = t.split("\x0B"), i = e + 1, this.acceptedCount += 1, n = this.categories[o[0]], void 0 === n && (n = this.categories[o[0]] = Object.create(null)), s = n[o[1]], "." !== o[1] ? this.duplicateBuster.hasOwnProperty(t) ? this.duplicateCount += 1 : (this.duplicateBuster[t] = !0, r = this.factories[o[2]], u = r.fromSelfie(o[3]), void 0 !== s ? "[]" !== s.fid ? n[o[1]] = new l["default"](s, u) : s.add(u) : n[o[1]] = u) : (void 0 === s && (s = n["."] = new G["default"]), s.add(o[2]) === !1 && (this.duplicateCount += 1))
        }
        return c
    }, sa.prototype.filterStringFromCompiled = function(a) {
        var i = [],
            e = a.split("\x0B"),
            t = "",
            o = 0 | parseInt(e[0], 16);
        1 & o && (t += "@@");
        var n = "." === e[1] ? "." : e[2],
            s = "." !== n ? e[3].split("	") : [];
        switch (n) {
            case ".":
                t += "||" + e[2] + "^";
                break;
            case "a":
            case "ah":
            case "0a":
            case "0ah":
            case "1a":
            case "1ah":
            case "_":
            case "_h":
                t += s[0];
                break;
            case "|a":
            case "|ah":
                t += "|" + s[0];
                break;
            case "a|":
            case "a|h":
                t += s[0] + "|";
                break;
            case "||a":
            case "||ah":
            case "||_":
            case "||_h":
                t += "||" + s[0];
                break;
            case "//":
            case "//h":
                t += "/" + s[0] + "/"
        }
        switch (n) {
            case "0ah":
            case "1ah":
            case "|ah":
            case "a|h":
            case "||ah":
            case "||_h":
            case "//h":
                i.push("domain=" + s[1]);
                break;
            case "ah":
            case "_h":
                i.push("domain=" + s[2])
        }
        return 2 & o && i.push("important"), 8 & o ? i.push("third-party") : 4 & o && i.push("first-party"), 240 & o && i.push(oa.typeValueToTypeName[o >>> 4]), 0 !== i.length && (t += "$" + i.join(",")), t
    }, sa.prototype.filterRegexFromCompiled = function(a, i) {
        var e = a.split("\x0B"),
            t = "." === e[1] ? "." : e[2],
            o = "." !== t ? e[3].split("	") : [],
            n = null;
        switch (t) {
            case ".":
                n = (0, s["default"])(e[2], 0, i);
                break;
            case "a":
            case "ah":
            case "0a":
            case "0ah":
            case "1a":
            case "1ah":
            case "_":
            case "_h":
            case "||a":
            case "||ah":
            case "||_":
            case "||_h":
                n = (0, s["default"])(o[0], 0, i);
                break;
            case "|a":
            case "|ah":
                n = (0, s["default"])(o[0], -1, i);
                break;
            case "a|":
            case "a|h":
                n = (0, s["default"])(o[0], 1, i);
                break;
            case "//":
            case "//h":
                n = new RegExp(o[0])
        }
        return n
    }, sa.prototype.tokenize = function(a) {
        var i, e, t = this.tokens,
            o = this.reAnyToken;
        o.lastIndex = 0;
        for (var n = 0;
            (i = o.exec(a)) && (e = t[n], void 0 === e && (e = t[n] = new X["default"]), e.beg = i.index, e.token = i[0], n += 1, 2048 !== n););
        e = t[n], void 0 === e && (e = t[n] = new X["default"]), e.token = ""
    }, sa.prototype.matchTokens = function(a, i) {
        var e = a["."];
        if (void 0 !== e && e.match()) return this.tokenRegister = ".", this.fRegister = e, !0;
        for (var t, o, n = this.tokens, s = 0; t = n[s++], o = t.token, "" !== o;)
            if (e = a[o], void 0 !== e && e.match(i, t.beg)) return this.tokenRegister = o, this.fRegister = e, !0;
        return e = a["*"], void 0 !== e && e.match(i) ? (this.tokenRegister = "*", this.fRegister = e, !0) : !1
    }, sa.prototype.matchStringExactType = function(a, i, e) {
        var t = i.toLowerCase();
        ta["default"].pageHostname = a.pageHostname || "", ta["default"].requestHostname = (0, o.hostnameFromURI)(i);
        var n = na(a.pageDomain, ta["default"].requestHostname) ? oa.FirstParty : oa.ThirdParty,
            s = oa.typeNameToTypeValue[e] || 0;
        if (0 !== s) {
            this.tokenize(t), this.fRegister = null;
            var r, u, h = this.categories;
            if (r = oa.BlockAnyParty | oa.Important | s, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t)) return this.keyRegister = r, !0;
            if (r = oa.BlockAction | oa.Important | s | n, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t)) return this.keyRegister = r, !0;
            if (r = oa.BlockAnyParty | s, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t) && (this.keyRegister = r), null === this.fRegister && (r = oa.BlockAction | s | n, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t) && (this.keyRegister = r)), null !== this.fRegister) return r = oa.AllowAnyParty | s, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t) ? (this.keyRegister = r, !1) : (r = oa.AllowAction | s | n, (u = h[(0, c["default"])(r)]) && this.matchTokens(u, t) ? (this.keyRegister = r, !1) : !0)
        }
    }, sa.prototype.matchString = function(a) {
        var i = oa.typeNameToTypeValue[a.requestType] || oa.typeOtherValue;
        if (i > oa.typeOtherValue) return this.matchStringExactType(a, a.requestURL, a.requestType);
        var e = a.requestURL.toLowerCase();
        a.requestHostname = a.requestHostname || (0, o.hostnameFromURI)(a.requestURL), ta["default"].pageHostname = a.pageHostname || "", ta["default"].requestHostname = a.requestHostname, this.tokenize(e), this.fRegister = null;
        var t, n, s = na(a.pageDomain, a.requestHostname) ? oa.FirstParty : oa.ThirdParty,
            r = this.categories;
        return t = oa.BlockAnyTypeAnyParty | oa.Important, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !0) : (t = oa.BlockAnyType | oa.Important | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !0) : (t = oa.BlockAnyParty | oa.Important | i, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !0) : (t = oa.BlockAction | oa.Important | i | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !0) : (t = oa.BlockAnyTypeAnyParty, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) && (this.keyRegister = t), null === this.fRegister && (t = oa.BlockAnyType | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) && (this.keyRegister = t), null === this.fRegister && (t = oa.BlockAnyParty | i, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) && (this.keyRegister = t), null === this.fRegister && (t = oa.BlockAction | i | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) && (this.keyRegister = t)))), null !== this.fRegister ? (t = oa.AllowAnyTypeAnyParty, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !1) : (t = oa.AllowAnyType | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !1) : (t = oa.AllowAnyParty | i, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !1) : (t = oa.AllowAction | i | s, (n = r[(0, c["default"])(t)]) && this.matchTokens(n, e) ? (this.keyRegister = t, !1) : !0)))) : void 0))))
    }, sa.prototype.toResultString = function(a) {
        if (null === this.fRegister) return "";
        var i = 1 & this.keyRegister ? "sa:" : "sb:";
        return a ? (i += (0, c["default"])(this.keyRegister) + "\x0B" + this.tokenRegister + "\x0B", i += "." === this.tokenRegister ? this.fRegister.rtCompile() : this.fRegister.rtfid + "\x0B" + this.fRegister.rtCompile()) : i
    }, sa.prototype.getFilterCount = function() {
        return this.acceptedCount - this.duplicateCount
    }, i["default"] = sa, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(18),
        n = t(o),
        s = /^([^:\/?#]+:)?(\/\/[^\/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/,
        r = /^[^:\/?#]+:/,
        u = /^(?:[^:\/?#]+:)?(\/\/[^\/?#]+)/,
        c = /^https?:\/\/([0-9a-z_][0-9a-z._-]*[0-9a-z])\//,
        h = /^(?:[^@]*@)?([0-9a-z._-]*)(:\d*)?$/i,
        l = /^(?:[^@]*@)?(\[[0-9a-f:]*\])(:\d*)?$/i,
        m = /^[0-9a-z._-]+[0-9a-z]$/i,
        d = /^(?:[^@]*@)?([0-9a-z._-]+)(?::\d*)?$/i,
        k = /^(?:[^@]*@)?(\[[0-9a-f:]+\])(?::\d*)?$/i,
        g = /^([a-z\d]+(-*[a-z\d]+)*)(\.[a-z\d]+(-*[a-z\d])*)*$/,
        f = /^\d+\.\d+\.\d+\.\d+$|^\[[\da-zA-Z:]+\]$/,
        p = function(a) {
            return a.scheme = "", a.hostname = "", a._ipv4 = void 0, a._ipv6 = void 0, a.port = "", a.path = "", a.query = "", a.fragment = "", a
        },
        y = function(a) {
            return a.hostname = "", a._ipv4 = void 0, a._ipv6 = void 0, a.port = "", a
        },
        b = {
            scheme: "",
            authority: "",
            hostname: "",
            _ipv4: void 0,
            _ipv6: void 0,
            port: "",
            domain: void 0,
            path: "",
            query: "",
            fragment: "",
            schemeBit: 1,
            userBit: 2,
            passwordBit: 4,
            hostnameBit: 8,
            portBit: 16,
            pathBit: 32,
            queryBit: 64,
            fragmentBit: 128,
            allBits: 65535
        };
    b.authorityBit = b.userBit | b.passwordBit | b.hostnameBit | b.portBit, b.normalizeBits = b.schemeBit | b.hostnameBit | b.pathBit | b.queryBit, b.set = function(a) {
        if (void 0 === a) return p(b);
        var i = s.exec(a);
        return i ? (this.scheme = void 0 !== i[1] ? i[1].slice(0, -1) : "", this.authority = void 0 !== i[2] ? i[2].slice(2).toLowerCase() : "", this.path = void 0 !== i[3] ? i[3] : "", "" !== this.authority && "" === this.path && (this.path = "/"), this.query = void 0 !== i[4] ? i[4].slice(1) : "", this.fragment = void 0 !== i[5] ? i[5].slice(1) : "", m.test(this.authority) ? (this.hostname = this.authority, this.port = "", this) : (i = h.exec(this.authority), i || (i = l.exec(this.authority)) ? (this.hostname = void 0 !== i[1] ? i[1] : "", "." === this.hostname.slice(-1) && (this.hostname = this.hostname.slice(0, -1)), this.port = void 0 !== i[2] ? i[2].slice(1) : "", this) : y(b))) : p(b)
    }, b.assemble = function(a) {
        void 0 === a && (a = this.allBits);
        var i = [];
        return this.scheme && a & this.schemeBit && i.push(this.scheme, ":"), this.hostname && a & this.hostnameBit && i.push("//", this.hostname), this.port && a & this.portBit && i.push(":", this.port), this.path && a & this.pathBit && i.push(this.path), this.query && a & this.queryBit && i.push("?", this.query), this.fragment && a & this.fragmentBit && i.push("#", this.fragment), i.join("")
    }, b.schemeFromURI = function(a) {
        var i = r.exec(a);
        return i ? i[0].slice(0, -1).toLowerCase() : ""
    }, b.authorityFromURI = function(a) {
        var i = u.exec(a);
        return i ? i[1].slice(2).toLowerCase() : ""
    }, b.hostnameFromURI = function(a) {
        var i = c.exec(a);
        if (i) return i[1];
        if (i = u.exec(a), !i) return "";
        var e = i[1].slice(2);
        if (m.test(e)) return e.toLowerCase();
        if (i = d.exec(e), !i && (i = k.exec(e), !i)) return "";
        var t = i[1];
        return "." === t.slice(-1) && (t = t.slice(0, -1)), t.toLowerCase()
    }, b.domainFromHostname = function(a) {
        if (q.hasOwnProperty(a)) {
            var i = q[a];
            return i.tstamp = Date.now(), i.domain
        }
        return f.test(a) === !1 ? j(a, v.getDomain(a)) : j(a, a)
    }, b.domain = function() {
        return this.domainFromHostname(this.hostname);
    };
    var v = n["default"],
        x = function(a) {
            this.init(a)
        };
    x.prototype.init = function(a) {
        return this.domain = a, this.tstamp = Date.now(), this
    }, x.prototype.dispose = function() {
        this.domain = "", z.length < 25 && z.push(this)
    };
    var w = function(a) {
            var i = z.pop();
            return i ? i.init(a) : new x(a)
        },
        z = [],
        j = function(a, i) {
            return q.hasOwnProperty(a) ? q[a].tstamp = Date.now() : (q[a] = w(i), S += 1, S === A && _()), i
        },
        C = function(a, i) {
            return i.tstamp - a.tstamp
        },
        _ = function() {
            var a = Object.keys(q).sort(C).slice(T),
                i = a.length;
            S -= i;
            for (var e; i--;) e = a[i], q[e].dispose(), delete q[e]
        },
        O = function() {
            q = {}, S = 0
        },
        q = {},
        S = 0,
        T = 75,
        A = 100;
    v.onChanged.addListener(O), b.domainFromURI = function(a) {
        return a ? this.domainFromHostname(this.hostnameFromURI(a)) : ""
    }, b.normalizedURI = function() {
        return this.assemble(this.normalizeBits)
    }, b.rootURL = function() {
        return this.hostname ? this.assemble(this.schemeBit | this.hostnameBit) : ""
    }, b.isValidHostname = function(a) {
        var i;
        try {
            i = g.test(a)
        } catch (e) {
            return !1
        }
        return i
    }, b.parentHostnameFromHostname = function(a) {
        var i = this.domainFromHostname(a);
        if ("" !== i && i !== a) return a.slice(a.indexOf(".") + 1)
    }, b.parentHostnamesFromHostname = function(a) {
        var i = this.domainFromHostname(a);
        if ("" === i || i === a) return [];
        for (var e, t = [];
            (e = a.indexOf("."), !(0 > e)) && (a = a.slice(e + 1), t.push(a), a !== i););
        return t
    }, b.allHostnamesFromHostname = function(a) {
        var i = this.parentHostnamesFromHostname(a);
        return i.unshift(a), i
    }, b.toString = function() {
        return this.assemble()
    }, i["default"] = b, a.exports = i["default"]
}, function(a, i, e) { /*! Home: https://github.com/gorhill/publicsuffixlist.js */
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }

    function o(a) {
        if (!a || "." === a.charAt(0)) return "";
        a = a.toLowerCase();
        var i = n(a);
        if (i === a) return "";
        var e = a.lastIndexOf(".", a.lastIndexOf(".", a.length - i.length) - 1);
        return 0 >= e ? a : a.slice(e + 1)
    }

    function n(a) {
        if (!a) return "";
        for (var i;;) {
            if (i = a.indexOf("."), 0 > i) return a;
            if (s(g, a)) return a.slice(i + 1);
            if (s(f, a)) return a;
            if (s(f, "*" + a.slice(i))) return a;
            a = a.slice(i + 1)
        }
    }

    function s(a, i) {
        var e, t, o = i.lastIndexOf(".");
        0 > o ? (e = i, t = i) : (e = i.slice(o + 1), t = i.slice(0, o));
        var n = a[e];
        if (!n) return !1;
        if ("string" == typeof n) return n.indexOf(" " + t + " ") >= 0;
        var s = t.length,
            r = n[s];
        if (!r) return !1;
        for (var u, c, h = 0, l = Math.floor(r.length / s + .5); l > h;)
            if (u = h + l >> 1, c = r.substr(s * u, s), c > t) l = u;
            else {
                if (!(t > c)) return !0;
                h = u + 1
            }
        return !1
    }

    function r(a) {
        var i = arguments.length <= 1 || void 0 === arguments[1] ? m["default"].toASCII : arguments[1];
        g = {}, f = {}, a = a.toLowerCase();
        for (var e, t, o, n, s, r = 0, c = a.length; c > r;) e = a.indexOf("\n", r), 0 > e && (e = a.indexOf("\r", r), 0 > e && (e = c)), t = a.slice(r, e).trim(), r = e + 1, 0 !== t.length && (n = t.indexOf("//"), n >= 0 && (t = t.slice(0, n)), t = t.trim(), t && (b.test(t) && (t = i(t)), "!" === t.charAt(0) ? (o = g, t = t.slice(1)) : o = f, n = t.lastIndexOf("."), 0 > n ? s = t : (s = t.slice(n + 1), t = t.slice(0, n)), o.hasOwnProperty(s) || (o[s] = []), t && o[s].push(t)));
        u(g), u(f), z(v)
    }

    function u(a) {
        var i, e, t, o;
        for (var n in a)
            if (a.hasOwnProperty(n))
                if (i = a[n].join(" "))
                    if (i.length < y) a[n] = " " + i + " ";
                    else {
                        for (t = a[n].length, i = []; t--;) e = a[n][t], o = e.length, i[o] || (i[o] = []), i[o].push(e);
                        for (o = i.length; o--;) i[o] && (i[o] = i[o].sort().join(""));
                        a[n] = i
                    }
        else a[n] = "";
        return a
    }

    function c() {
        return {
            magic: p,
            rules: f,
            exceptions: g
        }
    }

    function h(a) {
        return "object" != typeof a || "string" != typeof a.magic || a.magic !== p ? !1 : (f = a.rules, g = a.exceptions, z(v), !0)
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var l = e(19),
        m = t(l),
        d = e(21),
        k = t(d),
        g = {},
        f = {},
        p = "iscjsfsaolnm",
        y = 256,
        b = /[^a-z0-9.-]/,
        v = [],
        x = function(a, i) {
            "function" == typeof i && -1 === a.indexOf(i) && a.push(i)
        },
        w = function(a, i) {
            var e = a.indexOf(i); - 1 !== e && a.splice(e, 1)
        },
        z = function(a) {
            for (var i = 0; i < a.length; i++) a[i]()
        },
        j = {
            addListener: function(a) {
                x(v, a)
            },
            removeListener: function(a) {
                w(v, a)
            }
        };
    h(k["default"]);
    var C = {
        version: "1.1",
        parse: r,
        getDomain: o,
        getPublicSuffix: n,
        toSelfie: c,
        fromSelfie: h,
        onChanged: j
    };
    i["default"] = C, a.exports = i["default"]
}, function(a, i, e) {
    var t;
    (function(a, o) {
        ! function(n) {
            function s(a) {
                throw new RangeError(H[a])
            }

            function r(a, i) {
                for (var e = a.length, t = []; e--;) t[e] = i(a[e]);
                return t
            }

            function u(a, i) {
                var e = a.split("@"),
                    t = "";
                e.length > 1 && (t = e[0] + "@", a = e[1]), a = a.replace(A, ".");
                var o = a.split("."),
                    n = r(o, i).join(".");
                return t + n
            }

            function c(a) {
                for (var i, e, t = [], o = 0, n = a.length; n > o;) i = a.charCodeAt(o++), i >= 55296 && 56319 >= i && n > o ? (e = a.charCodeAt(o++), 56320 == (64512 & e) ? t.push(((1023 & i) << 10) + (1023 & e) + 65536) : (t.push(i), o--)) : t.push(i);
                return t
            }

            function h(a) {
                return r(a, function(a) {
                    var i = "";
                    return a > 65535 && (a -= 65536, i += M(a >>> 10 & 1023 | 55296), a = 56320 | 1023 & a), i += M(a)
                }).join("")
            }

            function l(a) {
                return 10 > a - 48 ? a - 22 : 26 > a - 65 ? a - 65 : 26 > a - 97 ? a - 97 : x
            }

            function m(a, i) {
                return a + 22 + 75 * (26 > a) - ((0 != i) << 5)
            }

            function d(a, i, e) {
                var t = 0;
                for (a = e ? B(a / C) : a >> 1, a += B(a / i); a > P * z >> 1; t += x) a = B(a / P);
                return B(t + (P + 1) * a / (a + j))
            }

            function k(a) {
                var i, e, t, o, n, r, u, c, m, k, g = [],
                    f = a.length,
                    p = 0,
                    y = O,
                    b = _;
                for (e = a.lastIndexOf(q), 0 > e && (e = 0), t = 0; e > t; ++t) a.charCodeAt(t) >= 128 && s("not-basic"), g.push(a.charCodeAt(t));
                for (o = e > 0 ? e + 1 : 0; f > o;) {
                    for (n = p, r = 1, u = x; o >= f && s("invalid-input"), c = l(a.charCodeAt(o++)), (c >= x || c > B((v - p) / r)) && s("overflow"), p += c * r, m = b >= u ? w : u >= b + z ? z : u - b, !(m > c); u += x) k = x - m, r > B(v / k) && s("overflow"), r *= k;
                    i = g.length + 1, b = d(p - n, i, 0 == n), B(p / i) > v - y && s("overflow"), y += B(p / i), p %= i, g.splice(p++, 0, y)
                }
                return h(g)
            }

            function g(a) {
                var i, e, t, o, n, r, u, h, l, k, g, f, p, y, b, j = [];
                for (a = c(a), f = a.length, i = O, e = 0, n = _, r = 0; f > r; ++r) g = a[r], 128 > g && j.push(M(g));
                for (t = o = j.length, o && j.push(q); f > t;) {
                    for (u = v, r = 0; f > r; ++r) g = a[r], g >= i && u > g && (u = g);
                    for (p = t + 1, u - i > B((v - e) / p) && s("overflow"), e += (u - i) * p, i = u, r = 0; f > r; ++r)
                        if (g = a[r], i > g && ++e > v && s("overflow"), g == i) {
                            for (h = e, l = x; k = n >= l ? w : l >= n + z ? z : l - n, !(k > h); l += x) b = h - k, y = x - k, j.push(M(m(k + b % y, 0))), h = B(b / y);
                            j.push(M(m(h, 0))), n = d(e, p, t == o), e = 0, ++t
                        }++e, ++i
                }
                return j.join("")
            }

            function f(a) {
                return u(a, function(a) {
                    return S.test(a) ? k(a.slice(4).toLowerCase()) : a
                })
            }

            function p(a) {
                return u(a, function(a) {
                    return T.test(a) ? "xn--" + g(a) : a
                })
            }
            var y = ("object" == typeof i && i && !i.nodeType && i, "object" == typeof a && a && !a.nodeType && a, "object" == typeof o && o);
            y.global !== y && y.window !== y && y.self !== y || (n = y);
            var b, v = 2147483647,
                x = 36,
                w = 1,
                z = 26,
                j = 38,
                C = 700,
                _ = 72,
                O = 128,
                q = "-",
                S = /^xn--/,
                T = /[^\x20-\x7E]/,
                A = /[\x2E\u3002\uFF0E\uFF61]/g,
                H = {
                    overflow: "Overflow: input needs wider integers to process",
                    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
                    "invalid-input": "Invalid input"
                },
                P = x - w,
                B = Math.floor,
                M = String.fromCharCode;
            b = {
                version: "1.3.2",
                ucs2: {
                    decode: c,
                    encode: h
                },
                decode: k,
                encode: g,
                toASCII: p,
                toUnicode: f
            }, t = function() {
                return b
            }.call(i, e, i, a), !(void 0 !== t && (a.exports = t))
        }(this)
    }).call(i, e(20)(a), function() {
        return this
    }())
}, function(a, i) {
    a.exports = function(a) {
        return a.webpackPolyfill || (a.deprecate = function() {}, a.paths = [], a.children = [], a.webpackPolyfill = 1), a
    }
}, function(a, i) {
    a.exports = {
        magic: "iscjsfsaolnm",
        rules: {
            ac: " ac com edu gov net mil org ",
            ad: " ad nom ",
            ae: " ae co net org sch ac gov mil blogspot ",
            aero: [null, null, null, "caares", "aeroclubcrewdgcafuelshowtaxi", "cargogroupmediapilotpressunionworks", "agentsauthorbrokerdesignengineflightsafetytrader", "airlineairportchartercontrolcouncilexpressfreightglidingjournalleasingrepbodystudenttradingtrainer", "aeroclubaircraftcateringeducatorengineerexchangemagazineresearchservicessoftware", "aerobaticaerodromeambulanceamusementemergencyequipmenthomebuiltinsurancelogisticsmodellingscientistskydiving", "airtrafficballooningconferenceconsultantconsultingfederationgovernmentjournalistmicrolightnavigationproductionrecreationrotorcraft", "associationhangglidingmaintenancemarketplaceparachutingparagliding", "championshipworkinggroup", "certificationcivilaviationentertainment", "groundhandling", null, "air-surveillance", null, null, "accident-preventionair-traffic-control", null, "passenger-association", "accident-investigation"],
            af: " af gov com org net edu ",
            ag: " ag com org net co nom ",
            ai: " ai off com net org ",
            al: " al com edu gov mil net org blogspot ",
            am: " am blogspot ",
            an: " an com net org edu ",
            ao: " ao ed gv og co pb it ",
            aq: " aq ",
            ar: " ar com edu gob gov int mil net org tur blogspot.com ",
            arpa: " arpa e164 in-addr ip6 iris uri urn ",
            as: " as gov ",
            asia: " asia ",
            at: " at ac co gv or blogspot.co biz info priv ",
            au: " au com net org edu gov asn id info conf oz act nsw nt qld sa tas vic wa act.edu nsw.edu nt.edu qld.edu sa.edu tas.edu vic.edu wa.edu qld.gov sa.gov tas.gov vic.gov wa.gov blogspot.com ",
            aw: " aw com ",
            ax: " ax ",
            az: " az com net int gov org edu info pp mil name pro biz ",
            ba: " ba org net edu gov mil unsa unbi co com rs blogspot ",
            bb: " bb biz co com edu gov info net org store tv ",
            bd: " * ",
            be: " be ac blogspot ",
            bf: " bf gov ",
            bg: " bg a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 blogspot ",
            bh: " bh com edu net org gov ",
            bi: " bi co com edu or org ",
            biz: " biz dyndns for-better for-more for-some for-the selfip webhop ",
            bj: " bj asso barreau gouv blogspot ",
            bm: " bm com edu gov net org ",
            bn: " * ",
            bo: " bo com edu gov gob int org net mil tv ",
            br: [null, "b", "ambrfmmptv", "admadvagrarqartatobiobmdcimcngcntcomecnecoeduempengespetcetifarfndfotfstg12ggfgovimbindinfjorjusleglelmatmedmilmusnetnotntrodoorgppgpropscpsiqslrecslgsrvteotmptrdturvetzlg", "blogcoopflogtaxivlogwiki", "*.nomradio", null, null, null, null, null, null, "blogspot.com"],
            bs: " bs com net org edu gov ",
            bt: " bt com edu gov net org ",
            bv: " bv ",
            bw: " bw co org ",
            by: " by gov mil com of blogspot.com ",
            bz: " bz com net org edu gov za ",
            ca: " ca ab bc mb nb nf nl ns nt nu on pe qc sk yk gc co blogspot ",
            cat: " cat ",
            cc: " cc ftpaccess game-server myphotos scrapping ",
            cd: " cd gov ",
            cf: " cf blogspot ",
            cg: " cg ",
            ch: " ch blogspot ",
            ci: " ci org or com co edu ed ac net go asso xn--aroport-bya int presse md gouv ",
            ck: " * ",
            cl: " cl gov gob co mil blogspot ",
            cm: " cm co com gov net ",
            cn: " cn ac com edu gov net org mil xn--55qx5d xn--io0a7i xn--od0alg ah bj cq fj gd gs gz gx ha hb he hi hl hn jl js jx ln nm nx qh sc sd sh sn sx tj xj xz yn zj hk mo tw cn-north-1.compute.amazonaws compute.amazonaws s3.cn-north-1.amazonaws.com ",
            co: " co arts com edu firm gov info int mil net nom org rec web blogspot.com ",
            com: [null, null, "4uarbrcncodeeugbgrhkhukrnoqcrorusaseukusuyza", "comjpnmexqa2", null, "1kapp", "africagotdnsselfip", "appspotblogdnscechirednsdojodoomdnsfrom-akfrom-alfrom-arfrom-cafrom-ctfrom-dcfrom-defrom-flfrom-gafrom-hifrom-iafrom-idfrom-ilfrom-infrom-ksfrom-kyfrom-mafrom-mdfrom-mifrom-mnfrom-mofrom-msfrom-mtfrom-ncfrom-ndfrom-nefrom-nhfrom-njfrom-nmfrom-nvfrom-ohfrom-okfrom-orfrom-pafrom-prfrom-rifrom-scfrom-sdfrom-tnfrom-txfrom-utfrom-vafrom-vtfrom-wafrom-wifrom-wvfrom-wygetmyipis-goneis-leetnfshostrhcloudsinaapp", "blogspotcodespotdnsaliasdynaliasflynnhubhomeunixis-a-cpais-slickisa-geekneat-urlservebbsyolasite", "dontexistdyndns-ipherokuappherokusslhomelinuxiamallamais-a-chefis-a-geekis-a-gurulikes-pie", "betainaboxdyn-o-saurdyndns-webgoogleapisgooglecodehobby-siteis-a-greenis-a-llamais-a-nurselikescandyoperaunitesimple-urlvipsinaappwithgoogle", "doesntexistdyndns-blogdyndns-freedyndns-homedyndns-maildyndns-picsdyndns-wikidyndns-workfirebaseappis-a-doctoris-a-hunteris-a-lawyeris-a-playeris-a-techieis-an-actoris-uberleetsells-for-uwithyoutube", "dreamhostersis-a-bloggeris-a-catereris-a-liberalis-a-painteris-a-studentis-a-teacheris-an-artistis-certifiedis-into-carss3.amazonawsteaches-yoga", "dyndns-officedyndns-remotedyndns-serverelb.amazonawsest-le-patronis-a-democratis-a-designeris-a-musicianis-a-rockstaris-an-actressis-into-animeis-into-gamesisa-hockeynutspace-to-rent", "dyndns-at-homedyndns-at-workis-a-anarchistis-a-bulls-fanis-a-nascarfanis-a-socialistis-a-therapistis-an-engineersells-for-lesswritesthisblog", "cloudcontrolappcloudcontrolledest-a-la-maisonest-a-la-masionis-a-bookkeeperis-a-landscaperis-a-republicanis-an-anarchistis-with-thebandoutsystemscloud", "elasticbeanstalkest-mon-blogueuris-a-hard-workeris-a-libertarianis-an-accountantis-into-cartoonsis-not-certifiedissmarterthanyousaves-the-whales", "compute.amazonawsgithubusercontentis-a-conservativeis-a-photographeris-an-entertainer", "is-a-cubicle-slavepagespeedmobilizer", "compute-1.amazonawsus-east-1.amazonaws", "is-a-personaltrainer", "is-a-financialadvisor", "s3-eu-west-1.amazonawss3-sa-east-1.amazonawss3-us-west-1.amazonawss3-us-west-2.amazonaws", "s3-external-1.amazonawss3-external-2.amazonawsz-1.compute-1.amazonawsz-2.compute-1.amazonaws", null, "s3-eu-central-1.amazonawss3.eu-central-1.amazonaws", "s3-us-gov-west-1.amazonaws", "eu-west-1.compute.amazonawss3-ap-northeast-1.amazonawss3-ap-southeast-1.amazonawss3-ap-southeast-2.amazonawssa-east-1.compute.amazonawsus-west-1.compute.amazonawsus-west-2.compute.amazonaws", null, null, "eu-central-1.compute.amazonaws", "s3-fips-us-gov-west-1.amazonawsus-gov-west-1.compute.amazonaws", "ap-northeast-1.compute.amazonawsap-southeast-1.compute.amazonawsap-southeast-2.compute.amazonaws"],
            coop: " coop ",
            cr: " cr ac co ed fi go or sa ",
            cu: " cu com edu org net gov inf ",
            cv: " cv blogspot ",
            cw: " cw com edu net org ",
            cx: " cx gov ath ",
            cy: " ac biz com ekloges gov ltd name net org parliament press pro tm blogspot.com ",
            cz: " cz blogspot ",
            de: " de com fuettertdasnetz isteingeek istmein lebtimnetz leitungsen traeumtgerade blogspot ",
            dj: " dj ",
            dk: " dk blogspot ",
            dm: " dm com net org edu gov ",
            "do": " do art com edu gob gov mil net org sld web ",
            dz: " dz com org net gov edu asso pol art ",
            ec: " ec com info net fin k12 med pro org edu gov gob mil ",
            edu: " edu ",
            ee: " ee edu gov riik lib med com pri aip org fie blogspot.com ",
            eg: " eg com edu eun gov mil name net org sci blogspot.com ",
            er: " * ",
            es: " es com nom org gob edu blogspot.com ",
            et: " et com gov org edu biz name info net ",
            eu: " eu ",
            fi: " fi aland blogspot iki ",
            fj: " * ",
            fk: " * ",
            fm: " fm ",
            fo: " fo ",
            fr: " fr com asso nom prd presse tm aeroport assedic avocat avoues cci chambagri chirurgiens-dentistes experts-comptables geometre-expert gouv greta huissier-justice medecin notaires pharmacien port veterinaire blogspot ",
            ga: " ga ",
            gb: " gb ",
            gd: " gd ",
            ge: " ge com edu gov org mil net pvt ",
            gf: " gf ",
            gg: " gg co net org ",
            gh: " gh com edu gov org mil ",
            gi: " gi com ltd gov mod edu org ",
            gl: " gl co com edu net org ",
            gm: " gm ",
            gn: " gn ac com edu gov org net ",
            gov: " gov ",
            gp: " gp com net mobi edu org asso ",
            gq: " gq ",
            gr: " gr com edu net org gov blogspot ",
            gs: " gs ",
            gt: " gt com edu gob ind mil net org ",
            gu: " * ",
            gw: " gw ",
            gy: " gy co com net ",
            hk: " hk com edu gov idv net org xn--55qx5d xn--wcvs22d xn--lcvr32d xn--mxtq1m xn--gmqw5a xn--ciqpn xn--gmq050i xn--zf0avx xn--io0a7i xn--mk0axi xn--od0alg xn--od0aq3b xn--tn0ag xn--uc0atv xn--uc0ay4a blogspot ltd inc ",
            hm: " hm ",
            hn: " hn com edu org net mil gob ",
            hr: " hr iz from name com blogspot ",
            ht: " ht com shop firm info adult net pro org med art coop pol asso edu rel gouv perso ",
            hu: " hu co info org priv sport tm 2000 agrar bolt casino city erotica erotika film forum games hotel ingatlan jogasz konyvelo lakas media news reklam sex shop suli szex tozsde utazas video blogspot ",
            id: " id ac biz co desa go mil my net or sch web blogspot.co ",
            ie: " ie gov blogspot ",
            il: " * blogspot.co ",
            im: " im ac co com ltd.co net org plc.co tt tv ",
            "in": " in co firm net org gen ind nic ac edu res gov mil blogspot ",
            info: " info dyndns barrel-of-knowledge barrell-of-knowledge for-our groks-the groks-this here-for-more knowsitall selfip webhop ",
            "int": " int eu ",
            io: " io com github nid sandcats ",
            iq: " iq gov edu mil com org net ",
            ir: " ir ac co gov id net org sch xn--mgba3a4f16a xn--mgba3a4fra ",
            is: " is net com edu gov org int cupcake blogspot ",
            it: [null, null, "agalanaoapaqaratavbabgbiblbnbobrbsbtbzcacbcechciclcncocrcsctczenfcfefgfifmfrgegogrimisitkrlcleliloltlumbmcmemimnmomsmtnanonuogorotpapcpdpepgpipnpoprptpupvpzrarcrergrirmrnrosasisospsrsssvtatetntotptrtstvudvavbvcvevivrvsvtvv", "abrbascalcameduemrfvggovlazliglommarmolpmnpugsarsictaatosumbvaovdaven", "astibaricomoennalodipisaromarome", "aostaaostebozencuneofermogenoalaziolecceleccoluccamilanmonzanuoropaduaparmapaviapratorietisienaterniturinudine", "anconaaquilaarezzobalsanbiellachietifoggiagenovalatinamarchemateramilanomodenamolisenaplesnapolinovarapadovapugliaragusariminirovigosavonasicilyteramotorinotrentoumbriavaresevenetoveniceverona", "abruzzobellunobergamobolognabolzanobresciacasertacataniacosenzacremonacrotoneferrarafirenzegoriziaimperiaisernialaquilaligurialivornolucaniamantovamessinapalermoperugiapescarapistoiapotenzaravennasalernosassarisiciliasondriotarantotoscanatrapanitrevisotriestetuscanyveneziavicenzaviterbo", "avellinoblogspotbrindisicagliaricalabriacampaniaflorencegrossetolaspezialombardymacerataoristanopiacenzapiedmontpiemontesardegnasardiniasiracusatrentinoverbaniavercelli", "agrigentoaltoadigebeneventocatanzarofrosinonela-spezialombardiaogliastrapordenonesuedtirolvaldaosta", "alto-adigebasilicatacampobassoval-daostavald-aostavalleaosta", "alessandriaaostavalleycesenaforliforlicesenaolbiatempiotempioolbiaval-d-aostavalle-aostavalledaostavalleeaoste", "aosta-valleyascolipicenocarraramassacesena-forliforli-cesenamassacarraramonzabrianzaolbia-tempiopesarourbinoreggioemiliatempio-olbiaurbinopesarovalle-daostavalled-aostavallee-aostevibovalentia", "ascoli-picenocaltanissettacarrara-massadellogliastraemiliaromagnafriulivgiuliamassa-carraramonza-brianzamonzaebrianzapesaro-urbinoreggio-emiliaurbino-pesarovalle-d-aostavibo-valentia", "campidanomediodell-ogliastraemilia-romagnafriuli-vgiuliafriuliv-giuliafriulivegiuliamediocampidanoreggiocalabriatrentinoaadigetrentinostirol", "campidano-mediofriuli-v-giuliafriuli-vegiuliafriulive-giuliamedio-campidanoreggio-calabriatrentino-aadigetrentino-stiroltrentinoa-adigetrentinos-tirol", "carboniaiglesiasfriuli-ve-giuliaiglesiascarboniatrentino-a-adigetrentino-s-tiroltrentinosudtirol", "carbonia-iglesiasiglesias-carboniatrentino-sudtiroltrentinoaltoadigetrentinosud-tiroltrentinosuedtirol", "monzaedellabrianzatrentino-altoadigetrentino-sud-tiroltrentino-suedtiroltrentinoalto-adigetrentinosued-tirol", "andriabarlettatraniandriatranibarlettabarlettatraniandriafriuliveneziagiuliatraniandriabarlettatranibarlettaandriatrentino-alto-adigetrentino-sued-tirol", "friuli-veneziagiuliafriulivenezia-giulia", "andria-barletta-traniandria-trani-barlettabarletta-trani-andriafriuli-venezia-giuliamonza-e-della-brianzatrani-andria-barlettatrani-barletta-andria"],
            je: " je co net org ",
            jm: " * ",
            jo: " jo com org net edu sch gov mil name ",
            jobs: " jobs ",
            jp: [null, null, "acadcoedgogrjplgneor", "mie", "gifunaraoitasaga", "aichiakitachibaehimefukuigunmahyogoiwatekochikyotoosakashigatokyo", "*.kobeaomorikagawamiyaginaganotoyama", "fukuokaibarakiise.mieniigataokayamaokinawasaitamashimanetochigitottoritsu.mie", "*.nagoya*.sendaiblogspotena.gifuhokkaidoishikawakanagawakiho.miekiwa.miekumamotomiyazakinagasakiogi.sagaoji.narashizuokatado.mietaki.mietoba.mieuda.narausa.oitawakayamayamagata", "*.sapporoaki.kochiako.hyogoama.aichiando.naraasahi.miefukushimagifu.gifugodo.gifugose.naragujo.gifuhida.gifuhiji.oitahiroshimahita.oitaide.kyotoinabe.mieine.kyotoino.kochiiyo.ehimekagoshimakani.gifukuju.oitakusu.oitameiwa.miemino.gifunara.naraobu.aichioga.akitaohi.fukuioita.oitaome.tokyoono.fukuiono.hyogoora.gunmaota.gunmaota.tokyoouda.naraozu.ehimesaga.sagaseki.gifushima.miesoni.narataiki.mietaku.sagatara.sagatoki.gifutokushimatosu.sagaudono.mieuji.kyotoxn--1ctwoxn--4pvxsxn--rht3dyamaguchiyamanashiyao.osakayoro.gifuyufu.oita", "*.kawasaki*.yokohamaaioi.hyogoanjo.aichiarita.sagabeppu.oitachuo.chibachuo.osakachuo.tokyofuso.aichigamo.shigaginan.gifuhazu.aichihino.tokyohizen.sagaikeda.gifuikoma.naraimari.sagaina.naganojoyo.kyotokami.kochikamo.kyotokawai.narakira.aichikita.kyotokita.osakakita.tokyokizu.kyotokoka.shigakomono.miekoryo.narakota.aichikoto.shigakoto.tokyokuji.iwatekumano.miekuwana.miemihama.miemiki.hyogomisugi.miemiyama.miemuko.kyotonabari.mienoda.chibanoda.iwatenose.osakaochi.kochiogaki.gifuomi.naganooshu.iwateotsu.shigaouchi.sagaoyodo.narasaiki.oitasango.narasayo.hyogoseto.aichisosa.chibasuzuka.mietaka.hyogotako.chibatama.tokyotamaki.mietarui.gifutenri.naratobe.ehimetoei.aichitogo.aichitono.iwatetoon.ehimetosa.kochitoyo.kochiueno.gunmausuki.oitaxn--6btw5axn--6orx2rxn--8pvr4uxn--c3s14mxn--djty4kxn--efvn9sxn--kbrq7oxn--kltp7dxn--kltx9axn--klty5xxn--rht27zxn--rht61exn--rny31hxn--uisz3gyabu.hyogoyasu.shigayoka.hyogozao.miyagi", "abeno.osakaabiko.chibaachi.naganoaga.niigataainan.ehimeaisai.aichiaisho.shigaakita.akitaama.shimaneami.ibarakianan.naganoaoki.naganoariake.sagaasago.hyogoasahi.chibaasuke.aichiawaji.hyogoayabe.kyotochita.aichichofu.tokyodaito.osakafuchu.tokyofudai.iwatefukui.fukuifussa.tokyogenkai.sagahanda.aichihara.naganohasama.oitaheguri.narahimi.toyamahonai.ehimehonjo.akitaiida.naganoikata.ehimeikawa.akitaikeda.fukuiikeda.osakaina.ibarakiina.saitamainagi.tokyoinzai.chibaisumi.chibaitami.hyogoiwate.iwateizumi.osakakami.miyagikanan.osakakanie.aichikanna.gunmakanra.gunmakasai.hyogokawagoe.miekawai.iwatekawaue.gifukin.okinawakiryu.gunmakiso.naganokiyama.sagakochi.kochikomae.tokyokonan.aichikonan.shigakosei.shigakyowa.akitameiwa.gunmaminoh.osakamitake.gifumitsue.naramiyake.naramotosu.gifunishi.osakaobama.fukuiodate.akitaoe.yamagataogata.akitaoharu.aichioi.kanagawaokawa.kochioki.fukuokaomachi.sagaomi.niigataotaki.chibaoto.fukuokaotoyo.kochirifu.miyagiritto.shigaryuoh.shigasabae.fukuisaijo.ehimesakae.chibasakai.fukuisakai.osakasaku.naganosakyo.kyotosanda.hyogoseika.kyotoseiyo.ehimeshinjo.narashiso.hyogoshiwa.iwateshowa.gunmasue.fukuokasuita.osakasuwa.naganotaito.tokyotajimi.gifutaketa.oitatamba.hyogotoga.toyamatokai.aichitome.miyagitomi.naganotomika.gifutsuno.kochiueda.naganoumaji.kochiumi.fukuokauozu.toyamawada.naganowatarai.miexn--1lqs03nxn--1lqs71dxn--2m4a15exn--32vp30hxn--4it168dxn--4it797kxn--5js045dxn--5rtp49cxn--5rtq34kxn--8ltr62kxn--ehqz56nxn--elqq16hxn--f6qx53axn--k7yn95exn--klt787dxn--mkru45ixn--nit225kxn--ntsq17gxn--pssu33lxn--qqqt11mxn--tor131oxn--uist22hxn--uuwu58axn--vgu402cxn--zbx025dyaotsu.gifu", "*.kitakyushuadachi.tokyoakashi.hyogoannaka.gunmaanpachi.gifuaogaki.hyogoasahi.naganoasahi.toyamaashiya.hyogoaso.kumamotoaya.miyazakibato.tochigibunkyo.tokyochino.naganochiryu.aichichonan.chibachosei.chibachoshi.chibachuo.fukuokadaisen.akitafuchu.toyamafuttsu.chibageisei.kochigojome.akitahaga.tochigihamura.tokyohannan.osakahappou.akitaharima.hyogohashima.gifuhichiso.gifuhidaka.kochihikone.shigahimeji.hyogohino.tottorihinode.tokyohirono.iwatehonjyo.akitaibigawa.gifuikaruga.naraikeda.naganoiki.nagasakiimizu.toyamainami.toyamaito.shizuokaizu.shizuokajoboji.iwatejoso.ibarakikadoma.osakakagami.kochikaho.fukuokakameyama.miekamo.niigatakanmaki.narakanzaki.sagakaratsu.sagakariya.aichikashiba.narakashima.sagakasuga.hyogokatano.osakakatori.chibakawaba.gunmakazo.saitamakazuno.akitakihoku.ehimekisosaki.miekiyose.tokyokiyosu.aichikoga.fukuokakoga.ibarakikoge.tottorikokonoe.oitakomaki.aichikosaka.akitakouhoku.sagakozaki.chibakuki.saitamakunohe.iwatekyonan.chibakyuragi.sagamanno.kagawamasaki.ehimemeguro.tokyomiasa.naganomibu.tochigimidori.chibamidori.gunmamihama.aichimihama.chibamihama.fukuimihara.kochimiho.ibarakiminami.kyotominato.osakaminato.tokyomisaki.osakamisato.akitamitaka.tokyomitane.akitamito.ibarakimiyako.iwatemiyazu.kyotomizuho.tokyomobara.chibamoka.tochigimuroto.kochimutsu.aomorinagara.chibanagi.okayamanago.okinawanaha.okinawanahari.kochinaka.ibarakinakano.tokyonantan.kyotonanto.toyamanarita.chibanasu.tochiginerima.tokyonikaho.akitaninohe.iwatenishio.aichinogi.tochiginumata.gunmaobuse.naganoogawa.naganooguchi.aichiohda.shimaneohira.miyagioizumi.gunmaokaya.naganoonga.fukuokaonjuku.chibaonna.okinawaosaki.miyagioshima.tokyootaki.naganootari.naganootsuki.kochiowani.aomorioyabe.toyamaozu.kumamotosado.niigatasakae.naganosakawa.kochisakura.chibasakurai.narasannan.hyogosano.tochigisayama.osakasennan.osakasettsu.osakashingu.hyogoshinto.gunmashiroi.chibashisui.chibashoo.okayamasoja.okayamasoka.saitamasowa.ibarakisukumo.kochisumida.tokyosumita.iwatesumoto.hyogosusaki.kochitahara.aichitaira.toyamataishi.hyogotaishi.osakataiwa.miyagitajiri.osakatakino.hyogotakko.aomoritanabe.kyototenkawa.naratoda.saitamatogane.chibatoho.fukuokatone.ibarakitoyone.aichitoyono.osakatoyota.aichitsukumi.oitauchiko.ehimeuki.kumamotoureshino.mieusui.fukuokautazu.kagawauto.kumamotowakasa.fukuiwake.okayamawazuka.kyotoxn--7t0a264cyahaba.iwateyamada.iwateyamazoe.narayame.fukuokayasuda.kochiyatomi.aichiyawata.kyotoyazu.tottoriyokawa.hyogoyokote.akitayono.saitamayoshino.narayuki.ibaraki", "abu.yamaguchiagano.niigataaguni.okinawaakagi.shimaneakiruno.tokyoaomori.aomoriarai.shizuokaarakawa.tokyoarao.kumamotoasahi.ibarakiasaka.saitamabando.ibarakibiei.hokkaidobizen.okayamabungoono.oitabuzen.fukuokachiyoda.gunmachiyoda.tokyochizu.tottoridaigo.ibarakidate.hokkaidoechizen.fukuiedogawa.tokyoeiheiji.fukuiesan.hokkaidofuji.shizuokafujimi.naganofujioka.gunmafukudomi.sagagobo.wakayamagonohe.aomorigosen.niigatagoshiki.hyogogoto.nagasakigotsu.shimanehachijo.tokyohakuba.naganohamatama.sagahanno.saitamahanyu.saitamahekinan.aichihiraya.naganohonjo.saitamaibara.okayamaibaraki.osakaiheya.okinawaiide.yamagataiijima.naganoiiyama.naganoiizuna.naganoimabari.ehimeinagawa.hyogoinazawa.aichiinuyama.aichiiruma.saitamaisa.kagoshimaisesaki.gunmaisshiki.aichiitako.ibarakiitakura.gunmaiwakura.aichiiwama.ibarakiizena.okinawaizumo.shimanejohana.toyamakaga.ishikawakai.yamanashikaizuka.osakakakuda.miyagikameoka.kyotokamimine.sagakamioka.akitakamitsue.oitakarumai.iwatekasahara.gifukashiwa.chibakasugai.aichikawakami.narakijo.miyazakikimitsu.chibakitagata.gifukitagata.sagakitahata.sagakodaira.tokyokoganei.tokyokomoro.naganokosa.kumamotokoya.wakayamakoza.wakayamakui.hiroshimakunisaki.oitakurobe.toyamakurotaki.narakusatsu.gunmakusatsu.shigamachida.tokyomaibara.shigamaizuru.kyotomatsudo.chibamatsuno.ehimematsusaka.mieminamiise.mieminokamo.gifuminowa.naganomisato.miyagimisawa.aomorimitoyo.kagawamiyada.naganomiyoshi.aichimiyota.naganomizunami.gifumorioka.iwatemuika.niigatamurata.miyagimyoko.niigatanagano.naganonagawa.naganonagiso.naganonaie.hokkaidonakagyo.kyotonakano.naganonanbu.tottorinanjo.okinawanankoku.kochinanmoku.gunmanatori.miyaginiihama.ehimeniimi.okayamaniiza.saitamaniki.hokkaidonikko.tochiginishi.fukuokanisshin.aichinoheji.aomorinomi.ishikawanosegawa.naranoshiro.akitanoto.ishikawanyuzen.toyamaoarai.ibarakiofunato.iwateogano.saitamaogawa.ibarakiogawa.saitamaogimi.okinawaogori.fukuokaogose.saitamaohira.tochigioirase.aomorioiso.kanagawaojiya.niigataokawa.fukuokaokazaki.aichiokutama.tokyoomachi.naganoomigawa.chibaomiya.saitamaomuta.fukuokaono.fukushimaonojo.fukuokaookuwa.naganootaki.saitamaotsuchi.iwateoumu.hokkaidooyama.tochigisakahogi.gifusakai.ibarakisakaki.naganosakuho.naganosanjo.niigatasanuki.kagawasatte.saitamaseiro.niigatasemboku.akitasemine.miyagishibuya.tokyoshiki.saitamashingo.aomorishirako.chibashitara.aichisoeda.fukuokasoo.kagoshimasuifu.ibarakisuzaka.naganosuzu.ishikawatadaoka.osakatagajo.miyagitakagi.naganotakatori.naratakayama.gifutatsuno.hyogotogura.naganotokai.ibarakitomioka.gunmatomiya.miyagitonami.toyamatoshima.tokyotowada.aomoritoya.hokkaidotoyama.toyamatoyoake.aichitoyooka.hyogotsuga.tochigitsuruga.fukuiube.yamaguchiujiie.tochigiukiha.fukuokaunnan.shimaneurawa.saitamaurayasu.chibauruma.okinawauryu.hokkaidouwajima.ehimewakuya.miyagiwanouchi.gifuwatari.miyagixn--0trq7p7nnyachiyo.chibayaese.okinawayaita.tochigiyamada.toyamayamagata.gifuyasaka.naganoyashiro.hyogoyoita.niigatayokkaichi.mieyorii.saitamayura.wakayamayuu.yamaguchiyuza.yamagatazama.kanagawa", "abira.hokkaidoakaiwa.okayamaakishima.tokyoanan.tokushimaarida.wakayamaasahi.yamagataashiya.fukuokaatami.shizuokaayagawa.kagawaayase.kanagawaazumino.naganobibai.hokkaidochikuma.naganochoyo.kumamotochuo.yamanashidate.fukushimaebina.kanagawaebino.miyazakieniwa.hokkaidoerimo.hokkaidofujimi.saitamafujisato.akitafujisawa.iwatefukaya.saitamafukusaki.hyogofutsu.nagasakigamagori.aichiginoza.okinawahabikino.osakahachioji.tokyohagi.yamaguchihakata.fukuokahakui.ishikawahamada.shimanehanamaki.iwatehasuda.saitamahidaka.saitamahikawa.shimanehikimi.shimanehimeshima.oitahinohara.tokyohirakata.osakahiranai.aomorihirara.okinawahiroo.hokkaidohofu.yamaguchihyuga.miyazakiichihara.chibaichikawa.chibaichikawa.hyogoichinohe.iwateiizuka.fukuokaikeda.hokkaidoikusaka.naganoinami.wakayamaisen.kagoshimaitabashi.tokyoitoman.okinawaiwade.wakayamaiwaizumi.iwateiwanuma.miyagiiwata.shizuokajoetsu.niigatakadena.okinawakakogawa.hyogokamagaya.chibakamaishi.iwatekamigori.hyogokamijima.ehimekamikawa.hyogokamisu.ibarakikamogawa.chibakanonji.kagawakanuma.tochigikariwa.niigatakasama.ibarakikasamatsu.gifukashihara.narakasuga.fukuokakasuya.fukuokakatagami.akitakatsuragi.narakatsuura.chibakawanishi.narakawara.fukuokakeisen.fukuokakisarazu.chibakitagawa.kochikitakami.iwatekofu.yamanashikosai.shizuokakujukuri.chibakumatori.osakakumiyama.kyotokurate.fukuokakure.hiroshimakurogi.fukuokakurume.fukuokakuzumaki.iwatekyotamba.kyotokyotango.kyotokyowa.hokkaidomaebashi.gunmamaniwa.okayamamasuda.shimanematsue.shimanemima.tokushimaminakami.gunmaminami.fukuokaminano.saitamamisaki.okayamamisasa.tottorimisato.saitamamisato.shimanemiura.kanagawamiyako.fukuokamiyama.fukuokamizusawa.iwatemoriya.ibarakimoriyama.shigamotegi.tochigimotobu.okinawamotoyama.kochimugi.tokushimanagahama.shiganagai.yamagatanaka.hiroshimanakai.kanagawanakama.fukuokanakamura.kochinakanojo.gunmanamikata.ehimenanae.hokkaidonanao.ishikawananyo.yamagataneyagawa.osakanogata.fukuokanotogawa.shigaobama.nagasakiobira.hokkaidoogawara.miyagioguni.kumamotooguni.yamagataoketo.hokkaidoomura.nagasakionagawa.miyagiooshika.naganooseto.nagasakiotaru.hokkaidootobe.hokkaidoozora.hokkaidopippu.hokkaidoranzan.saitamarebun.hokkaidosagae.yamagatasaito.miyazakisaka.hiroshimasakado.saitamasakura.tochigisannohe.aomorisasayama.hyogosayama.saitamaseihi.nagasakiseirou.niigatasera.hiroshimasetagaya.tokyoshari.hokkaidoshibata.miyagishika.ishikawashikama.miyagishikatsu.aichishimoichi.narashingu.fukuokashinjo.okayamashinjuku.tokyoshioya.tochigishirakawa.gifushiroishi.sagashonai.fukuokasoma.fukushimasuginami.tokyosugito.saitamatadotsu.kagawatagami.niigatatagawa.fukuokataiji.wakayamataiki.hokkaidotainai.niigatatakahama.aichitakahama.fukuitakaishi.osakatakaoka.toyamatakasago.hyogotakasaki.gunmatakata.fukuokatakayama.gunmatamamura.gunmatamano.okayamatamayu.shimanetanohata.iwatetarama.okinawatateyama.chibatatsuno.naganotendo.yamagatatochio.niigatatohma.hokkaidotohnosho.chibatokoname.aichitomisato.chibatomobe.ibarakitonaki.okinawatonosho.kagawatorahime.shigatoride.ibarakitoyokawa.aichitoyonaka.osakatoyosato.shigatsugaru.aomoritsuiki.fukuokatsumagoi.gunmatsunan.niigatatsuno.miyazakitsuruta.aomoritsushima.aichiunazuki.toyamaunzen.nagasakiuonuma.niigataurasoe.okinawaushiku.ibarakiwakasa.tottoriwarabi.saitamaxn--d5qv7z876cxn--djrs72d6uyxn--ntso0iqx3ayahiko.niigatayaizu.shizuokayakage.okayamayakumo.shimaneyamada.fukuokayashio.saitamayasugi.shimaneyasuoka.naganoyawara.ibarakiyokoze.saitamayonago.tottoriyoshioka.gunmayuasa.wakayamayusuhara.kochiyuzawa.niigatazamami.okinawazushi.kanagawa", "agematsu.naganoaikawa.kanagawaakune.kagoshimaamagasaki.hyogoamami.kagoshimaaogashima.tokyoarakawa.saitamaashoro.hokkaidoassabu.hokkaidoatsugi.kanagawaatsuma.hokkaidobifuka.hokkaidobihoro.hokkaidochikugo.fukuokachikuho.fukuokachikujo.fukuokadaiwa.hiroshimadazaifu.fukuokadoshi.yamanashiebetsu.hokkaidoesashi.hokkaidofuchu.hiroshimafujiidera.osakafukuchi.fukuokafunabashi.chibafurano.hokkaidofurukawa.miyagiginowan.okinawagokase.miyazakihaboro.hokkaidohadano.kanagawahaebaru.okinawahakone.kanagawahasami.nagasakihidaka.hokkaidohidaka.wakayamahigashi.fukuokahigashi.okinawahioki.kagoshimahirado.nagasakihiraizumi.iwatehirosaki.aomorihitachi.ibarakihokuto.hokkaidohongo.hiroshimaibaraki.ibarakiichikai.tochigiitano.tokushimaiwafune.tochigiiwaki.fukushimaiwanai.hokkaidoizumi.kagoshimaizumiotsu.osakaizumisano.osakakahoku.ishikawakahoku.yamagatakainan.wakayamakaisei.kanagawakaita.hiroshimakamiichi.toyamakamikoani.akitakasaoka.okayamakashima.ibarakikashiwara.osakakatashina.gunmakatsuyama.fukuikawagoe.saitamakawakami.naganokawanishi.hyogokawasaki.miyagikawazu.shizuokakayabe.hokkaidokimino.wakayamakinko.kagoshimakishiwada.osakakitaaiki.naganokitaakita.akitakitami.hokkaidokokubunji.tokyokomagane.naganokoori.fukushimakoshu.yamanashikotohira.kagawakotoura.tottorikounosu.saitamakumakogen.ehimekumenan.okayamakunitachi.tokyokuroishi.aomorikuroiso.tochigikyotanabe.kyotomarugame.kagawamarumori.miyagimashiko.tochigimatsubara.osakamatsuyama.ehimemifune.kumamotomihama.wakayamamikasa.hokkaidomikawa.yamagatamimata.miyazakimisato.wakayamamitou.yamaguchimitsuke.niigatamiyoshi.saitamamoriguchi.osakamoriyoshi.akitamukawa.hokkaidomusashino.tokyomutsuzawa.chibanagaoka.niigatanagasu.kumamotonakagawa.naganonakijin.okinawanamie.fukushimananbu.yamanashinango.fukushimanaoshima.kagawanarashino.chibanayoro.hokkaidonemuro.hokkaidoniigata.niigatanishiarita.saganishiazai.shiganishitosa.kochinishiwaki.hyogonumata.hokkaidonumazu.shizuokaogasawara.tokyoohkura.yamagataokagaki.fukuokaokayama.okayamaokegawa.saitamaokinawa.okinawaokoppe.hokkaidookuma.fukushimaomitama.ibarakiotake.hiroshimaotama.fukushimaoyamazaki.kyotorokunohe.aomoriryokami.saitamasaigawa.fukuokasaikai.nagasakisaitama.saitamasakata.yamagatasaroma.hokkaidosasebo.nagasakisatosho.okayamasekigahara.gifushibata.niigatashibukawa.gunmashiiba.miyazakishimamoto.osakashimane.shimaneshimofusa.chibashimoji.okinawashimonita.gunmashinagawa.tokyoshingu.wakayamashinjo.yamagatashinonsen.hyogoshinshiro.aichishiogama.miyagishiojiri.naganoshonai.yamagatashowa.fukushimashowa.yamanashisodegaura.chibasumoto.kumamotosusono.shizuokatachikawa.tokyotakamori.naganotakashima.shigatakasu.hokkaidotakatsuki.osakatakatsuki.shigatakayama.naganotanabe.wakayamatateyama.toyamatawaramoto.naratenei.fukushimatobishima.aichitochigi.tochigitomari.hokkaidotottori.tottoritoyako.hokkaidotoyohashi.aichitoyotsu.fukuokatozawa.yamagatatsubame.niigatatsukiyono.gunmatsukuba.ibarakitsukui.kanagawatsuru.yamanashitsuwano.shimanetsuyama.okayamauchinomi.kagawaujitawara.kyotourausu.hokkaidowajima.ishikawayachimata.chibayachiyo.ibarakiyakumo.hokkaidoyamaga.kumamotoyamagata.naganoyamamoto.miyagiyamashina.kyotoyamato.kanagawayamato.kumamotoyatsuka.shimaneyoichi.hokkaidoyomitan.okinawayoshida.saitamayoshimi.saitamayurihonjo.akitayusui.kagoshimazentsuji.kagawa", "aibetsu.hokkaidoaizumi.tokushimaakabira.hokkaidoakkeshi.hokkaidoamakusa.kumamotoanamizu.ishikawaasakuchi.okayamaashikaga.tochigibandai.fukushimabungotakada.oitachichibu.saitamachijiwa.nagasakichikuhoku.naganochikusei.ibarakichikuzen.fukuokachitose.hokkaidoembetsu.hokkaidofujieda.shizuokafujimino.saitamafukumitsu.toyamafukuroi.shizuokafunahashi.toyamafutaba.fukushimagotemba.shizuokagyokuto.kumamotohachinohe.aomorihaibara.shizuokahakusan.ishikawahanamigawa.chibahanawa.fukushimahashikami.aomorihatogaya.saitamahatoyama.saitamahigashiomi.shigahigashiura.aichihikari.yamaguchihirata.fukushimahirokawa.fukuokahirono.fukushimahisayama.fukuokahokuryu.hokkaidohokuto.yamanashiichiba.tokushimaichinomiya.aichiichinomiya.chibaichinoseki.iwateiitate.fukushimaimakane.hokkaidoinashiki.ibarakiinatsuki.fukuokaisahaya.nagasakiisehara.kanagawaishigaki.okinawaishikawa.okinawaitayanagi.aomoriitoigawa.niigataiwatsuki.saitamakagamino.okayamakainan.tokushimakakinoki.shimanekamikawa.saitamakamisato.saitamakanegasaki.iwatekannami.shizuokakanoya.kagoshimakaruizawa.naganokashima.kumamotokasukabe.saitamakatsushika.tokyokawahara.tottorikawajima.saitamakesennuma.miyagikibichuo.okayamakikonai.hokkaidokikuchi.kumamotokitamoto.saitamakitaura.miyazakikomatsu.ishikawakosuge.yamanashikouzushima.tokyokumagaya.saitamakumano.hiroshimakumejima.okinawakunigami.okinawakunimi.fukushimakushima.miyazakikushiro.hokkaidokutchan.hokkaidomashike.hokkaidomashiki.kumamotomatsuda.kanagawamatsukawa.naganomatsumoto.naganomihara.hiroshimamiharu.fukushimaminami.tokushimaminamiboso.chibaminobu.yamanashimishima.shizuokamiyawaka.fukuokamizumaki.fukuokamochizuki.naganomoroyama.saitamamunakata.fukuokamurakami.niigatamuroran.hokkaidonaganohara.gunmanagaokakyo.kyotonagareyama.chibanagato.yamaguchinagatoro.saitamanakagawa.fukuokanakatsugawa.gifunamegata.ibarakinamegawa.saitamananporo.hokkaidonaruto.tokushimanichinan.tottoriniyodogawa.kochinobeoka.miyazakiobihiro.hokkaidoodawara.kanagawaohtawara.tochigioishida.yamagataokuizumo.shimaneoshima.yamaguchioshino.yamanashiotofuke.hokkaidootsuki.yamanashiowariasahi.aichirishiri.hokkaidosasaguri.fukuokasekikawa.niigatasetouchi.okayamashikabe.hokkaidoshikaoi.hokkaidoshimada.shizuokashimizu.hokkaidoshimizu.shizuokashimoda.shizuokashimosuwa.naganoshiraoi.hokkaidoshiraoka.saitamashiroishi.miyagishunan.yamaguchisobetsu.hokkaidotabuse.yamaguchitakahagi.ibarakitakamatsu.kagawatakarazuka.hyogotaketomi.okinawatateshina.naganotobetsu.hokkaidotogakushi.naganotogitsu.nagasakitokigawa.saitamatoyota.yamaguchitoyoura.hokkaidotsubata.ishikawatsurugi.ishikawauchihara.ibarakiurakawa.hokkaidowajiki.tokushimawassamu.hokkaidoyabuki.fukushimayamagata.ibarakiyamato.fukushimayanagawa.fukuokayawatahama.ehimeyokaichiba.chibayonabaru.okinawayonaguni.okinawayoshida.shizuokayoshinogari.sagayotsukaido.chibayugawa.fukushima", "abashiri.hokkaidoasakawa.fukushimabiratori.hokkaidoetajima.hiroshimafuefuki.yamanashifujikawa.shizuokafujisawa.kanagawafujishiro.ibarakifukagawa.hokkaidofukuchiyama.kyotofunagata.yamagatafurubira.hokkaidogushikami.okinawahachirogata.akitahakodate.hokkaidohayashima.okayamahigashi.fukushimahigashiyama.kyotohirogawa.wakayamahonbetsu.hokkaidohoronobe.hokkaidoishikari.hokkaidoishinomaki.miyagiiwakuni.yamaguchiizumozaki.niigatakadogawa.miyazakikakamigahara.gifukakegawa.shizuokakamakura.kanagawakamiizumi.saitamakamikawa.hokkaidokamikitayama.narakamoenai.hokkaidokanazawa.ishikawakaneyama.yamagatakawaguchi.saitamakawakita.ishikawakawatana.nagasakikembuchi.hokkaidokikugawa.shizuokakinokawa.wakayamakitadaito.okinawakitagawa.miyazakikitakata.miyazakikitayama.wakayamakiyokawa.kanagawakiyosato.hokkaidokoshigaya.saitamakouyama.kagoshimakozagawa.wakayamakudoyama.wakayamakumamoto.kumamotokunitomi.miyazakikunneppu.hokkaidokurashiki.okayamakuriyama.hokkaidomatsumae.hokkaidomatsushima.miyagimatsuura.nagasakiminamata.kumamotominamiaiki.naganominamiawaji.hyogominamimaki.naganomishima.fukushimamiyashiro.saitamamiyazaki.miyazakimiyoshi.hiroshimamiyoshi.tokushimamombetsu.hokkaidomoseushi.hokkaidomurayama.yamagatanagasaki.nagasakinakadomari.aomorinakagawa.hokkaidonakanoto.ishikawanakayama.yamagatanamerikawa.toyamanichinan.miyazakiniikappu.hokkaidoninomiya.kanagawanishigo.fukushimanishihara.okinawanishiizu.shizuokanishikata.tochiginishinomiya.hyogononoichi.ishikawaomaezaki.shizuokaomihachiman.shigaomotego.fukushimaosakasayama.osakarankoshi.hokkaidoryugasaki.ibarakisakegawa.yamagatasamukawa.kanagawashakotan.hokkaidoshibecha.hokkaidoshibetsu.hokkaidoshichinohe.aomorishijonawate.osakashikokuchuo.ehimeshimodate.ibarakishimogo.fukushimashintoku.hokkaidoshintomi.miyazakishirosato.ibarakishizukuishi.iwateshizuoka.shizuokashobara.hiroshimasunagawa.hokkaidotachiarai.fukuokataishin.fukushimatakaharu.miyazakitakahashi.okayamatakahata.yamagatatakamori.kumamototakanabe.miyazakitakazaki.miyazakitakikawa.hokkaidotakinoue.hokkaidotatebayashi.gunmatokamachi.niigatatokashiki.okinawatosashimizu.kochitoyotomi.hokkaidotsubetsu.hokkaidotsuchiura.ibarakitsuruoka.yamagatatsushima.nagasakiuchinada.ishikawawakayama.wakayamawakkanai.hokkaidoyamagata.yamagatayamakita.kanagawayamanobe.yamagatayamanouchi.naganoyamatotakada.narayanaizu.fukushimayokosuka.kanagawayonezawa.yamagatayoshikawa.saitamayugawara.kanagawayukuhashi.fukuoka", "aridagawa.wakayamaasahikawa.hokkaidoashibetsu.hokkaidochigasaki.kanagawachikushino.fukuokafujikawa.yamanashifukushima.hokkaidofukuyama.hiroshimafurudono.fukushimahamamatsu.shizuokahashimoto.wakayamahayakawa.yamanashihigashine.yamagatahigashiosaka.osakahigashitsuno.kochihiratsuka.kanagawahitachiota.ibarakihitoyoshi.kumamotohorokanai.hokkaidoishikawa.fukushimaiwamizawa.hokkaidoizunokuni.shizuokakaminokawa.tochigikamitonda.wakayamakaneyama.fukushimakarasuyama.tochigikatsuragi.wakayamakawamata.fukushimakawanabe.kagoshimakawanehon.shizuokakawanishi.yamagatakimobetsu.hokkaidokitakata.fukushimakobayashi.miyazakikoriyama.fukushimakoshimizu.hokkaidokushimoto.wakayamamatsubushi.saitamamatsuzaki.shizuokaminamiizu.shizuokamorimachi.shizuokamorotsuka.miyazakinakagawa.tokushimanakagusuku.okinawanakaniikawa.toyamanakatane.kagoshimanarusawa.yamanashinirasaki.yamanashinishihara.kumamotonishikawa.yamagatanishimera.miyazakinozawaonsen.naganoobanazawa.yamagataokinoshima.shimaneonomichi.hiroshimaotoineppu.hokkaidorikubetsu.hokkaidosakuragawa.ibarakisamegawa.fukushimasarufutsu.hokkaidoshimabara.nagasakishimamaki.hokkaidoshimokawa.hokkaidoshimokitayama.narashimotsuke.tochigishimotsuma.ibarakishinichi.hiroshimashirahama.wakayamashiranuka.hokkaidoshirataka.yamagatashiriuchi.hokkaidosukagawa.fukushimatabayama.yamanashitakanezawa.tochigitakehara.hiroshimatamakawa.fukushimatanagura.fukushimatarumizu.kagoshimateshikaga.hokkaidotokorozawa.saitamatokuyama.yamaguchitomakomai.hokkaidotomigusuku.okinawatondabayashi.osakatsukigata.hokkaidouenohara.yamanashiutashinai.hokkaidoutsunomiya.tochigi", "aizubange.fukushimaasaminami.hiroshimafujinomiya.shizuokafukushima.fukushimahigashiizu.shizuokahigashikurume.tokyohigashinaruse.akitahigashiyamato.tokyohigashiyoshino.narahitachinaka.ibarakiizumizaki.fukushimakagoshima.kagoshimakamifurano.hokkaidokaminoyama.yamagatakashiwazaki.niigatakasumigaura.ibarakikawachinagano.osakakawaminami.miyazakikuchinotsu.nagasakikudamatsu.yamaguchimakinohara.shizuokamamurogawa.yamagatamatsumoto.kagoshimaminamidaito.okinawaminamiechizen.fukuiminamiminowa.naganomiyakonojo.miyazakinakamichi.yamanashinishiaizu.fukushimaoamishirasato.chibarikuzentakata.iwatesagamihara.kanagawasakaiminato.tottorisanagochi.tokushimaseranishi.hiroshimashinanomachi.naganoshirakawa.fukushimashishikui.tokushimatamatsukuri.ibarakitokushima.tokushimayamanashi.yamanashiyamatokoriyama.narayamatsuri.fukushimayatsushiro.kumamoto", "aizumisato.fukushimachihayaakasaka.osakachippubetsu.hokkaidohigashiizumo.shimanehigashikagawa.kagawahigashikawa.hokkaidohitachiomiya.ibarakiinawashiro.fukushimakagamiishi.fukushimakamiamakusa.kumamotokamishihoro.hokkaidokisofukushima.naganomakurazaki.kagoshimamatsushige.tokushimaminamioguni.kumamotominamisanriku.miyagiminamitane.kagoshimaminamiuonuma.niigatanasushiobara.tochiginishiawakura.okayamanishinoshima.shimanenishiokoppe.hokkaidonoboribetsu.hokkaidorishirifuji.hokkaidoshichikashuku.miyagitsurugashima.saitamayamanakako.yamanashi", "fujiyoshida.yamanashihamatonbetsu.hokkaidohatsukaichi.hiroshimahigashiagatsuma.gunmahigashimurayama.tokyohigashishirakawa.gifuhigashiyodogawa.osakakamisunagawa.hokkaidokuromatsunai.hokkaidominami-alps.yamanashiminamifurano.hokkaidominamiyamashiro.kyotomusashimurayama.tokyonakasatsunai.hokkaidonakatombetsu.hokkaidoshimonoseki.yamaguchishinkamigoto.nagasakishinshinotsu.hokkaidoshinyoshitomi.fukuokayokoshibahikari.chiba", "higashikagura.hokkaidohigashisumiyoshi.osakajinsekikogen.hiroshimakitahiroshima.hokkaidokitanakagusuku.okinawakitashiobara.fukushimakomatsushima.tokushimanachikatsuura.wakayamanishikatsura.yamanashinishinoomote.kagoshima", "aizuwakamatsu.fukushimahigashichichibu.saitamaminamiashigara.kanagawaosakikamijima.hiroshimasatsumasendai.kagoshima", "higashimatsushima.miyagihigashimatsuyama.saitamaichikawamisato.yamanashi", "fujikawaguchiko.yamanashi", "higashihiroshima.hiroshima"],
            ke: " * blogspot.co ",
            kg: " kg org net com edu gov mil ",
            kh: " * ",
            ki: " ki edu biz net org gov info com ",
            km: " km org nom gov prd tm edu mil ass com coop asso presse medecin notaires pharmaciens veterinaire gouv ",
            kn: " kn net org edu gov ",
            kp: " kp com edu gov org rep tra ",
            kr: " kr ac co es go hs kg mil ms ne or pe re sc busan chungbuk chungnam daegu daejeon gangwon gwangju gyeongbuk gyeonggi gyeongnam incheon jeju jeonbuk jeonnam seoul ulsan blogspot ",
            kw: " * ",
            ky: " ky edu gov com org net ",
            kz: " kz org edu net gov mil com ",
            la: " la int net info edu gov per com org c ",
            lb: " lb com edu gov net org ",
            lc: " lc com net co org edu gov ",
            li: " li blogspot ",
            lk: " lk gov sch net int com org edu ngo soc web ltd assn grp hotel ac ",
            lr: " lr com edu gov org net ",
            ls: " ls co org ",
            lt: " lt gov blogspot ",
            lu: " lu blogspot ",
            lv: " lv com edu gov org mil id net asn conf ",
            ly: " ly com net gov plc edu sch med org id ",
            ma: " ma co net gov org ac press ",
            mc: " mc tm asso ",
            md: " md blogspot ",
            me: " me co net org edu ac gov its priv ",
            mg: " mg org nom gov prd tm edu mil com co ",
            mh: " mh ",
            mil: " mil ",
            mk: " mk com org net edu gov inf name blogspot ",
            ml: " ml com edu gouv gov net org presse ",
            mm: " * ",
            mn: " mn gov edu org nyc ",
            mo: " mo com net org edu gov ",
            mobi: " mobi ",
            mp: " mp ",
            mq: " mq ",
            mr: " mr gov blogspot ",
            ms: " ms com edu gov net org ",
            mt: " mt com edu net org blogspot.com ",
            mu: " mu com net org gov ac co or ",
            museum: [null, null, null, "airandartbuscanddrjfkmadnrwnycskispytcmulmusawar", "artsaxisbahnbalebernbillbonncoalcodydalifarmfilmfrogglasgraziraqironjuifkidslanslinzmanxmillmomanynyromasatxsilktanktimetowntreeutahuvicyork", "amberbaselbathsbibleclockcybercymrudepotdollsessexfieldforceglassgorgehousekoelnkunstlabormediamoneymusicnavalneuesnorthomahaotagopaleoparisplazapresspubolsalemshellskolespacestadtstatesteamtexastouchtrustuhrenwalesyouth", "alaskaanthroassisiaustinbauernberlinbilbaobostonbotanybrasilbrunelbusheycanadacastlecelticcentercinemacircuscountycraftsdallasdesigndurhamelburgestateexeterfamilygardenhawaiihealthhellasindianjewishkaratelabourlandeslivinglondonlouvreluzernmadridmeeresminersminingmodernmoscowmunciemuseetmuseumnatureniepceonlineoregonoxfordpalacepanamapilotsplantsportalpublicquebecrussiaschoolsquarestjohnsuissesurreyswedensydneytorinousartsvalleyvantaaviking", "academyalabamaartdecoatlantabadajozbaghdadbergbaubirdartbristolbritishbrusselburghofcarriercastreschicagoclintoncoldwarconventcostumeculturedenmarkdetroitenglandfarmersfineartfinlandfloridagallerygatewaygeologygeorgiagiessenhamburghandsonhistoryindianajamisonjewelryjudaicalajollalarssonlincolnlucernemansionmarburgmedicalmissilenewportnewyorknorfolkontarioopenairpacificphoenixprojectrailwayrockartsantafeschweizscienceseaportsibeniksocietysolognestationtextiletheatertrolleytrusteeushuaiavillagevirtualvirtuelwesternwhalingzoology", "airguardamericanantiquesaquariumasmatartaviationbaseballbellevueberkeleybrusselsbuildingcadaqueschildrencivilwarcolumbiacolumbuscomputercorvettecreationculturaldatabasedelawaredinosaurdonostiaegyptianepilepsyfigueresfineartsflandersfreiburgfribourgfundacioguernseyhelsinkiheritagehistoirehorologyloyalistmallorcamansionsmaritimemaritimomarylandmemorialmichiganmilitarymissoulamonmouthmontrealmuenchenmuenstermulhousenationalnaumburgnebraskapasadenapharmacyportlandpresidiorailroadresearchsalzburgsandiegosciencesscotlandsettlersstalbanssvizzeratopologyunderseausgardenvirginiawalloniewildlifewindmillworkshopyosemite", "ambulanceamericanaamsterdamannefrankarboretumartcenterastronomyaustraliabaltimorebarcelonabeauxartsbotanicalbroadcastbruxellescambridgechildrenschocolatecommunitycranbrookdiscoveryeastcoasteducationeisenbahnethnologyfarmsteadfilateliafortworthfrancaisefrankfurtfurnituregeelvinckisleofmanjeffersonjerusalemjewishartkarikaturmesaverdeminnesotanewjerseynewmexiconewspapernuernbergnurembergpaderbornphilatelyrochestersantacruzsouthweststarnbergstockholmstuttgarttransportuscultureushistorywestfalenyorkshire", "artgalleryautomotivebirthplacecaliforniacapebretoncartoonartcheltenhamcincinnaticollectioncopenhageneastafricaelvendrellembroideryentomologyexhibitionfoundationhalloffamehistoricalhistorischhumanitiesjournalismjuedischeskoebenhavnlancashirelosangelesluxembourgmanchestermarylhurstmonticellomotorcyclepittsburghplantationportlligatresistancesaintlouissavannahgasettlementsherbrookesteiermarktechnologytelevisionuniversityusantiquesversaillesvlaanderenxn--h1aeghzoological", "agricultureamericanartarchaeologyassociationchattanoogacorporationdelmenhorsteducationalenvironmentfreemasonrygemologicalgrandrapidsinteractivejudygarlandlewismillermidatlanticoregontrailpalmspringsphotographyplanetariumschoenbrunnschokoladentimekeepingvolkenkundexn--lns-qla", "anthropologyarchitectureartanddesignarteducationchiropracticcivilisationcivilizationcontemporaryencyclopedicfortmissoulafranziskanerhistorischesillustrationindianapolisindianmarketintelligencelocalhistorymuseumcenternewhampshirephiladelphiapreservationriodejaneirosalvadordalisanfranciscosantabarbarasaskatchewanschlesischesstpetersburgsurgeonshallwashingtondcwilliamsburg", "artsandcraftsassassinationbeeldengeluidbotanicgardenchesapeakebaycommunicationcountryestatefarmequipmentimageandsoundkunstsammlunglivinghistoryoceanographicsciencecentersouthcarolinawatchandclock", "archaeologicalcasadelamonedachristiansburgcoastaldefencecommunicationsculturalcenterdecorativeartsheimatunduhrenhistorichouseskunstunddesignnativeamericannaturalhistorysciencecenterssciencehistorysoundandvisionxn--9dbhblg6di", "botanicalgardenbritishcolumbiachildrensgardencoloradoplateaucomputerhistorycontemporaryarthembygdsforbundnaturalsciencesoceanographiquescience-fictionstateofdelawareuscountryestateuslivinghistorywatch-and-clock", "americanantiquesbrandywinevalleyhistoryofsciencemuseumverenigingnationalfirearmsnationalheritagephiladelphiaareausdecorativearts", "historicalsocietynaturhistorischesscienceandhistorytelekommunikation", "harvestcelebrationscienceandindustrysciencesnaturelles", "medizinhistorischesnatuurwetenschappen", "colonialwilliamsburgnaturalhistorymuseumxn--comunicaes-v6a2o", null, null, null, null, "environmentalconservation", null, null, "posts-and-telecommunications", null, null, null, null, null, null, null, "xn--correios-e-telecomunicaes-ghc29a"],
            mv: " mv aero biz com coop edu gov info int mil museum name net org pro ",
            mw: " mw ac biz co com coop edu gov int museum net org ",
            mx: " mx com org gob edu net blogspot ",
            my: " my com net org gov edu mil name blogspot ",
            mz: " * ",
            na: " na info pro name school or dr us mx ca in cc tv ws mobi co com org ",
            name: " name forgot.her forgot.his ",
            nc: " nc asso ",
            ne: " ne ",
            net: [null, null, "gbhuinjpseukza", "net", null, null, "homeipselfipwebhop", "blogdnsdnsdojodoes-itfrom-azfrom-cofrom-lafrom-nygets-ithomeftppodzoner.cdn77", "broke-itcloudappdnsaliasdynaliashomeunixisa-geeksells-itservebbsserveftpthruhere", "cdn77-ssldontexistdynathomehomelinuxis-a-chefis-a-geekkicks-ass", "buyshousescloudfront", "in-the-band", "a.ssl.fastlyat-band-campazure-mobileb.ssl.fastlyham-radio-op", "a.prod.fastlyazurewebsitesendofinternetoffice-on-thescrapper-site", null, null, null, "global.ssl.fastly", "global.prod.fastly"],
            nf: " nf com net per rec web arts firm info other store ",
            ng: " ng com edu name net org sch gov mil mobi blogspot.com ",
            ni: " * ",
            nl: " nl bv co blogspot ",
            no: [null, null, "aaahalbucofmhahlhmmrnlnontofolrlsfsttmtrvavf", "depeidfetfhsflagolhofhollommilselskivgsvik", "altaamliamotarnaaurebergbodoboknetnefreifusagrangrueholeivgukvamlekalierlundmossoddaosenoslooyerprivraderanaroanrostsolastatsulasundtanatimetinnvagavangvegavoss", "andoyardalaskeraskimaskoyasnesaukrabalatbardubarumbjugnbomlobrynebykledonnadovredyroyfedjefjellfloraflorofordefranafrognfroyagalsagiskegranegronggs.aags.ahgs.bugs.fmgs.hlgs.hmgs.mrgs.nlgs.ntgs.ofgs.olgs.rlgs.sfgs.stgs.tmgs.trgs.vags.vfgulenhalsahamarharamhemneheradhitrahobolhurumklabuklepplesjaloppalotenluroymasoymeloymodummoldenaroynesnaorstaradoyraisaraumarisorrissarodoyromsarorosryggesalatsaudaselbuseljeskaunskienskjaksmolasnasasognesomnasorumstordstrynsveiotjometokketolgatranatydalulvikvadsovaganvallevardovaroyvefsnviknavolda", "aejrieafjordalgardalvdalandebuaseralaveroybaidarbamblebeardubeiarnbergenbievatbindaldeatnudrobakevenesfauskefinnoyfitjarfjalerfosnesfrostagamvikgaulargjovikhabmerhadselhaldenhapmirhareidhasvikhemneshortenhurdalhvaleridrettjondalkarmoylahppilardallarviklenviklerdalliernelindasloabatlunnerlusterlyngenmalvikmandalmarkermelandmeldalmelhusmosvikmuosatmuseumnamsosnarviknessetoksnesoppdalorkdalorlandorskogosoyroraholtrindalrollagroykenruovatsandoysigdalsiljansirdalskanitskodjesnaasesnoasasolundstangestokkestrandsuldaltranbytranoytromsatromsotrysiltynsettysnestysvarutsiravagsoyverdalverranvestbyvoagat", "agdenesalesundaremarkarendalaskvollaurlandbajddarbjarkoybronnoybudejjubyglanddrammeneidskogelverumenebakketnedalfarsundfetsundfolldalforsandfrolandfuoiskufuosskogausdalgjemnesgjesdalgloppengranvings.oslohamaroyharstadibestadinderoyivelandjolsterkafjordkarlsoykommunekragerokvitsoylavagislebesbyleirvikleksviklyngdalmalselvmerakermidsundmoarekemodalenmosjoennessebynorddalosteroyrenneburingeburomskogroyrviksaltdalsandnesseljordsiellakskedsmoskiervaslattumsogndalsokndalsorfoldstavernsteigenstordalstrandasunndalsvelviktorskenunjargavaapstevaksdalvarggatvestnes", "aarborteakrehamnbadaddjaberlevagbirkenesblogspotegersundeidfjordeidsbergeidsvollengerdalevenassiflakstadflesbergfyresdalgjerdrumgjerstadgrimstadhemsedalhjartdalhokksundholtalenhonefosshoyangerjessheimjevnakerkarasjokkirkeneskopervikkvafjordkvalsundlangevaglavangenlevangerlodingenmoskenesnarviikanaustdalnavuotnanesoddennissedalnittedalnordkappnotoddennotteroyoppegardorkangeroygardenporsanguralingenrendalenrennesoysalangensauheradskanlandskiptvetskjervoysor-fronsor-odalsorreisasortlandstjordalsurnadalsvalbardtanangertingvolltonsbergtroandintrogstadtysfjordvanylvenvennesla", "alaheadjualstahaugandasuoloaudnedalnaustevollaustrheimballangenbalsfjordbatsfjordbjerkreimbremangerdrangedaleigersundflatangerfolkebiblgaivuotnagildeskalgratangenhaugesundhornindalhoylandethyllestadjan-mayenjorpelandkongsbergkraanghkekvanangenkvinesdalkviteseidleikangerleirfjordlillesandlindesneslorenskogmarnardalmjondalenmo-i-rananannestadnord-fronnord-odalnordreisaoverhallaporsangerporsgrunnrakkestadrandabergringerikeringsakersamnangersarpsborgsongdalenspydebergstathellestavangersteinkjerstorfjordsykkylventjeldsundtrondheimvegarsheivestvagoyvevelstadxn--h-2faxn--l-1faxn--s-1fa", "aknoluoktabalestrandbrumunddalcahcesuolodavvesiidafylkesbiblgangaviikahagebostadhammerfesthjelmelandkarasjohkakautokeinokrodsheradkvinnheradmasfjordennamdalseidnamsskoganomasvuotnaos.hedmarkovre-eikersandefjordsnillfjordsor-aurdalspjelkavikullensakerullensvangvindafjordxn--fl-zia", "bahcavuotnabearalvahkibo.nordlandbo.telemarkbronnoysunddavvenjargaflekkefjordfredrikstadgs.svalbardholmestrandkongsvingerleangaviikalillehammermalatvuopminedre-eikernord-aurdalnordre-landostre-totenrahkkeravjusondre-landstor-elvdaltvedestrandvossevangenxn--bod-2naxn--lt-liacxn--mli-tlaxn--mot-tlaxn--rde-ulaxn--rst-0naxn--vg-yiabxn--yer-zna", "bahccavuotnadivtasvuodnags.jan-mayenhammarfeastahattfjelldalkristiansandkristiansundkrokstadelvalaakesvuemienes.akershusnes.buskerudnesoddtangenos.hordalandsandnessjoensor-varangervestre-totenxn--andy-iraxn--asky-iraxn--blt-elabxn--bmlo-graxn--brum-voaxn--dnna-graxn--dyry-iraxn--flor-jraxn--frde-graxn--frna-woaxn--frya-hraxn--gls-elacxn--hobl-iraxn--klbu-woaxn--lten-graxn--lury-iraxn--mely-iraxn--rady-iraxn--rdal-poaxn--rdy-0nabxn--risa-5naxn--risr-iraxn--rros-graxn--rsta-fraxn--sgne-graxn--skjk-soaxn--slat-5naxn--slt-elabxn--smla-hraxn--smna-graxn--snes-poaxn--snsa-roaxn--srum-graxn--tjme-hraxn--trna-woaxn--vads-jraxn--vard-jraxn--vgan-qoa", "dielddanuorridivttasvuotnagiehtavuoatnaguovdageaidnumatta-varjjatnore-og-uvdaloystre-slidreskedsmokorsetvaler.hedmarkvaler.ostfoldvestre-slidrexn--avery-yuaxn--bidr-5nacxn--bievt-0qaxn--drbak-wuaxn--finny-yuaxn--fjord-lraxn--gjvik-wuaxn--hbmer-xqaxn--hpmir-xqaxn--karmy-yuaxn--ksnes-uuaxn--lgrd-poacxn--lhppi-xqaxn--linds-praxn--loabt-0qaxn--lrdal-sraxn--msy-ula0hxn--muost-0qaxn--nry-yla5gxn--osyro-wuaxn--rholt-mraxn--rland-uuaxn--rskog-uuaxn--ryken-vuaxn--sandy-yuaxn--seral-lraxn--sknit-yqaxn--snase-nraxn--trany-yuaxn--troms-zuaxn--tysvr-vraxn--vry-yla5g", "aurskog-holandheroy.nordlandmidtre-gauldalnaamesjevuemiesande.vestfoldxn--bjarky-fyaxn--bjddar-ptaxn--brnny-wuacxn--indery-fyaxn--jlster-byaxn--kfjord-iuaxn--krager-gyaxn--kvitsy-fyaxn--lesund-huaxn--merker-kuaxn--mlselv-iuaxn--moreke-juaxn--mosjen-eyaxn--ostery-fyaxn--rmskog-byaxn--ryrvik-byaxn--skierv-utaxn--srfold-byaxn--unjrga-rtaxn--vgsy-qoa0jxn--vrggt-xqad", "evje-og-hornnesstjordalshalsenxn--bdddj-mrabdxn--berlevg-jxaxn--hnefoss-q1axn--holtlen-hxaxn--hyanger-q1axn--krehamn-dxaxn--kvfjord-nxaxn--langevg-jxaxn--ldingen-q1axn--nttery-byaexn--nvuotna-hwaxn--oppegrd-ixaxn--rennesy-v1axn--rlingen-mxaxn--skjervy-v1axn--sknland-fxaxn--sr-fron-q1axn--sr-odal-q1axn--srreisa-q1axn--stjrdal-s1axn--tnsberg-q1axn--trgstad-r1axn--ygarden-p1a", "xn--btsfjord-9zaxn--gildeskl-g0axn--givuotna-8yaxn--hylandet-54axn--jrpeland-54axn--kranghke-b0axn--kvnangen-k0axn--laheadju-7yaxn--lrenskog-54axn--mjndalen-64axn--vegrshei-c0a", "xn--eveni-0qa01gaxn--hgebostad-g3axn--krdsherad-m8axn--porsgu-sta26fxn--sr-aurdal-l8axn--vestvgy-ixa6oxn--vre-eiker-k8a", "xn--b-5ga.nordlandxn--b-5ga.telemarkxn--bearalvhki-y4axn--bhcavuotna-s4axn--brnnysund-m8acxn--davvenjrga-y4axn--leagaviika-52bxn--mlatvuopmi-s4axn--rhkkervju-01afxn--sndre-land-0cbxn--stre-toten-zcb", "xn--bhccavuotna-k7axn--ggaviika-8ya47hxn--hcesuolo-7ya35bxn--hmmrfeasta-s4acxn--koluokta-7ya57hxn--krjohka-hwab49jxn--sandnessjen-ogbxn--sr-varanger-ggb", "xn--mtta-vrjjat-k7afxn--vler-qoa.hedmarkxn--ystre-slidre-ujb", "heroy.more-og-romsdalsande.more-og-romsdalxn--aurskog-hland-jnbxn--hery-ira.nordlandxn--nmesjevuemie-tcba", "xn--stjrdalshalsen-sqb", null, null, null, null, "xn--vler-qoa.xn--stfold-9xa", "sande.xn--mre-og-romsdal-qqb", null, null, null, null, null, null, "xn--hery-ira.xn--mre-og-romsdal-qqb"],
            np: " * ",
            nr: " nr biz info gov edu org net com ",
            nu: " nu merseine mine shacknet ",
            nz: " nz ac co cri geek gen govt health iwi kiwi maori mil xn--mori-qsa net org parliament school blogspot.co ",
            om: " om co com edu gov med museum net org pro ",
            org: [null, null, "aeeuhkusza", "org", null, "al.euat.euau.eube.eubg.euca.eucd.euch.eucn.eucy.eucz.eude.eudk.euee.eues.eufi.eufr.eugr.euhr.euhu.euie.euil.euin.euis.euit.eujp.eukr.eult.eulu.eulv.eumc.eume.eumk.eumt.eumy.eung.eunl.euno.eunz.eupl.eupt.euro.euru.euse.eusi.eusk.eutr.euuk.euus.eu", "dvrdnsdyndnsedu.eugotdnsint.eunet.euq-a.euselfipwebhop", "asso.eublogdnsc.cdn77dnsdojodoomdnsduckdnsfrom-mehomednshomeftpis-lostpodzone", "blogsitednsaliasdynaliashomeunixis-foundis-savedisa-geekparis.euservebbsserveftp", "dontexistgame-hostgo.dyndnshomelinuxis-a-chefis-a-geekkicks-assrsc.cdn77servegame", "hobby-sitereadmyblog", "doesntexisthome.dyndnsis-a-knightis-a-soxfanis-very-badmisconfused", "is-a-patsfanis-very-evilis-very-goodis-very-nicestuff-4-sale", "endofinternetis-very-sweetsellsyourhome", "bmoattachmentsis-a-bruinsfanis-a-candidate", "is-a-celticsfanis-a-linux-user", "endoftheinternet", null, "boldlygoingnowhere", null, null, null, null, "ssl.origin.cdn77-secure"],
            pa: " pa ac gob com org sld edu net ing abo med nom ",
            pe: " pe edu gob nom mil org com net blogspot ",
            pf: " pf com org edu ",
            pg: " * ",
            ph: " ph com net org gov edu ngo mil i ",
            pk: " pk com net edu org fam biz web gov gob gok gon gop gos info ",
            pl: [null, null, "copcpltm", "aidartatmbizcomeduelkgdagovgsmmedmilnetnomorgrelsexsoswaw", "agroautoinfolapymailnysapilapiszprivshopwroc", "bytomczestgminailawajgorakepnokoninkutnolomzalubinlukowmedianakloolawaopoleradomsanoksejnysklepslasksopottargitgoryturektychyustkawloclzaganzarowzgora", "ap.govbedzinelblaggdanskgdyniaglogowic.govis.govkaliszkrakowleborklowiczmazurymiastamielecmielnomw.govoleckoolkuszpa.govpo.govpowiatpoznanpulawyrybniksa.govslupskso.govsr.govszkolatravelug.govum.govus.govuw.govwarmiawegrowwielunzp.gov", "beskidybielawacieszynczeladzgliwicegnieznogorlicegrajewokarpaczkartuzykaszubyketrzynklodzkokwp.govlegnicalezajskmalborkmragowomup.govolsztynopocznoostrodaoum.govpiw.govpodhalepomorzepsp.govpup.govrzeszowsdn.govsko.govskoczowsuwalkitourismuzs.govwif.govwiw.govwolominwroclawwsa.gov", "augustowgriw.govjaworznokatowicelimanowamazowszenowarudaoirm.govpinb.govpodlasiepruszkowpsse.govrawa-mazrzgw.govstargardswidnicaszczecinszczytnougim.govumig.govupow.govuppo.govwarszawawiih.govwinb.govwios.govwitd.govwskr.govwuoz.govzakopane", "bialystokbydgoszczdlugolekakmpsp.govkolobrzegkppsp.govkwpsp.govostrolekaostrowiecpolkowicepomorskieprzeworsksosnowiecturystykawalbrzychwloclawekwodzislawzachpomorzgorzelec", "babia-gorabialowiezabieszczadykobierzycekonskowolamalopolskaostrowwlkpprochowicerealestateswiebodzintarnobrzegwzmiuw.gov", "boleslawiecswinoujscie", "jelenia-gorakonsulat.govstalowa-wolastarachowice", "nieruchomoscistarostwo.gov", null, "kazimierz-dolny"],
            pm: " pm ",
            pn: " pn gov co org edu net ",
            post: " post ",
            pr: " pr com net org gov edu isla pro biz info name est prof ac ",
            pro: " pro aca bar cpa jur law med eng ",
            ps: " ps edu gov sec plo com org net ",
            pt: " pt net gov org edu int publ com nome blogspot ",
            pw: " pw co ne or ed go belau ",
            py: " py com coop edu gov mil net org ",
            qa: " qa com edu gov mil name net org sch blogspot ",
            re: " re com asso nom blogspot ",
            ro: " ro com org tm nt nom info rec arts firm store www blogspot ",
            rs: " rs co org edu ac gov in blogspot ",
            ru: [null, null, "acppru", "bircbgcmwcomedugovintjarkhvkmsmilmsknetnkznovnskorgptzrndsnzspbstvtomtskudmvrn", "amurchelkchrkomimarinnovomskpermtesttulatuvatver", "altaichitajamalkazankirovkubankurskmytisoryoloskolpenzatomskyamalzgrad", "amurskbaikale-burggroznykalugakoenigkurganmarinepalanaryazansamarasurgutsyzrantambovtyumenvdonskvyatka", "adygeyabryanskdudinkafareastirkutskivanovoizhevskkareliakuzbasslipetskmagadanmari-elnalchiknorilsksaratovvologdayakutia", "belgorodblogspotburyatiachukotkadagestank-uralskkalmykiakemerovokostromakustanaimagnitkamordoviamurmansknakhodkaorenburgsakhalinsimbirsksmolenskudmurtiaulan-udevladimirvoronezh", "astrakhanbashkiriachuvashiakamchatkakhakassiarubtsovskstavropoltatarstantsaritsynvolgogradyaroslavl", "khabarovskpyatigorsk", "arkhangelskchelyabinskjoshkar-olakrasnoyarsknovosibirskvladikavkazvladivostok", null, "yekaterinburg", null, null, null, "yuzhno-sakhalinsk"],
            rw: " rw gov net edu ac com co int mil gouv ",
            sa: " sa com net org gov med pub edu sch ",
            sb: " sb com edu gov net org ",
            sc: " sc com gov net org edu ",
            sd: " sd com net org edu med tv gov info ",
            se: " se a ac b bd brand c d e f fh fhsk fhv g h i k komforb kommunalforbund komvux l lanbib m n naturbruksgymn o org p parti pp press r s t tm u w x y z com blogspot ",
            sg: " sg com net org gov edu per blogspot ",
            sh: " sh com net gov org mil *.platform ",
            si: " si blogspot ",
            sj: " sj ",
            sk: " sk blogspot ",
            sl: " sl com net edu gov org ",
            sm: " sm ",
            sn: " sn art com edu gouv org perso univ blogspot ",
            so: " so com net org ",
            sr: " sr ",
            st: " st co com consulado edu embaixada gov mil net org principe saotome store ",
            su: " su adygeya arkhangelsk balashov bashkiria bryansk dagestan grozny ivanovo kalmykia kaluga karelia khakassia krasnodar kurgan lenug mordovia msk murmansk nalchik nov obninsk penza pokrovsk sochi spb togliatti troitsk tula tuva vladikavkaz vladimir vologda ",
            sv: " sv com edu gob org red ",
            sx: " sx gov ",
            sy: " sy edu gov net mil com org ",
            sz: " sz co ac org ",
            tc: " tc ",
            td: " td blogspot ",
            tel: " tel ",
            tf: " tf ",
            tg: " tg ",
            th: " th ac co go in mi net or ",
            tj: " tj ac biz co com edu go gov int mil name net nic org test web ",
            tk: " tk ",
            tl: " tl gov ",
            tm: " tm com co org net nom gov mil edu ",
            tn: " tn com ens fin gov ind intl nat net org info perso tourism edunet rnrt rns rnu mincom agrinet defense turen ",
            to: " to com gov net org edu mil ",
            tp: " tp ",
            tr: " tr com info biz net org web gen tv av dr bbs name tel gov bel pol mil k12 edu kep nc gov.nc blogspot.com ",
            travel: " travel ",
            tt: " tt co com org net biz info pro int coop jobs mobi travel museum aero name gov edu ",
            tv: " tv dyndns better-than on-the-web worse-than ",
            tw: " tw edu gov mil com net org idv game ebiz club xn--zf0ao64a xn--uc0atv xn--czrw28b blogspot ",
            tz: " tz ac co go hotel info me mil mobi ne or sc tv ",
            ua: [null, null, "ckcncocrcvdndpifinkhkmkrkskvlgltlvmkodplpprvsbsmteuauzvnzpzt", "bizcomedugovnetorg", "kievkrymkyivlvivsumy", "lutskodesarivnerovnovolynyalta", "crimeaodessa", "dominicdonetskkharkivkharkovkhersonluganskpoltavavinnica", "cherkasymykolaivnikolaevternopiluzhgorodzhitomirzhytomyr", "cherkassychernigovchernihivvinnytsia", "chernivtsichernovtsykirovogradsebastopolsevastopol", "zaporizhzhe", "khmelnitskiykhmelnytskyizaporizhzhia", null, "dnepropetrovskdnipropetrovsk", "ivano-frankivsk"],
            ug: " ug co or ac sc go ne com org blogspot ",
            uk: " uk ac co gov ltd me net nhs org plc police *.sch service.gov blogspot.co ",
            us: [null, null, "akalarasazcacoctdcdeflgaguhiiaidilinkskylamamdmemimnmomsmtncndnenhnjnmnvnyohokorpaprriscsdtntxusutvavivtwawiwvwy", "dnifedisansn", "kids", "cc.akcc.alcc.arcc.ascc.azcc.cacc.cocc.ctcc.dccc.decc.flcc.gacc.gucc.hicc.iacc.idcc.ilcc.incc.kscc.kycc.lacc.macc.mdcc.mecc.micc.mncc.mocc.mscc.mtcc.nccc.ndcc.necc.nhcc.njcc.nmcc.nvcc.nycc.ohcc.okcc.orcc.pacc.prcc.ricc.sccc.sdcc.tncc.txcc.utcc.vacc.vicc.vtcc.wacc.wicc.wvcc.wyis-by", "k12.akk12.alk12.ark12.ask12.azk12.cak12.cok12.ctk12.dck12.dek12.flk12.gak12.guk12.iak12.idk12.ilk12.ink12.ksk12.kyk12.lak12.mak12.mdk12.mek12.mik12.mnk12.mok12.msk12.mtk12.nck12.nek12.nhk12.njk12.nmk12.nvk12.nyk12.ohk12.okk12.ork12.pak12.prk12.rik12.sck12.tnk12.txk12.utk12.vak12.vik12.vtk12.wak12.wik12.wylib.aklib.allib.arlib.aslib.azlib.calib.colib.ctlib.dclib.delib.fllib.galib.gulib.hilib.ialib.idlib.illib.inlib.kslib.kylib.lalib.malib.mdlib.melib.milib.mnlib.molib.mslib.mtlib.nclib.ndlib.nelib.nhlib.njlib.nmlib.nvlib.nylib.ohlib.oklib.orlib.palib.prlib.rilib.sclib.sdlib.tnlib.txlib.utlib.valib.vilib.vtlib.walib.wilib.wy", null, null, null, "pvt.k12.ma", "chtr.k12.maland-4-sale", "stuff-4-sale", "paroch.k12.ma"],
            uy: " uy com edu gub mil net org blogspot.com ",
            uz: " uz co com net org ",
            va: " va ",
            vc: " vc com net org gov mil edu ",
            ve: " ve arts co com e12 edu firm gob gov info int mil net org rec store tec web ",
            vg: " vg ",
            vi: " vi co com k12 net org ",
            vn: " vn com net org edu gov int ac biz info name pro health blogspot ",
            vu: " vu com edu net org ",
            wf: " wf ",
            ws: " ws com net org gov edu dyndns mypets ",
            yt: " yt ",
            "xn--mgbaam7a8h": " xn--mgbaam7a8h ",
            "xn--y9a3aq": " xn--y9a3aq ",
            "xn--54b7fta0cc": " xn--54b7fta0cc ",
            "xn--90ais": " xn--90ais ",
            "xn--fiqs8s": " xn--fiqs8s ",
            "xn--fiqz9s": " xn--fiqz9s ",
            "xn--lgbbat1ad8j": " xn--lgbbat1ad8j ",
            "xn--wgbh1c": " xn--wgbh1c ",
            "xn--node": " xn--node ",
            "xn--qxam": " xn--qxam ",
            "xn--j6w193g": " xn--j6w193g ",
            "xn--h2brj9c": " xn--h2brj9c ",
            "xn--mgbbh1a71e": " xn--mgbbh1a71e ",
            "xn--fpcrj9c3d": " xn--fpcrj9c3d ",
            "xn--gecrj9c": " xn--gecrj9c ",
            "xn--s9brj9c": " xn--s9brj9c ",
            "xn--45brj9c": " xn--45brj9c ",
            "xn--xkc2dl3a5ee0h": " xn--xkc2dl3a5ee0h ",
            "xn--mgba3a4f16a": " xn--mgba3a4f16a ",
            "xn--mgba3a4fra": " xn--mgba3a4fra ",
            "xn--mgbtx2b": " xn--mgbtx2b ",
            "xn--mgbayh7gpa": " xn--mgbayh7gpa ",
            "xn--3e0b707e": " xn--3e0b707e ",
            "xn--80ao21a": " xn--80ao21a ",
            "xn--fzc2c9e2c": " xn--fzc2c9e2c ",
            "xn--xkc2al3hye2a": " xn--xkc2al3hye2a ",
            "xn--mgbc0a9azcg": " xn--mgbc0a9azcg ",
            "xn--d1alf": " xn--d1alf ",
            "xn--l1acc": " xn--l1acc ",
            "xn--mix891f": " xn--mix891f ",
            "xn--mix082f": " xn--mix082f ",
            "xn--mgbx4cd0ab": " xn--mgbx4cd0ab ",
            "xn--mgb9awbf": " xn--mgb9awbf ",
            "xn--mgbai9azgqp6j": " xn--mgbai9azgqp6j ",
            "xn--mgbai9a5eva00b": " xn--mgbai9a5eva00b ",
            "xn--ygbi2ammx": " xn--ygbi2ammx ",
            "xn--90a3ac": " xn--90a3ac xn--o1ac xn--c1avg xn--90azh xn--d1at xn--o1ach xn--80au ",
            "xn--p1ai": " xn--p1ai ",
            "xn--wgbl6a": " xn--wgbl6a ",
            "xn--mgberp4a5d4ar": " xn--mgberp4a5d4ar ",
            "xn--mgberp4a5d4a87g": " xn--mgberp4a5d4a87g ",
            "xn--mgbqly7c0a67fbc": " xn--mgbqly7c0a67fbc ",
            "xn--mgbqly7cvafr": " xn--mgbqly7cvafr ",
            "xn--mgbpl2fh": " xn--mgbpl2fh ",
            "xn--yfro4i67o": " xn--yfro4i67o ",
            "xn--clchc0ea0b2g2a9gcd": " xn--clchc0ea0b2g2a9gcd ",
            "xn--ogbpf8fl": " xn--ogbpf8fl ",
            "xn--mgbtf8fl": " xn--mgbtf8fl ",
            "xn--o3cw4h": " xn--o3cw4h ",
            "xn--pgbs0dh": " xn--pgbs0dh ",
            "xn--kpry57d": " xn--kpry57d ",
            "xn--kprw13d": " xn--kprw13d ",
            "xn--nnx388a": " xn--nnx388a ",
            "xn--j1amh": " xn--j1amh ",
            "xn--mgb2ddes": " xn--mgb2ddes ",
            xxx: " xxx ",
            ye: " * ",
            za: " ac agrica alt co edu gov grondar law mil net ngo nis nom org school tm web blogspot.co ",
            zm: " * ",
            zw: " * ",
            aaa: " aaa ",
            aarp: " aarp ",
            abarth: " abarth ",
            abb: " abb ",
            abbott: " abbott ",
            abbvie: " abbvie ",
            abc: " abc ",
            able: " able ",
            abogado: " abogado ",
            abudhabi: " abudhabi ",
            academy: " academy ",
            accenture: " accenture ",
            accountant: " accountant ",
            accountants: " accountants ",
            aco: " aco ",
            active: " active ",
            actor: " actor ",
            adac: " adac ",
            ads: " ads ",
            adult: " adult ",
            aeg: " aeg ",
            aetna: " aetna ",
            afamilycompany: " afamilycompany ",
            afl: " afl ",
            africa: " africa ",
            africamagic: " africamagic ",
            agakhan: " agakhan ",
            agency: " agency ",
            aig: " aig ",
            aigo: " aigo ",
            airbus: " airbus ",
            airforce: " airforce ",
            airtel: " airtel ",
            akdn: " akdn ",
            alfaromeo: " alfaromeo ",
            alibaba: " alibaba ",
            alipay: " alipay ",
            allfinanz: " allfinanz ",
            allstate: " allstate ",
            ally: " ally ",
            alsace: " alsace ",
            alstom: " alstom ",
            americanexpress: " americanexpress ",
            americanfamily: " americanfamily ",
            amex: " amex ",
            amfam: " amfam ",
            amica: " amica ",
            amsterdam: " amsterdam ",
            analytics: " analytics ",
            android: " android ",
            anquan: " anquan ",
            anz: " anz ",
            apartments: " apartments ",
            app: " app ",
            apple: " apple ",
            aquarelle: " aquarelle ",
            aramco: " aramco ",
            archi: " archi ",
            army: " army ",
            arte: " arte ",
            asda: " asda ",
            associates: " associates ",
            athleta: " athleta ",
            attorney: " attorney ",
            auction: " auction ",
            audi: " audi ",
            audible: " audible ",
            audio: " audio ",
            auspost: " auspost ",
            author: " author ",
            auto: " auto ",
            autos: " autos ",
            avianca: " avianca ",
            aws: " aws ",
            axa: " axa ",
            azure: " azure ",
            baby: " baby ",
            baidu: " baidu ",
            banamex: " banamex ",
            bananarepublic: " bananarepublic ",
            band: " band ",
            bank: " bank ",
            bar: " bar ",
            barcelona: " barcelona ",
            barclaycard: " barclaycard ",
            barclays: " barclays ",
            barefoot: " barefoot ",
            bargains: " bargains ",
            basketball: " basketball ",
            bauhaus: " bauhaus ",
            bayern: " bayern ",
            bbc: " bbc ",
            bbt: " bbt ",
            bbva: " bbva ",
            bcg: " bcg ",
            bcn: " bcn ",
            beats: " beats ",
            beer: " beer ",
            bentley: " bentley ",
            berlin: " berlin ",
            best: " best ",
            bestbuy: " bestbuy ",
            bet: " bet ",
            bharti: " bharti ",
            bible: " bible ",
            bid: " bid ",
            bike: " bike ",
            bing: " bing ",
            bingo: " bingo ",
            bio: " bio ",
            black: " black ",
            blackfriday: " blackfriday ",
            blanco: " blanco ",
            blockbuster: " blockbuster ",
            blog: " blog ",
            bloomberg: " bloomberg ",
            blue: " blue ",
            bms: " bms ",
            bmw: " bmw ",
            bnl: " bnl ",
            bnpparibas: " bnpparibas ",
            boats: " boats ",
            boehringer: " boehringer ",
            bofa: " bofa ",
            bom: " bom ",
            bond: " bond ",
            boo: " boo ",
            booking: " booking ",
            boots: " boots ",
            bosch: " bosch ",
            bostik: " bostik ",
            bot: " bot ",
            boutique: " boutique ",
            bradesco: " bradesco ",
            bridgestone: " bridgestone ",
            broadway: " broadway ",
            broker: " broker ",
            brother: " brother ",
            brussels: " brussels ",
            budapest: " budapest ",
            bugatti: " bugatti ",
            build: " build ",
            builders: " builders ",
            business: " business ",
            buy: " buy ",
            buzz: " buzz ",
            bzh: " bzh ",
            cab: " cab ",
            cafe: " cafe ",
            cal: " cal ",
            call: " call ",
            calvinklein: " calvinklein ",
            camera: " camera ",
            camp: " camp ",
            cancerresearch: " cancerresearch ",
            canon: " canon ",
            capetown: " capetown ",
            capital: " capital ",
            capitalone: " capitalone ",
            car: " car ",
            caravan: " caravan ",
            cards: " cards ",
            care: " care ",
            career: " career ",
            careers: " careers ",
            cars: " cars ",
            cartier: " cartier ",
            casa: " casa ",
            cash: " cash ",
            casino: " casino ",
            catering: " catering ",
            cba: " cba ",
            cbn: " cbn ",
            cbre: " cbre ",
            cbs: " cbs ",
            ceb: " ceb ",
            center: " center ",
            ceo: " ceo ",
            cern: " cern ",
            cfa: " cfa ",
            cfd: " cfd ",
            chanel: " chanel ",
            channel: " channel ",
            chase: " chase ",
            chat: " chat ",
            cheap: " cheap ",
            chintai: " chintai ",
            chloe: " chloe ",
            christmas: " christmas ",
            chrome: " chrome ",
            chrysler: " chrysler ",
            church: " church ",
            cipriani: " cipriani ",
            circle: " circle ",
            cisco: " cisco ",
            citadel: " citadel ",
            citi: " citi ",
            citic: " citic ",
            city: " city ",
            cityeats: " cityeats ",
            claims: " claims ",
            cleaning: " cleaning ",
            click: " click ",
            clinic: " clinic ",
            clothing: " clothing ",
            cloud: " cloud ",
            club: " club ",
            clubmed: " clubmed ",
            coach: " coach ",
            codes: " codes ",
            coffee: " coffee ",
            college: " college ",
            cologne: " cologne ",
            comcast: " comcast ",
            commbank: " commbank ",
            community: " community ",
            company: " company ",
            computer: " computer ",
            comsec: " comsec ",
            condos: " condos ",
            construction: " construction ",
            consulting: " consulting ",
            contact: " contact ",
            contractors: " contractors ",
            cooking: " cooking ",
            cookingchannel: " cookingchannel ",
            cool: " cool ",
            corsica: " corsica ",
            country: " country ",
            coupon: " coupon ",
            coupons: " coupons ",
            courses: " courses ",
            credit: " credit ",
            creditcard: " creditcard ",
            creditunion: " creditunion ",
            cricket: " cricket ",
            crown: " crown ",
            crs: " crs ",
            cruises: " cruises ",
            csc: " csc ",
            cuisinella: " cuisinella ",
            cymru: " cymru ",
            cyou: " cyou ",
            dabur: " dabur ",
            dad: " dad ",
            dance: " dance ",
            date: " date ",
            dating: " dating ",
            datsun: " datsun ",
            day: " day ",
            dclk: " dclk ",
            dds: " dds ",
            deal: " deal ",
            dealer: " dealer ",
            deals: " deals ",
            degree: " degree ",
            delivery: " delivery ",
            dell: " dell ",
            deloitte: " deloitte ",
            delta: " delta ",
            democrat: " democrat ",
            dental: " dental ",
            dentist: " dentist ",
            desi: " desi ",
            design: " design ",
            dev: " dev ",
            dhl: " dhl ",
            diamonds: " diamonds ",
            diet: " diet ",
            digital: " digital ",
            direct: " direct ",
            directory: " directory ",
            discount: " discount ",
            discover: " discover ",
            dish: " dish ",
            dnp: " dnp ",
            docs: " docs ",
            dodge: " dodge ",
            dog: " dog ",
            doha: " doha ",
            domains: " domains ",
            doosan: " doosan ",
            dot: " dot ",
            download: " download ",
            drive: " drive ",
            dstv: " dstv ",
            dtv: " dtv ",
            dubai: " dubai ",
            duck: " duck ",
            dunlop: " dunlop ",
            duns: " duns ",
            dupont: " dupont ",
            durban: " durban ",
            dvag: " dvag ",
            dwg: " dwg ",
            earth: " earth ",
            eat: " eat ",
            edeka: " edeka ",
            education: " education ",
            email: " email ",
            emerck: " emerck ",
            emerson: " emerson ",
            energy: " energy ",
            engineer: " engineer ",
            engineering: " engineering ",
            enterprises: " enterprises ",
            epost: " epost ",
            epson: " epson ",
            equipment: " equipment ",
            ericsson: " ericsson ",
            erni: " erni ",
            esq: " esq ",
            estate: " estate ",
            esurance: " esurance ",
            eurovision: " eurovision ",
            eus: " eus ",
            events: " events ",
            everbank: " everbank ",
            exchange: " exchange ",
            expert: " expert ",
            exposed: " exposed ",
            express: " express ",
            extraspace: " extraspace ",
            fage: " fage ",
            fail: " fail ",
            fairwinds: " fairwinds ",
            faith: " faith ",
            family: " family ",
            fan: " fan ",
            fans: " fans ",
            farm: " farm ",
            farmers: " farmers ",
            fashion: " fashion ",
            fast: " fast ",
            fedex: " fedex ",
            feedback: " feedback ",
            ferrari: " ferrari ",
            ferrero: " ferrero ",
            fiat: " fiat ",
            fidelity: " fidelity ",
            fido: " fido ",
            film: " film ",
            "final": " final ",
            finance: " finance ",
            financial: " financial ",
            fire: " fire ",
            firestone: " firestone ",
            firmdale: " firmdale ",
            fish: " fish ",
            fishing: " fishing ",
            fit: " fit ",
            fitness: " fitness ",
            flickr: " flickr ",
            flights: " flights ",
            flir: " flir ",
            florist: " florist ",
            flowers: " flowers ",
            flsmidth: " flsmidth ",
            fly: " fly ",
            foo: " foo ",
            foodnetwork: " foodnetwork ",
            football: " football ",
            ford: " ford ",
            forex: " forex ",
            forsale: " forsale ",
            forum: " forum ",
            foundation: " foundation ",
            fresenius: " fresenius ",
            frl: " frl ",
            frogans: " frogans ",
            frontdoor: " frontdoor ",
            frontier: " frontier ",
            ftr: " ftr ",
            fujitsu: " fujitsu ",
            fujixerox: " fujixerox ",
            fund: " fund ",
            furniture: " furniture ",
            futbol: " futbol ",
            fyi: " fyi ",
            gal: " gal ",
            gallery: " gallery ",
            gallo: " gallo ",
            gallup: " gallup ",
            game: " game ",
            games: " games ",
            gap: " gap ",
            garden: " garden ",
            gbiz: " gbiz ",
            gdn: " gdn ",
            gea: " gea ",
            gent: " gent ",
            genting: " genting ",
            george: " george ",
            ggee: " ggee ",
            gift: " gift ",
            gifts: " gifts ",
            gives: " gives ",
            giving: " giving ",
            glade: " glade ",
            glass: " glass ",
            gle: " gle ",
            global: " global ",
            globo: " globo ",
            gmail: " gmail ",
            gmo: " gmo ",
            gmx: " gmx ",
            godaddy: " godaddy ",
            gold: " gold ",
            goldpoint: " goldpoint ",
            golf: " golf ",
            goo: " goo ",
            goodhands: " goodhands ",
            goodyear: " goodyear ",
            goog: " goog ",
            google: " google ",
            gop: " gop ",
            got: " got ",
            gotv: " gotv ",
            grainger: " grainger ",
            graphics: " graphics ",
            gratis: " gratis ",
            green: " green ",
            gripe: " gripe ",
            group: " group ",
            guardian: " guardian ",
            gucci: " gucci ",
            guge: " guge ",
            guide: " guide ",
            guitars: " guitars ",
            guru: " guru ",
            hamburg: " hamburg ",
            hangout: " hangout ",
            haus: " haus ",
            hbo: " hbo ",
            hdfc: " hdfc ",
            hdfcbank: " hdfcbank ",
            health: " health ",
            healthcare: " healthcare ",
            help: " help ",
            helsinki: " helsinki ",
            here: " here ",
            hermes: " hermes ",
            hgtv: " hgtv ",
            hiphop: " hiphop ",
            hisamitsu: " hisamitsu ",
            hitachi: " hitachi ",
            hiv: " hiv ",
            hkt: " hkt ",
            hockey: " hockey ",
            holdings: " holdings ",
            holiday: " holiday ",
            homedepot: " homedepot ",
            homegoods: " homegoods ",
            homes: " homes ",
            homesense: " homesense ",
            honda: " honda ",
            honeywell: " honeywell ",
            horse: " horse ",
            host: " host ",
            hosting: " hosting ",
            hoteles: " hoteles ",
            hotmail: " hotmail ",
            house: " house ",
            how: " how ",
            hsbc: " hsbc ",
            htc: " htc ",
            hughes: " hughes ",
            hyatt: " hyatt ",
            hyundai: " hyundai ",
            ibm: " ibm ",
            icbc: " icbc ",
            ice: " ice ",
            icu: " icu ",
            ieee: " ieee ",
            ifm: " ifm ",
            iinet: " iinet ",
            ikano: " ikano ",
            imamat: " imamat ",
            imdb: " imdb ",
            immo: " immo ",
            immobilien: " immobilien ",
            industries: " industries ",
            infiniti: " infiniti ",
            ing: " ing ",
            ink: " ink ",
            institute: " institute ",
            insurance: " insurance ",
            insure: " insure ",
            intel: " intel ",
            international: " international ",
            intuit: " intuit ",
            investments: " investments ",
            ipiranga: " ipiranga ",
            irish: " irish ",
            iselect: " iselect ",
            ismaili: " ismaili ",
            ist: " ist ",
            istanbul: " istanbul ",
            itau: " itau ",
            itv: " itv ",
            iwc: " iwc ",
            jaguar: " jaguar ",
            java: " java ",
            jcb: " jcb ",
            jcp: " jcp ",
            jeep: " jeep ",
            jetzt: " jetzt ",
            jewelry: " jewelry ",
            jio: " jio ",
            jlc: " jlc ",
            jll: " jll ",
            jmp: " jmp ",
            jnj: " jnj ",
            joburg: " joburg ",
            jot: " jot ",
            joy: " joy ",
            jpmorgan: " jpmorgan ",
            jprs: " jprs ",
            juegos: " juegos ",
            juniper: " juniper ",
            kaufen: " kaufen ",
            kddi: " kddi ",
            kerryhotels: " kerryhotels ",
            kerrylogistics: " kerrylogistics ",
            kerryproperties: " kerryproperties ",
            kfh: " kfh ",
            kia: " kia ",
            kim: " kim ",
            kinder: " kinder ",
            kindle: " kindle ",
            kitchen: " kitchen ",
            kiwi: " kiwi ",
            koeln: " koeln ",
            komatsu: " komatsu ",
            kosher: " kosher ",
            kpmg: " kpmg ",
            kpn: " kpn ",
            krd: " krd ",
            kred: " kred ",
            kuokgroup: " kuokgroup ",
            kyknet: " kyknet ",
            kyoto: " kyoto ",
            lacaixa: " lacaixa ",
            ladbrokes: " ladbrokes ",
            lamborghini: " lamborghini ",
            lancaster: " lancaster ",
            lancia: " lancia ",
            lancome: " lancome ",
            land: " land ",
            landrover: " landrover ",
            lanxess: " lanxess ",
            lasalle: " lasalle ",
            lat: " lat ",
            latino: " latino ",
            latrobe: " latrobe ",
            law: " law ",
            lawyer: " lawyer ",
            lds: " lds ",
            lease: " lease ",
            leclerc: " leclerc ",
            lefrak: " lefrak ",
            legal: " legal ",
            lego: " lego ",
            lexus: " lexus ",
            lgbt: " lgbt ",
            liaison: " liaison ",
            lidl: " lidl ",
            life: " life ",
            lifeinsurance: " lifeinsurance ",
            lifestyle: " lifestyle ",
            lighting: " lighting ",
            like: " like ",
            lilly: " lilly ",
            limited: " limited ",
            limo: " limo ",
            lincoln: " lincoln ",
            linde: " linde ",
            link: " link ",
            lipsy: " lipsy ",
            live: " live ",
            living: " living ",
            lixil: " lixil ",
            loan: " loan ",
            loans: " loans ",
            locker: " locker ",
            locus: " locus ",
            loft: " loft ",
            lol: " lol ",
            london: " london ",
            lotte: " lotte ",
            lotto: " lotto ",
            love: " love ",
            lpl: " lpl ",
            lplfinancial: " lplfinancial ",
            ltd: " ltd ",
            ltda: " ltda ",
            lundbeck: " lundbeck ",
            lupin: " lupin ",
            luxe: " luxe ",
            luxury: " luxury ",
            macys: " macys ",
            madrid: " madrid ",
            maif: " maif ",
            maison: " maison ",
            makeup: " makeup ",
            man: " man ",
            management: " management ",
            mango: " mango ",
            market: " market ",
            marketing: " marketing ",
            markets: " markets ",
            marriott: " marriott ",
            marshalls: " marshalls ",
            maserati: " maserati ",
            mattel: " mattel ",
            mba: " mba ",
            mcd: " mcd ",
            mcdonalds: " mcdonalds ",
            mckinsey: " mckinsey ",
            med: " med ",
            media: " media ",
            meet: " meet ",
            melbourne: " melbourne ",
            meme: " meme ",
            memorial: " memorial ",
            men: " men ",
            menu: " menu ",
            meo: " meo ",
            metlife: " metlife ",
            miami: " miami ",
            microsoft: " microsoft ",
            mini: " mini ",
            mint: " mint ",
            mit: " mit ",
            mitsubishi: " mitsubishi ",
            mlb: " mlb ",
            mls: " mls ",
            mma: " mma ",
            mnet: " mnet ",
            mobily: " mobily ",
            moda: " moda ",
            moe: " moe ",
            moi: " moi ",
            mom: " mom ",
            monash: " monash ",
            money: " money ",
            montblanc: " montblanc ",
            mopar: " mopar ",
            mormon: " mormon ",
            mortgage: " mortgage ",
            moscow: " moscow ",
            moto: " moto ",
            motorcycles: " motorcycles ",
            mov: " mov ",
            movie: " movie ",
            movistar: " movistar ",
            msd: " msd ",
            mtn: " mtn ",
            mtpc: " mtpc ",
            mtr: " mtr ",
            multichoice: " multichoice ",
            mutual: " mutual ",
            mutuelle: " mutuelle ",
            mzansimagic: " mzansimagic ",
            nab: " nab ",
            nadex: " nadex ",
            nagoya: " nagoya ",
            naspers: " naspers ",
            nationwide: " nationwide ",
            natura: " natura ",
            navy: " navy ",
            nba: " nba ",
            nec: " nec ",
            netbank: " netbank ",
            netflix: " netflix ",
            network: " network ",
            neustar: " neustar ",
            "new": " new ",
            news: " news ",
            next: " next ",
            nextdirect: " nextdirect ",
            nexus: " nexus ",
            nfl: " nfl ",
            ngo: " ngo ",
            nhk: " nhk ",
            nico: " nico ",
            nike: " nike ",
            nikon: " nikon ",
            ninja: " ninja ",
            nissan: " nissan ",
            nokia: " nokia ",
            northwesternmutual: " northwesternmutual ",
            norton: " norton ",
            now: " now ",
            nowruz: " nowruz ",
            nowtv: " nowtv ",
            nra: " nra ",
            nrw: " nrw ",
            ntt: " ntt ",
            nyc: " nyc ",
            obi: " obi ",
            observer: " observer ",
            off: " off ",
            office: " office ",
            okinawa: " okinawa ",
            olayan: " olayan ",
            olayangroup: " olayangroup ",
            oldnavy: " oldnavy ",
            ollo: " ollo ",
            omega: " omega ",
            one: " one ",
            ong: " ong ",
            onl: " onl ",
            online: " online ",
            onyourside: " onyourside ",
            ooo: " ooo ",
            open: " open ",
            oracle: " oracle ",
            orange: " orange ",
            organic: " organic ",
            orientexpress: " orientexpress ",
            osaka: " osaka ",
            otsuka: " otsuka ",
            ott: " ott ",
            ovh: " ovh ",
            page: " page ",
            pamperedchef: " pamperedchef ",
            panasonic: " panasonic ",
            panerai: " panerai ",
            paris: " paris ",
            pars: " pars ",
            partners: " partners ",
            parts: " parts ",
            party: " party ",
            passagens: " passagens ",
            payu: " payu ",
            pccw: " pccw ",
            pet: " pet ",
            pharmacy: " pharmacy ",
            philips: " philips ",
            photo: " photo ",
            photography: " photography ",
            photos: " photos ",
            physio: " physio ",
            piaget: " piaget ",
            pics: " pics ",
            pictet: " pictet ",
            pictures: " pictures ",
            pid: " pid ",
            pin: " pin ",
            ping: " ping ",
            pink: " pink ",
            pioneer: " pioneer ",
            pizza: " pizza ",
            place: " place ",
            play: " play ",
            playstation: " playstation ",
            plumbing: " plumbing ",
            plus: " plus ",
            pnc: " pnc ",
            pohl: " pohl ",
            poker: " poker ",
            politie: " politie ",
            porn: " porn ",
            pramerica: " pramerica ",
            praxi: " praxi ",
            press: " press ",
            prime: " prime ",
            prod: " prod ",
            productions: " productions ",
            prof: " prof ",
            progressive: " progressive ",
            promo: " promo ",
            properties: " properties ",
            property: " property ",
            protection: " protection ",
            pru: " pru ",
            prudential: " prudential ",
            pub: " pub ",
            qpon: " qpon ",
            quebec: " quebec ",
            quest: " quest ",
            qvc: " qvc ",
            racing: " racing ",
            raid: " raid ",
            read: " read ",
            realtor: " realtor ",
            realty: " realty ",
            recipes: " recipes ",
            red: " red ",
            redstone: " redstone ",
            redumbrella: " redumbrella ",
            rehab: " rehab ",
            reise: " reise ",
            reisen: " reisen ",
            reit: " reit ",
            reliance: " reliance ",
            ren: " ren ",
            rent: " rent ",
            rentals: " rentals ",
            repair: " repair ",
            report: " report ",
            republican: " republican ",
            rest: " rest ",
            restaurant: " restaurant ",
            review: " review ",
            reviews: " reviews ",
            rexroth: " rexroth ",
            rich: " rich ",
            richardli: " richardli ",
            ricoh: " ricoh ",
            rightathome: " rightathome ",
            ril: " ril ",
            rio: " rio ",
            rip: " rip ",
            rocher: " rocher ",
            rocks: " rocks ",
            rodeo: " rodeo ",
            rogers: " rogers ",
            room: " room ",
            rsvp: " rsvp ",
            ruhr: " ruhr ",
            run: " run ",
            rwe: " rwe ",
            ryukyu: " ryukyu ",
            saarland: " saarland ",
            safe: " safe ",
            safety: " safety ",
            sakura: " sakura ",
            sale: " sale ",
            salon: " salon ",
            samsclub: " samsclub ",
            samsung: " samsung ",
            sandvik: " sandvik ",
            sandvikcoromant: " sandvikcoromant ",
            sanofi: " sanofi ",
            sap: " sap ",
            sapo: " sapo ",
            sarl: " sarl ",
            sas: " sas ",
            save: " save ",
            saxo: " saxo ",
            sbi: " sbi ",
            sbs: " sbs ",
            sca: " sca ",
            scb: " scb ",
            schaeffler: " schaeffler ",
            schmidt: " schmidt ",
            scholarships: " scholarships ",
            school: " school ",
            schule: " schule ",
            schwarz: " schwarz ",
            science: " science ",
            scjohnson: " scjohnson ",
            scor: " scor ",
            scot: " scot ",
            seat: " seat ",
            security: " security ",
            seek: " seek ",
            sener: " sener ",
            services: " services ",
            ses: " ses ",
            seven: " seven ",
            sew: " sew ",
            sex: " sex ",
            sexy: " sexy ",
            sfr: " sfr ",
            sharp: " sharp ",
            shaw: " shaw ",
            shell: " shell ",
            shia: " shia ",
            shiksha: " shiksha ",
            shoes: " shoes ",
            shouji: " shouji ",
            show: " show ",
            showtime: " showtime ",
            shriram: " shriram ",
            silk: " silk ",
            sina: " sina ",
            singles: " singles ",
            site: " site ",
            ski: " ski ",
            skin: " skin ",
            sky: " sky ",
            skype: " skype ",
            sling: " sling ",
            smart: " smart ",
            smile: " smile ",
            sncf: " sncf ",
            soccer: " soccer ",
            social: " social ",
            softbank: " softbank ",
            software: " software ",
            sohu: " sohu ",
            solar: " solar ",
            solutions: " solutions ",
            song: " song ",
            sony: " sony ",
            soy: " soy ",
            space: " space ",
            spiegel: " spiegel ",
            spot: " spot ",
            spreadbetting: " spreadbetting ",
            srl: " srl ",
            srt: " srt ",
            stada: " stada ",
            staples: " staples ",
            star: " star ",
            starhub: " starhub ",
            statebank: " statebank ",
            statefarm: " statefarm ",
            statoil: " statoil ",
            stc: " stc ",
            stcgroup: " stcgroup ",
            stockholm: " stockholm ",
            storage: " storage ",
            store: " store ",
            studio: " studio ",
            study: " study ",
            style: " style ",
            sucks: " sucks ",
            supersport: " supersport ",
            supplies: " supplies ",
            supply: " supply ",
            support: " support ",
            surf: " surf ",
            surgery: " surgery ",
            suzuki: " suzuki ",
            swatch: " swatch ",
            swiftcover: " swiftcover ",
            swiss: " swiss ",
            sydney: " sydney ",
            symantec: " symantec ",
            systems: " systems ",
            tab: " tab ",
            taipei: " taipei ",
            talk: " talk ",
            taobao: " taobao ",
            target: " target ",
            tatamotors: " tatamotors ",
            tatar: " tatar ",
            tattoo: " tattoo ",
            tax: " tax ",
            taxi: " taxi ",
            tci: " tci ",
            tdk: " tdk ",
            team: " team ",
            tech: " tech ",
            technology: " technology ",
            telecity: " telecity ",
            telefonica: " telefonica ",
            temasek: " temasek ",
            tennis: " tennis ",
            teva: " teva ",
            thd: " thd ",
            theater: " theater ",
            theatre: " theatre ",
            theguardian: " theguardian ",
            tiaa: " tiaa ",
            tickets: " tickets ",
            tienda: " tienda ",
            tiffany: " tiffany ",
            tips: " tips ",
            tires: " tires ",
            tirol: " tirol ",
            tjmaxx: " tjmaxx ",
            tjx: " tjx ",
            tkmaxx: " tkmaxx ",
            tmall: " tmall ",
            today: " today ",
            tokyo: " tokyo ",
            tools: " tools ",
            top: " top ",
            toray: " toray ",
            toshiba: " toshiba ",
            total: " total ",
            tours: " tours ",
            town: " town ",
            toyota: " toyota ",
            toys: " toys ",
            trade: " trade ",
            trading: " trading ",
            training: " training ",
            travelchannel: " travelchannel ",
            travelers: " travelers ",
            travelersinsurance: " travelersinsurance ",
            trust: " trust ",
            trv: " trv ",
            tube: " tube ",
            tui: " tui ",
            tunes: " tunes ",
            tushu: " tushu ",
            tvs: " tvs ",
            ubank: " ubank ",
            ubs: " ubs ",
            uconnect: " uconnect ",
            university: " university ",
            uno: " uno ",
            uol: " uol ",
            ups: " ups ",
            vacations: " vacations ",
            vana: " vana ",
            vegas: " vegas ",
            ventures: " ventures ",
            verisign: " verisign ",
            versicherung: " versicherung ",
            vet: " vet ",
            viajes: " viajes ",
            video: " video ",
            vig: " vig ",
            viking: " viking ",
            villas: " villas ",
            vin: " vin ",
            vip: " vip ",
            virgin: " virgin ",
            visa: " visa ",
            vision: " vision ",
            vista: " vista ",
            vistaprint: " vistaprint ",
            viva: " viva ",
            vivo: " vivo ",
            vlaanderen: " vlaanderen ",
            vodka: " vodka ",
            volkswagen: " volkswagen ",
            vote: " vote ",
            voting: " voting ",
            voto: " voto ",
            voyage: " voyage ",
            vuelos: " vuelos ",
            wales: " wales ",
            walmart: " walmart ",
            walter: " walter ",
            wang: " wang ",
            wanggou: " wanggou ",
            warman: " warman ",
            watch: " watch ",
            watches: " watches ",
            weather: " weather ",
            weatherchannel: " weatherchannel ",
            webcam: " webcam ",
            weber: " weber ",
            website: " website ",
            wed: " wed ",
            wedding: " wedding ",
            weibo: " weibo ",
            weir: " weir ",
            whoswho: " whoswho ",
            wien: " wien ",
            wiki: " wiki ",
            williamhill: " williamhill ",
            win: " win ",
            windows: " windows ",
            wine: " wine ",
            winners: " winners ",
            wme: " wme ",
            wolterskluwer: " wolterskluwer ",
            woodside: " woodside ",
            work: " work ",
            works: " works ",
            world: " world ",
            wtc: " wtc ",
            wtf: " wtf ",
            xbox: " xbox ",
            xerox: " xerox ",
            xfinity: " xfinity ",
            xihuan: " xihuan ",
            xin: " xin ",
            "xn--11b4c3d": " xn--11b4c3d ",
            "xn--1ck2e1b": " xn--1ck2e1b ",
            "xn--1qqw23a": " xn--1qqw23a ",
            "xn--30rr7y": " xn--30rr7y ",
            "xn--3bst00m": " xn--3bst00m ",
            "xn--3ds443g": " xn--3ds443g ",
            "xn--3oq18vl8pn36a": " xn--3oq18vl8pn36a ",
            "xn--3pxu8k": " xn--3pxu8k ",
            "xn--42c2d9a": " xn--42c2d9a ",
            "xn--45q11c": " xn--45q11c ",
            "xn--4gbrim": " xn--4gbrim ",
            "xn--4gq48lf9j": " xn--4gq48lf9j ",
            "xn--55qw42g": " xn--55qw42g ",
            "xn--55qx5d": " xn--55qx5d ",
            "xn--5tzm5g": " xn--5tzm5g ",
            "xn--6frz82g": " xn--6frz82g ",
            "xn--6qq986b3xl": " xn--6qq986b3xl ",
            "xn--80adxhks": " xn--80adxhks ",
            "xn--80asehdb": " xn--80asehdb ",
            "xn--80aswg": " xn--80aswg ",
            "xn--8y0a063a": " xn--8y0a063a ",
            "xn--9dbq2a": " xn--9dbq2a ",
            "xn--9et52u": " xn--9et52u ",
            "xn--9krt00a": " xn--9krt00a ",
            "xn--b4w605ferd": " xn--b4w605ferd ",
            "xn--bck1b9a5dre4c": " xn--bck1b9a5dre4c ",
            "xn--c1avg": " xn--c1avg ",
            "xn--c2br7g": " xn--c2br7g ",
            "xn--cck2b3b": " xn--cck2b3b ",
            "xn--cg4bki": " xn--cg4bki ",
            "xn--czr694b": " xn--czr694b ",
            "xn--czrs0t": " xn--czrs0t ",
            "xn--czru2d": " xn--czru2d ",
            "xn--d1acj3b": " xn--d1acj3b ",
            "xn--eckvdtc9d": " xn--eckvdtc9d ",
            "xn--efvy88h": " xn--efvy88h ",
            "xn--estv75g": " xn--estv75g ",
            "xn--fct429k": " xn--fct429k ",
            "xn--fhbei": " xn--fhbei ",
            "xn--fiq228c5hs": " xn--fiq228c5hs ",
            "xn--fiq64b": " xn--fiq64b ",
            "xn--fjq720a": " xn--fjq720a ",
            "xn--flw351e": " xn--flw351e ",
            "xn--fzys8d69uvgm": " xn--fzys8d69uvgm ",
            "xn--g2xx48c": " xn--g2xx48c ",
            "xn--gckr3f0f": " xn--gckr3f0f ",
            "xn--hxt814e": " xn--hxt814e ",
            "xn--i1b6b1a6a2e": " xn--i1b6b1a6a2e ",
            "xn--imr513n": " xn--imr513n ",
            "xn--io0a7i": " xn--io0a7i ",
            "xn--j1aef": " xn--j1aef ",
            "xn--jlq61u9w7b": " xn--jlq61u9w7b ",
            "xn--jvr189m": " xn--jvr189m ",
            "xn--kcrx77d1x4a": " xn--kcrx77d1x4a ",
            "xn--kpu716f": " xn--kpu716f ",
            "xn--kput3i": " xn--kput3i ",
            "xn--mgba3a3ejt": " xn--mgba3a3ejt ",
            "xn--mgba7c0bbn0a": " xn--mgba7c0bbn0a ",
            "xn--mgbab2bd": " xn--mgbab2bd ",
            "xn--mgbb9fbpob": " xn--mgbb9fbpob ",
            "xn--mgbca7dzdo": " xn--mgbca7dzdo ",
            "xn--mgbt3dhd": " xn--mgbt3dhd ",
            "xn--mk1bu44c": " xn--mk1bu44c ",
            "xn--mxtq1m": " xn--mxtq1m ",
            "xn--ngbc5azd": " xn--ngbc5azd ",
            "xn--ngbe9e0a": " xn--ngbe9e0a ",
            "xn--nqv7f": " xn--nqv7f ",
            "xn--nqv7fs00ema": " xn--nqv7fs00ema ",
            "xn--nyqy26a": " xn--nyqy26a ",
            "xn--p1acf": " xn--p1acf ",
            "xn--pbt977c": " xn--pbt977c ",
            "xn--pssy2u": " xn--pssy2u ",
            "xn--q9jyb4c": " xn--q9jyb4c ",
            "xn--qcka1pmc": " xn--qcka1pmc ",
            "xn--rhqv96g": " xn--rhqv96g ",
            "xn--rovu88b": " xn--rovu88b ",
            "xn--ses554g": " xn--ses554g ",
            "xn--t60b56a": " xn--t60b56a ",
            "xn--tckwe": " xn--tckwe ",
            "xn--unup4y": " xn--unup4y ",
            "xn--vermgensberater-ctb": " xn--vermgensberater-ctb ",
            "xn--vermgensberatung-pwb": " xn--vermgensberatung-pwb ",
            "xn--vhquv": " xn--vhquv ",
            "xn--vuq861b": " xn--vuq861b ",
            "xn--w4r85el8fhu5dnra": " xn--w4r85el8fhu5dnra ",
            "xn--w4rs40l": " xn--w4rs40l ",
            "xn--xhq521b": " xn--xhq521b ",
            "xn--zfr164b": " xn--zfr164b ",
            xperia: " xperia ",
            xyz: " xyz ",
            yachts: " yachts ",
            yahoo: " yahoo ",
            yamaxun: " yamaxun ",
            yandex: " yandex ",
            yodobashi: " yodobashi ",
            yoga: " yoga ",
            yokohama: " yokohama ",
            you: " you ",
            youtube: " youtube ",
            yun: " yun ",
            zappos: " zappos ",
            zara: " zara ",
            zero: " zero ",
            zip: " zip ",
            zippo: " zippo ",
            zone: " zone ",
            zuerich: " zuerich "
        },
        exceptions: {
            ck: " www ",
            jp: " city.kawasaki city.kitakyushu city.kobe city.nagoya city.sapporo city.sendai city.yokohama ",
            mz: " teledata "
        }
    }
}, function(a, i) {
    "use strict";

    function e(a, i, e) {
        if ("*" === a) return t;
        var o = a.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^ ]*?");
        return 0 > i ? o = "^" + o : i > 0 && (o += o + "$"), new RegExp(o, e)
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = e;
    var t = {
        match: {
            0: "",
            index: 0
        },
        exec: function(a) {
            return this.match[0] = a, this.match
        },
        test: function() {
            return !0
        }
    };
    a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e() {}
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i.histogram = e
}, function(a, i) {
    "use strict";

    function e(a) {
        return a.toString(16)
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a, i) {
        this.promoted = 0, this.vip = 16, this.f = null, this.filters = [], void 0 !== a && (this.filters[0] = a, void 0 !== i && (this.filters[1] = i)), Object.defineProperty(this, "rtfid", {
            get: function() {
                return this.f.rtfid
            }
        })
    };
    e.prototype.add = function(a) {
        this.filters.push(a)
    }, e.prototype.promote = function(a) {
        for (var i = this.filters, e = i.length >>> 1; e > a && (e >>>= 1, !(e < this.vip)););
        if (!(e >= a)) {
            var t = this.promoted % e,
                o = i[t];
            i[t] = i[a], i[a] = o, this.promoted += 1
        }
    }, e.prototype.match = function(a, i) {
        for (var e = this.filters, t = e.length, o = 0; t > o; o++)
            if (e[o].match(a, i)) return this.f = e[o], o >= this.vip && this.promote(o), !0;
        return !1
    }, e.prototype.fid = "[]", e.prototype.toSelfie = function() {
        return this.filters.length.toString()
    }, e.prototype.rtCompile = function() {
        return this.f.rtCompile()
    }, e.fromSelfie = function() {
        return new e
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(27),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.tokenBeg = i
        };
    s.prototype.match = function(a, i) {
        return a.substr(i - this.tokenBeg, this.s.length) === this.s
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "a", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.tokenBeg
    }, s.compile = function(a) {
        return a.f + "	" + a.tokenBeg
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), (0, n["default"])(a.slice(i + 1)))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e(a) {
        return t(a, 10)
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = e;
    var t = parseInt;
    a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(27),
        n = t(o),
        s = e(29),
        r = t(s),
        u = function(a, i, e) {
            this.s = a, this.tokenBeg = i, this.domainOpt = e, this.hostnameTest = (0, r["default"])(this)
        };
    u.prototype.match = function(a, i) {
        return this.hostnameTest(this) && a.substr(i - this.tokenBeg, this.s.length) === this.s
    }, u.fid = u.prototype.fid = u.prototype.rtfid = "ah", u.prototype.toSelfie = u.prototype.rtCompile = function() {
        return this.s + "	" + this.tokenBeg + "	" + this.domainOpt
    }, u.compile = function(a) {
        return a.f + "	" + a.tokenBeg + "	" + a.domainOpt
    }, u.fromSelfie = function(a) {
        var i = a.split("	");
        return new u(i[0], (0, n["default"])(i[1]), i[2])
    }, i["default"] = u, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(30),
        n = t(o),
        s = function(a) {
            var i = a.domainOpt;
            if (-1 === i.indexOf("|")) return "~" !== i.charAt(0) ? r : u;
            var e, t, o = a._hostnameDict = Object.create(null),
                n = i.split("|"),
                s = !1,
                m = !1;
            for (e = n.length; e--;)
                if ("~" !== n[e].charAt(0)) {
                    if (s = !0, m) break
                } else if (m = !0, s) break;
            if (s && m) {
                for (e = n.length; e--;) t = n[e], "~" !== t.charAt(0) ? o[t] = !0 : o[t.slice(1)] = !1;
                return l
            }
            for (e = n.length; e--;) t = n[e], "~" !== t.charAt(0) ? o[t] = !0 : o[t.slice(1)] = !0;
            return s ? c : h
        },
        r = function(a) {
            var i = a.domainOpt;
            return n["default"].pageHostname.slice(0 - i.length) === i
        },
        u = function(a) {
            var i = a.domainOpt;
            return n["default"].pageHostname.slice(1 - i.length) !== i.slice(1)
        },
        c = function(a) {
            for (var i, e = a._hostnameDict, t = n["default"].pageHostname;;) {
                if (e[t]) return !0;
                if (i = t.indexOf("."), -1 === i) break;
                t = t.slice(i + 1)
            }
            return !1
        },
        h = function(a) {
            for (var i, e = a._hostnameDict, t = n["default"].pageHostname;;) {
                if (e[t]) return !1;
                if (i = t.indexOf("."), -1 === i) break;
                t = t.slice(i + 1)
            }
            return !0
        },
        l = function(a) {
            for (var i, e, t = a._hostnameDict, o = n["default"].pageHostname, s = !1;;) {
                if (i = t[o] || void 0, i === !1) return !1;
                if (i && (s = !0), e = o.indexOf("."), -1 === e) break;
                o = o.slice(e + 1)
            }
            return s
        };
    i["default"] = s, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = {
        pageHostname: "",
        requestHostname: ""
    };
    i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.s = a
    };
    e.prototype.match = function(a, i) {
        return a.substr(i, this.s.length) === this.s
    }, e.fid = e.prototype.fid = e.prototype.rtfid = "0a", e.prototype.toSelfie = e.prototype.rtCompile = function() {
        return this.s
    }, e.compile = function(a) {
        return a.f
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    s.prototype.match = function(a, i) {
        return this.hostnameTest(this) && a.substr(i, this.s.length) === this.s
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "0ah", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, s.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.s = a
    };
    e.prototype.match = function(a, i) {
        return a.substr(i - 1, this.s.length) === this.s
    }, e.fid = e.prototype.fid = e.prototype.rtfid = "1a", e.prototype.toSelfie = e.prototype.rtCompile = function() {
        return this.s
    }, e.compile = function(a) {
        return a.f
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    s.prototype.match = function(a, i) {
        return this.hostnameTest(this) && a.substr(i - 1, this.s.length) === this.s
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "1ah", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, s.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.s = a
    };
    e.prototype.match = function(a) {
        return a.slice(0, this.s.length) === this.s
    }, e.fid = e.prototype.fid = e.prototype.rtfid = "|a", e.prototype.toSelfie = e.prototype.rtCompile = function() {
        return this.s
    }, e.compile = function(a) {
        return a.f
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    s.prototype.match = function(a) {
        return this.hostnameTest(this) && a.slice(0, this.s.length) === this.s
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "|ah", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, s.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.s = a
    };
    e.prototype.match = function(a) {
        return a.slice(-this.s.length) === this.s
    }, e.fid = e.prototype.fid = e.prototype.rtfid = "a|", e.prototype.toSelfie = e.prototype.rtCompile = function() {
        return this.s
    }, e.compile = function(a) {
        return a.f
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    s.prototype.match = function(a) {
        return this.hostnameTest(this) && a.slice(-this.s.length) === this.s
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "a|h", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, s.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var t = e(40),
        o = function(a) {
            this.s = a
        };
    o.prototype.match = function(a, i) {
        if (a.substr(i, this.s.length) !== this.s) return !1;
        var e = a.indexOf("://");
        return -1 !== e && t.reURLPostHostnameAnchors.test(a.slice(e + 3, i)) === !1
    }, o.fid = o.prototype.fid = o.prototype.rtfid = "||a", o.prototype.toSelfie = o.prototype.rtCompile = function() {
        return this.s
    }, o.compile = function(a) {
        return a.f
    }, o.fromSelfie = function(a) {
        return new o(a)
    }, i["default"] = o, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = /[\/?#]/;
    i.reURLPostHostnameAnchors = e
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = e(40),
        r = function(a, i) {
            this.s = a, this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    r.prototype.match = function(a, i) {
        if (this.hostnameTest(this) === !1) return !1;
        if (a.substr(i, this.s.length) !== this.s) return !1;
        var e = a.indexOf("://");
        return -1 !== e && s.reURLPostHostnameAnchors.test(a.slice(e + 3, i)) === !1
    }, r.fid = r.prototype.fid = r.prototype.rtfid = "||ah", r.prototype.toSelfie = r.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, r.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, r.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new r(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = r, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.re = new RegExp(a)
    };
    e.prototype.match = function(a) {
        return this.re.test(a)
    }, e.fid = e.prototype.fid = e.prototype.rtfid = "//", e.prototype.toSelfie = e.prototype.rtCompile = function() {
        return this.re.source
    }, e.compile = function(a) {
        return a.f
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(29),
        n = t(o),
        s = function(a, i) {
            this.re = new RegExp(a), this.domainOpt = i, this.hostnameTest = (0, n["default"])(this)
        };
    s.prototype.match = function(a) {
        return this.hostnameTest(this) && this.re.test(a)
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "//h", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.re.source + "	" + this.domainOpt
    }, s.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(30),
        n = t(o),
        s = function() {
            this.h = "", this.dict = {}, this.count = 0
        };
    s.prototype.cutoff = 250, s.prototype.meltBucket = function(a, i) {
        var e = {};
        if (" " === i.charAt(0)) i.trim().split(" ").map(function(a) {
            e[a] = !0
        });
        else
            for (var t = 0; t < i.length;) e[i.substr(t, a)] = !0, t += a;
        return e
    }, s.prototype.freezeBucket = function(a) {
        var i = Object.keys(a);
        return i[0].length * i.length < this.cutoff ? " " + i.join(" ") + " " : i.sort().join("")
    }, s.prototype.makeKey = function(a) {
        var i = a.length;
        i > 255 && (i = 255);
        var e = i >>> 3,
            t = i >>> 2,
            o = i >>> 1;
        return String.fromCharCode((1 & a.charCodeAt(e)) << 14 | (1 & a.charCodeAt(t + e)) << 12 | (1 & a.charCodeAt(o)) << 11 | (1 & a.charCodeAt(o + e)) << 10 | (1 & a.charCodeAt(o + t + e)) << 8, i)
    }, s.prototype.add = function(a) {
        var i = this.makeKey(a),
            e = this.dict[i];
        return void 0 === e ? (e = this.dict[i] = {}, e[a] = !0, this.count += 1, !0) : ("string" == typeof e && (e = this.dict[i] = this.meltBucket(a.length, e)), e.hasOwnProperty(a) ? !1 : (e[a] = !0, this.count += 1, !0))
    }, s.prototype.freeze = function() {
        var a, i = this.dict;
        for (var e in i) a = i[e], "object" == typeof a && (i[e] = this.freezeBucket(a))
    }, s.prototype.matchesExactly = function(a) {
        var i = this.makeKey(a),
            e = this.dict[i];
        if (void 0 === e) return !1;
        if ("object" == typeof e && (e = this.dict[i] = this.freezeBucket(e)), " " === e.charAt(0)) return -1 !== e.indexOf(" " + a + " ");
        for (var t, o, n = a.length, s = 0, r = e.length / n + .5 | 0; r > s;)
            if (t = s + r >> 1, o = e.substr(n * t, n), o > a) r = t;
            else {
                if (!(a > o)) return !0;
                s = t + 1
            }
        return !1
    }, s.prototype.match = function() {
        for (var a, i = n["default"].requestHostname; this.matchesExactly(i) === !1;) {
            if (a = i.indexOf("."), -1 === a) return this.h = "", !1;
            i = i.slice(a + 1)
        }
        return this.h = i, this
    }, s.fid = s.prototype.fid = "{h}", s.rtfid = ".", s.prototype.rtCompile = function() {
        return this.h
    }, s.prototype.toSelfie = function() {
        return JSON.stringify({
            count: this.count,
            dict: this.dict
        })
    }, s.fromSelfie = function(a) {
        var i = new s,
            e = JSON.parse(a);
        return i.count = e.count, i.dict = e.dict, i
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(22),
        n = t(o),
        s = function(a, i) {
            this.s = a, this.anchor = i, this.re = null
        };
    s.prototype.match = function(a) {
        return null === this.re && (this.re = (0, n["default"])(this.s, this.anchor)), this.re.test(a)
    }, s.fid = s.prototype.fid = s.prototype.rtfid = "_", s.prototype.toSelfie = s.prototype.rtCompile = function() {
        return this.s + "	" + this.anchor
    }, s.compile = function(a) {
        return a.f + "	" + a.anchor
    }, s.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new s(a.slice(0, i), parseInt(a.slice(i + 1), 10))
    }, i["default"] = s, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(45),
        n = t(o),
        s = e(29),
        r = t(s),
        u = function(a, i, e) {
            n["default"].call(this, a, i), this.domainOpt = e, this.hostnameTest = (0, r["default"])(this)
        };
    u.prototype = Object.create(n["default"].prototype), u.prototype.constructor = u, u.prototype.match = function(a) {
        return this.hostnameTest(this) === !1 ? !1 : n["default"].prototype.match.call(this, a)
    }, u.fid = u.prototype.fid = u.prototype.rtfid = "_h", u.prototype.toSelfie = u.prototype.rtCompile = function() {
        return n["default"].prototype.toSelfie.call(this) + "	" + this.domainOpt
    }, u.compile = function(a) {
        return n["default"].compile(a) + "	" + a.domainOpt
    }, u.fromSelfie = function(a) {
        var i = a.split("	");
        return new u(i[0], parseInt(i[1], 10), i[2])
    }, i["default"] = u, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(22),
        n = t(o),
        s = e(40),
        r = function(a) {
            this.s = a, this.re = null
        };
    r.prototype.match = function(a) {
        if (null === this.re && (this.re = (0, n["default"])(this.s, 0)), this.re.test(a) === !1) return !1;
        var i = this.re.exec(a),
            e = a.indexOf("://");
        return -1 !== e && s.reURLPostHostnameAnchors.test(a.slice(e + 3, i.index)) === !1
    }, r.fid = r.prototype.fid = r.prototype.rtfid = "||_", r.prototype.toSelfie = r.prototype.rtCompile = function() {
        return this.s
    }, r.compile = function(a) {
        return a.f
    }, r.fromSelfie = function(a) {
        return new r(a)
    }, i["default"] = r, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(47),
        n = t(o),
        s = e(29),
        r = t(s),
        u = function(a, i) {
            n["default"].call(this, a), this.domainOpt = i, this.hostnameTest = (0, r["default"])(this)
        };
    u.prototype = Object.create(n["default"].prototype), u.prototype.constructor = u, u.prototype.match = function(a) {
        return this.hostnameTest(this) === !1 ? !1 : n["default"].prototype.match.call(this, a)
    }, u.fid = u.prototype.fid = u.prototype.rtfid = "||_h", u.prototype.toSelfie = u.prototype.rtCompile = function() {
        return this.s + "	" + this.domainOpt
    }, u.compile = function(a) {
        return a.f + "	" + a.domainOpt
    }, u.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new u(a.slice(0, i), a.slice(i + 1))
    }, i["default"] = n["default"], a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function() {
        this.beg = 0, this.token = ""
    };
    i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }

    function o(a) {
        if (0 !== a.domainOpt.length) return G(a);
        if (a.isRegex) return T["default"];
        var i = a.f;
        return -1 !== i.indexOf("*") || "*" === a.token ? a.hostnameAnchored ? I["default"] : B["default"] : a.anchor < 0 ? y["default"] : a.anchor > 0 ? w["default"] : a.hostnameAnchored ? _["default"] : 0 === a.tokenBeg ? h["default"] : 1 === a.tokenBeg ? k["default"] : s["default"]
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i["default"] = o;
    var n = e(26),
        s = t(n),
        r = e(28),
        u = t(r),
        c = e(31),
        h = t(c),
        l = e(32),
        m = t(l),
        d = e(33),
        k = t(d),
        g = e(34),
        f = t(g),
        p = e(35),
        y = t(p),
        b = e(36),
        v = t(b),
        x = e(37),
        w = t(x),
        z = e(38),
        j = t(z),
        C = e(39),
        _ = t(C),
        O = e(41),
        q = t(O),
        S = e(42),
        T = t(S),
        A = e(43),
        H = t(A),
        P = e(45),
        B = t(P),
        M = e(46),
        F = t(M),
        R = e(47),
        I = t(R),
        E = e(48),
        L = t(E),
        G = function(a) {
            if (a.isRegex) return H["default"];
            var i = a.f;
            return -1 !== i.indexOf("*") || "*" === a.token ? a.hostnameAnchored ? L["default"] : F["default"] : a.anchor < 0 ? v["default"] : a.anchor > 0 ? j["default"] : a.hostnameAnchored ? q["default"] : 0 === a.tokenBeg ? m["default"] : 1 === a.tokenBeg ? f["default"] : u["default"]
        };
    a.exports = i["default"]
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(19),
        n = t(o),
        s = e(50),
        r = (t(s), e(52)),
        u = /^[0-9a-z][0-9a-z.-]*[0-9a-z]$/,
        c = (1 << (r.typeOtherValue >>> 4)) - 1,
        h = function(a, i) {
            for (var e = 0; a.charAt(e) === i;) e += 1;
            if (a = a.slice(e), e = a.length) {
                for (; a.charAt(e - 1) === i;) e -= 1;
                a = a.slice(0, e)
            }
            return a
        },
        l = function() {
            this.reHasWildcard = /[\^\*]/, this.reHasUppercase = /[A-Z]/, this.reCleanupHostname = /^\|\|[.*]*/, this.reIsolateHostname = /^([^\x00-\x24\x26-\x2C\x2F\x3A-\x5E\x60\x7B-\x7F]+)(.*)/,
                this.reHasUnicode = /[^\x00-\x7F]/, this.domainOpt = "", this.reset()
        };
    l.prototype.toNormalizedType = {
        stylesheet: "stylesheet",
        image: "image",
        object: "object",
        "object-subrequest": "object",
        script: "script",
        xmlhttprequest: "xmlhttprequest",
        subdocument: "sub_frame",
        font: "font",
        other: "other",
        document: "main_frame",
        elemhide: "cosmetic-filtering",
        "inline-script": "inline-script",
        popup: "popup"
    }, l.prototype.reset = function() {
        return this.action = r.BlockAction, this.anchor = 0, this.elemHiding = !1, this.f = "", this.firstParty = !1, this.fopts = "", this.hostnameAnchored = !1, this.hostnamePure = !1, this.domainOpt = "", this.isRegex = !1, this.thirdParty = !1, this.token = "", this.tokenBeg = 0, this.tokenEnd = 0, this.types = 0, this.important = 0, this.unsupported = !1, this
    }, l.prototype.parseOptType = function(a, i) {
        var e = 1 << (r.typeNameToTypeValue[this.toNormalizedType[a]] >>> 4) - 1;
        return i ? (0 === this.types && (this.types = c), void(this.types &= ~e & c)) : void(this.types |= e)
    }, l.prototype.parseOptParty = function(a, i) {
        a && (i = !i), i ? this.firstParty = !0 : this.thirdParty = !0
    }, l.prototype.parseOptions = function(a) {
        this.fopts = a;
        for (var i, e, t = a.split(","), o = 0; o < t.length; o++)
            if (i = t[o], e = "~" === i.charAt(0), e && (i = i.slice(1)), "third-party" !== i) {
                if ("elemhide" === i || "generichide" === i) {
                    if (this.action === r.AllowAction) {
                        this.parseOptType("elemhide", !1), this.action = r.BlockAction;
                        continue
                    }
                    this.unsupported = !0;
                    break
                }
                if ("document" === i) {
                    if (this.action === r.BlockAction) {
                        this.parseOptType("document", e);
                        continue
                    }
                    this.unsupported = !0;
                    break
                }
                if (this.toNormalizedType.hasOwnProperty(i)) this.parseOptType(i, e);
                else if ("domain=" !== i.slice(0, 7))
                    if ("important" !== i) {
                        if ("first-party" !== i) {
                            this.unsupported = !0;
                            break
                        }
                        this.parseOptParty(!0, e)
                    } else this.important = r.Important;
                else this.domainOpt = i.slice(7)
            } else this.parseOptParty(!1, e)
    }, l.prototype.parse = function(a) {
        this.reset();
        var i = a;
        if (u.test(i)) return this.f = i, this.hostnamePure = this.hostnameAnchored = !0, this;
        var e = i.indexOf("#");
        if (-1 !== e) {
            var t = i.charAt(e + 1);
            if ("#" === t || "@" === t) return this.elemHiding = !0, this
        }
        if (0 === i.lastIndexOf("@@", 0) && (this.action = r.AllowAction, i = i.slice(2)), e = i.indexOf("$"), -1 !== e && (this.parseOptions(i.slice(e + 1)), i = i.slice(0, e)), "/" === i.charAt(0) && "/" === i.slice(-1) && i.length > 2) return this.isRegex = !0, this.f = i.slice(1, -1), this;
        if (0 === i.lastIndexOf("||", 0)) {
            if (this.hostnameAnchored = !0, i = i.replace(this.reCleanupHostname, ""), this.reHasUnicode.test(i)) {
                var o = this.reIsolateHostname.exec(i);
                o && 3 === o.length && (i = n["default"].toASCII(o[1]) + o[2])
            }
            if ("^" === i.charAt(0)) return this.unsupported = !0, this
        }
        return "|" === i.charAt(0) && (this.anchor = -1, i = i.slice(1)), "|" === i.slice(-1) && (this.anchor = 1, i = i.slice(0, -1)), this.reHasWildcard.test(i) && (i = i.replace(/\^/g, "*").replace(/\*\*+/g, "*"), i = h(i, "*")), "" === i && (i = "*"), this.hostnamePure = this.hostnameAnchored && u.test(i), this.f = this.reHasUppercase.test(i) ? i.toLowerCase() : i, this
    };
    var m = /^[0-9a-z]+/g,
        d = /[%0-9a-z]{2,}/g,
        k = {
            com: !0,
            http: !0,
            https: !0,
            icon: !0,
            images: !0,
            img: !0,
            js: !0,
            net: !0,
            news: !0,
            www: !0
        },
        g = function(a) {
            d.lastIndex = 0;
            for (var i; i = d.exec(a);)
                if ("*" !== a.charAt(d.lastIndex) && !k.hasOwnProperty(i[0])) return i;
            for (d.lastIndex = 0; i = d.exec(a);)
                if ("*" !== a.charAt(d.lastIndex)) return i;
            return null
        },
        f = function(a) {
            return m.lastIndex = 0, m.exec(a)
        };
    l.prototype.makeToken = function() {
        if (this.isRegex) return void(this.token = "*");
        var a = this.f;
        if ("*" === a) return void(this.token = "*");
        var i;
        if (this.hostnameAnchored && -1 === a.indexOf("*")) {
            if (i = f(a), !i || 0 === i[0].length) return;
            return this.tokenBeg = i.index, this.tokenEnd = m.lastIndex, void(this.token = a.slice(this.tokenBeg, this.tokenEnd))
        }
        return i = g(a), null === i || 0 === i[0].length ? void(this.token = "*") : (this.tokenBeg = i.index, this.tokenEnd = d.lastIndex, void(this.token = a.slice(this.tokenBeg, this.tokenEnd)))
    }, i["default"] = l, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = 0;
    i.BlockAction = e;
    var t = 1;
    i.AllowAction = t;
    var o = 2;
    i.Important = o;
    var n = 0;
    i.AnyParty = n;
    var s = 4;
    i.FirstParty = s;
    var r = 8;
    i.ThirdParty = r;
    var u = 0;
    i.AnyType = u;
    var c = {
        stylesheet: 16,
        image: 32,
        object: 48,
        script: 64,
        xmlhttprequest: 80,
        sub_frame: 96,
        font: 112,
        other: 128,
        main_frame: 192,
        "cosmetic-filtering": 208,
        "inline-script": 224,
        popup: 240
    };
    i.typeNameToTypeValue = c;
    var h = c.other;
    i.typeOtherValue = h;
    var l = {
        1: "stylesheet",
        2: "image",
        3: "object",
        4: "script",
        5: "xmlhttprequest",
        6: "subdocument",
        7: "font",
        8: "other",
        12: "document",
        13: "cosmetic-filtering",
        14: "inline-script",
        15: "popup"
    };
    i.typeValueToTypeName = l;
    var m = (1 << (h >>> 4)) - 1;
    i.allNetRequestTypesBitmap = m;
    var d = e | u | n;
    i.BlockAnyTypeAnyParty = d;
    var k = e | u;
    i.BlockAnyType = k;
    var g = e | n;
    i.BlockAnyParty = g;
    var f = t | u | n;
    i.AllowAnyTypeAnyParty = f;
    var p = t | u;
    i.AllowAnyType = p;
    var y = t | n;
    i.AllowAnyParty = y
}, function(a, i, e) {
    "use strict";

    function t(a) {
        return a && a.__esModule ? a : {
            "default": a
        }
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var o = e(19),
        n = t(o),
        s = e(17),
        r = t(s),
        u = e(54),
        c = e(55),
        h = t(c),
        l = e(56),
        m = t(l),
        d = e(57),
        k = t(d),
        g = e(58),
        f = t(g),
        p = e(59),
        y = t(p),
        b = e(60),
        v = t(b),
        x = e(61),
        w = t(x),
        z = !0,
        j = function(a, i, e) {
            var t = i.length,
                o = t >> 1,
                n = t >> 2,
                s = t >> 3,
                r = (2166136261 ^ i.charCodeAt(0)) >>> 0;
            return r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(s), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(n), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(n + s), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(o), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(o + s), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(o + n), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r ^= i.charCodeAt(t - 1), r += (r << 1) + (r << 4) + (r << 7) + (r << 8) + (r << 24), r >>>= 0, r &= e, 0 !== a && (r |= 131072), r.toString(36)
        },
        C = function() {
            this.domainHashMask = 1023, this.type0NoDomainHash = "type0NoDomain", this.type1NoDomainHash = "type1NoDomain", this.parser = new v["default"], this.selectorCachePruneDelay = 3e5, this.selectorCacheAgeMax = 12e5, this.selectorCacheCountMin = 10, this.selectorCacheTimer = null, this.reHasUnicode = /[^\x00-\x7F]/, this.punycode = n["default"], this.reset()
        };
    C.prototype.reset = function() {
        this.parser.reset(), this.frozen = !1, this.acceptedCount = 0, this.duplicateCount = 0, this.duplicateBuster = {}, this.selectorCache = {}, this.selectorCacheCount = 0, this.lowGenericHide = {}, this.highLowGenericHide = {}, this.highLowGenericHideCount = 0, this.highMediumGenericHide = {}, this.highMediumGenericHideCount = 0, this.highHighGenericHideArray = [], this.highHighGenericHide = "", this.highHighGenericHideCount = 0, this.genericDonthide = [], this.hostnameFilters = {}, this.entityFilters = {}, this.scriptTagFilters = {}, this.scriptTagFilterCount = 0
    }, C.prototype.isValidSelector = function() {
        var a = document.createElement("div");
        return "function" != typeof a.matches ? function() {
            return !0
        } : function(i) {
            try {
                return a.matches(i + ",\n#foo"), !0
            } catch (e) {}
            return 0 === i.lastIndexOf("script//:", 0)
        }
    }(), C.prototype.compile = function(a, i) {
        var e = this.parser.parse(a);
        if (e.cosmetic === !1) return !1;
        if (e.invalid) return !0;
        var t = e.hostnames,
            o = t.length;
        if (0 === o) return this.compileGenericSelector(e, i), !0;
        if (this.reClassOrIdSelector.test(e.suffix) === !1 && this.isValidSelector(e.suffix) === !1) return !0;
        for (var n, s = !0; o--;) n = t[o], "~" !== n.charAt(0) && (s = !1), ".*" === n.slice(-2) ? this.compileEntitySelector(n, e, i) : this.compileHostnameSelector(n, e, i);
        return s && this.compileGenericSelector(e, i), !0
    }, C.prototype.compileGenericSelector = function(a, i) {
        var e = a.suffix;
        if (a.unhide) return void(this.isValidSelector(e) && i.push("c\x0Bg1\x0B" + e));
        var t, o = e.charAt(0);
        if ("#" === o || "." === o) {
            if (t = this.rePlainSelector.exec(e), null === t) return;
            return t[1] === e ? void i.push("c\x0Blg\x0B" + t[1]) : void(this.isValidSelector(e) && i.push("c\x0Blg+\x0B" + t[1] + "\x0B" + e))
        }
        return this.reHighLow.test(e) ? void(this.isValidSelector(e) && i.push("c\x0Bhlg0\x0B" + e)) : (t = this.reHighMedium.exec(e), t && 2 === t.length ? void(this.isValidSelector(e) && i.push("c\x0Bhmg0\x0B" + t[1] + "\x0B" + e)) : void(this.isValidSelector(e) && i.push("c\x0Bhhg0\x0B" + e)))
    }, C.prototype.reClassOrIdSelector = /^([#.][\w-]+)$/, C.prototype.rePlainSelector = /^([#.][\w-]+)/, C.prototype.reHighLow = /^[a-z]*\[(?:alt|title)="[^"]+"\]$/, C.prototype.reHighMedium = /^\[href\^="https?:\/\/([^"]{8})[^"]*"\]$/, C.prototype.compileHostnameSelector = function(a, i, e) {
        var t = i.unhide;
        "~" === a.charAt(0) && (a = a.slice(1), t ^= 1), this.reHasUnicode.test(a) && (a = this.punycode.toASCII(a));
        var o, n = r["default"].domainFromHostname(a);
        o = "" === n ? 0 === t ? this.type0NoDomainHash : this.type1NoDomainHash : j(t, n, this.domainHashMask), e.push("c\x0Bh\x0B" + o + "\x0B" + a + "\x0B" + i.suffix)
    }, C.prototype.compileEntitySelector = function(a, i, e) {
        var t = a.slice(0, -2);
        e.push("c\x0Be\x0B" + t + "\x0B" + i.suffix)
    }, C.prototype.fromCompiledContent = function(a, i, e) {
        if (e) return this.skipCompiledContent(a, i);
        for (var t, o, n, s, r, u, c = a.length; c > i;) {
            if ("c" !== a.charAt(i)) return i;
            if (t = a.indexOf("\n", i), -1 === t && (t = c), o = a.slice(i + 2, t), i = t + 1, this.acceptedCount += 1, this.duplicateBuster.hasOwnProperty(o)) this.duplicateCount += 1;
            else if (this.duplicateBuster[o] = !0, n = o.split("\x0B"), "h" !== n[0])
                if ("lg" !== n[0] && "lg+" !== n[0])
                    if ("e" !== n[0]) "hlg0" !== n[0] ? "hmg0" !== n[0] ? "hhg0" !== n[0] ? "g1" === n[0] && this.genericDonthide.push(n[1]) : (this.highHighGenericHideArray.push(n[1]), this.highHighGenericHideCount += 1) : (r = n[1], u = this.highMediumGenericHide[r], void 0 === u ? this.highMediumGenericHide[r] = n[2] : Array.isArray(u) ? u.push(n[2]) : this.highMediumGenericHide[r] = [u, n[2]], this.highMediumGenericHideCount += 1) : (this.highLowGenericHide[n[1]] = !0, this.highLowGenericHideCount += 1);
                    else {
                        if (0 === n[2].lastIndexOf("script//:", 0)) {
                            this.createScriptTagFilter(n[1], n[2].slice(9));
                            continue
                        }
                        u = this.entityFilters[n[1]], void 0 === u ? this.entityFilters[n[1]] = [n[2]] : u.push(n[2])
                    }
            else s = "lg" === n[0] ? h["default"].fromSelfie() : new m["default"](n[2]), u = this.lowGenericHide[n[1]], void 0 === u ? this.lowGenericHide[n[1]] = s : u instanceof k["default"] ? u.add(s) : this.lowGenericHide[n[1]] = new k["default"](u, s);
            else {
                if (0 === n[3].lastIndexOf("script//:", 0)) {
                    this.createScriptTagFilter(n[2], n[3].slice(9));
                    continue
                }
                s = new f["default"](n[3], n[2]), u = this.hostnameFilters[n[1]], void 0 === u ? this.hostnameFilters[n[1]] = s : u instanceof k["default"] ? u.add(s) : this.hostnameFilters[n[1]] = new k["default"](u, s)
            }
        }
        return c
    }, C.prototype.skipCompiledContent = function(a, i) {
        for (var e, t = a.length; t > i;) {
            if ("c" !== a.charAt(i)) return i;
            e = a.indexOf("\n", i), -1 === e && (e = t), i = e + 1
        }
        return t
    }, C.prototype.createScriptTagFilter = function(a, i) {
        this.scriptTagFilters.hasOwnProperty(a) ? this.scriptTagFilters[a] += "|" + i : this.scriptTagFilters[a] = i, this.scriptTagFilterCount += 1
    }, C.prototype.retrieveScriptTagRegex = function(a, i) {
        if (0 !== this.scriptTagFilterCount) {
            for (var e, t = [], o = i;
                (this.scriptTagFilters.hasOwnProperty(o) && t.push(this.scriptTagFilters[o]), o !== a) && (e = o.indexOf("."), -1 !== e);) o = o.slice(e + 1);
            return e = a.indexOf("."), -1 !== e && (o = a.slice(0, e), this.scriptTagFilters.hasOwnProperty(o) && t.push(this.scriptTagFilters[o])), 0 !== t.length ? t.join("|") : void 0
        }
    }, C.prototype.freeze = function() {
        this.duplicateBuster = {}, "" !== this.highHighGenericHide && this.highHighGenericHideArray.unshift(this.highHighGenericHide), this.highHighGenericHide = this.highHighGenericHideArray.join(",\n"), this.highHighGenericHideArray = [], this.parser.reset(), this.frozen = !0
    }, C.prototype.toSelfie = function() {
        var a = function(a) {
            var i, e, t, o, n, s = [];
            for (var r in a)
                if (a.hasOwnProperty(r) !== !1 && (s.push("k	" + (0, u.encode)(r)), i = a[r], s.push(i.fid + "	" + i.toSelfie()), "[]" === i.fid))
                    for (e = i.filters, t = e.length, o = 0; t > o; o++) n = e[o], s.push(n.fid + "	" + n.toSelfie());
            return s.join("\n")
        };
        return {
            acceptedCount: this.acceptedCount,
            duplicateCount: this.duplicateCount,
            hostnameSpecificFilters: a(this.hostnameFilters),
            entitySpecificFilters: this.entityFilters,
            lowGenericHide: a(this.lowGenericHide),
            highLowGenericHide: this.highLowGenericHide,
            highLowGenericHideCount: this.highLowGenericHideCount,
            highMediumGenericHide: this.highMediumGenericHide,
            highMediumGenericHideCount: this.highMediumGenericHideCount,
            highHighGenericHide: this.highHighGenericHide,
            highHighGenericHideCount: this.highHighGenericHideCount,
            genericDonthide: this.genericDonthide,
            scriptTagFilters: this.scriptTagFilters,
            scriptTagFilterCount: this.scriptTagFilterCount
        }
    }, C.prototype.fromSelfie = function(a) {
        var i = {
                "[]": k["default"],
                "#": h["default"],
                "#+": m["default"],
                h: f["default"],
                e: y["default"]
            },
            e = function(a) {
                for (var e, t, o, n, s, r, c = {}, h = null, l = a, m = l.length, d = 0; m > d;) t = l.indexOf("\n", d), 0 > t && (t = m), o = l.slice(d, t), d = t + 1, n = o.indexOf("	"), s = o.slice(0, n), "k" !== s ? (r = i[s], null !== h ? h.add(r.fromSelfie(o.slice(n + 1))) : h = c[e] = r.fromSelfie(o.slice(n + 1))) : (e = (0, u.decode)(o.slice(n + 1)), h = null);
                return c
            };
        this.acceptedCount = a.acceptedCount, this.duplicateCount = a.duplicateCount, this.hostnameFilters = e(a.hostnameSpecificFilters), this.entityFilters = a.entitySpecificFilters, this.lowGenericHide = e(a.lowGenericHide), this.highLowGenericHide = a.highLowGenericHide, this.highLowGenericHideCount = a.highLowGenericHideCount, this.highMediumGenericHide = a.highMediumGenericHide, this.highMediumGenericHideCount = a.highMediumGenericHideCount, this.highHighGenericHide = a.highHighGenericHide, this.highHighGenericHideCount = a.highHighGenericHideCount, this.genericDonthide = a.genericDonthide, this.scriptTagFilters = a.scriptTagFilters, this.scriptTagFilterCount = a.scriptTagFilterCount, this.frozen = !0
    }, C.prototype.triggerSelectorCachePruner = function() {
        null === this.selectorCacheTimer && (this.selectorCacheCount <= this.selectorCacheCountMin || (this.selectorCacheTimer = vAPI.setTimeout(this.pruneSelectorCacheAsync.bind(this), this.selectorCachePruneDelay)))
    }, C.prototype.addToSelectorCache = function(a) {
        var i = a.hostname;
        if ("string" == typeof i && "" !== i) {
            var e = a.selectors;
            if (e) {
                var t = this.selectorCache[i];
                void 0 === t && (t = this.selectorCache[i] = w["default"].factory(), this.selectorCacheCount += 1, this.triggerSelectorCachePruner()), t.add(e, a.type)
            }
        }
    }, C.prototype.removeFromSelectorCache = function(a, i) {
        for (var e in this.selectorCache)
            if (this.selectorCache.hasOwnProperty(e) !== !1) {
                if ("*" !== a) {
                    if (e.slice(0 - a.length) !== a) continue;
                    if (e.length !== a.length && "." !== e.charAt(0 - a.length - 1)) continue
                }
                this.selectorCache[e].remove(i)
            }
    }, C.prototype.retrieveFromSelectorCache = function(a, i, e) {
        var t = this.selectorCache[a];
        void 0 !== t && t.retrieve(i, e)
    }, C.prototype.pruneSelectorCacheAsync = function() {
        if (this.selectorCacheTimer = null, !(this.selectorCacheCount <= this.selectorCacheCountMin)) {
            for (var a, i, e = this.selectorCache, t = Object.keys(e).sort(function(a, i) {
                    return e[i].lastAccessTime - e[a].lastAccessTime
                }).slice(this.selectorCacheCountMin), o = Date.now() - this.selectorCacheAgeMax, n = t.length; n-- && (a = t[n], i = e[a], !(i.lastAccessTime > o));) i.dispose(), delete e[a], this.selectorCacheCount -= 1;
            this.triggerSelectorCachePruner()
        }
    }, C.prototype.retrieveGenericSelectors = function(a) {
        if (0 !== this.acceptedCount && a.selectors) {
            var i = {
                hide: []
            };
            a.firstSurvey && (i.highGenerics = {
                hideLow: this.highLowGenericHide,
                hideLowCount: this.highLowGenericHideCount,
                hideMedium: this.highMediumGenericHide,
                hideMediumCount: this.highMediumGenericHideCount,
                hideHigh: this.highHighGenericHide,
                hideHighCount: this.highHighGenericHideCount
            }, i.donthide = this.genericDonthide);
            for (var e, t, o = i.hide, n = a.selectors, s = n.length; s--;)(e = n[s]) && (t = this.lowGenericHide[e]) && t.retrieve(e, o);
            return i
        }
    }, C.prototype.retrieveDomainSelectors = function(a) {
        if (a) {
            var i, e, t = r["default"].hostnameFromURI(a),
                o = r["default"].domainFromHostname(t) || t,
                n = o.indexOf("."),
                s = {
                    ready: this.frozen,
                    domain: o,
                    entity: -1 === n ? o : o.slice(0, n - o.length),
                    skipCosmeticFiltering: 0 === this.acceptedCount,
                    cosmeticHide: [],
                    cosmeticDonthide: [],
                    netHide: [],
                    netCollapse: z
                };
            return i = j(0, o, this.domainHashMask), (e = this.hostnameFilters[i]) && e.retrieve(t, s.cosmeticHide), (e = this.hostnameFilters[this.type0NoDomainHash]) && e.retrieve(t, s.cosmeticHide), (e = this.entityFilters[s.entity]) && (s.cosmeticHide = s.cosmeticHide.concat(e)), i = j(1, o, this.domainHashMask), (e = this.hostnameFilters[i]) && e.retrieve(t, s.cosmeticDonthide), (e = this.hostnameFilters[this.type1NoDomainHash]) && e.retrieve(t, s.cosmeticDonthide), this.retrieveFromSelectorCache(t, "cosmetic", s.cosmeticHide), this.retrieveFromSelectorCache(t, "net", s.netHide), s
        }
    }, C.prototype.getFilterCount = function() {
        return this.acceptedCount - this.duplicateCount
    }, i["default"] = C, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = JSON.stringify;
    i.encode = e;
    var t = JSON.parse;
    i.decode = t
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function() {};
    e.prototype.retrieve = function(a, i) {
        i.push(a)
    }, e.prototype.fid = "#", e.prototype.toSelfie = function() {}, e.fromSelfie = function() {
        return t
    };
    var t = new e;
    i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a) {
        this.s = a
    };
    e.prototype.retrieve = function(a, i) {
        0 === this.s.lastIndexOf(a, 0) && i.push(this.s)
    }, e.prototype.fid = "#+", e.prototype.toSelfie = function() {
        return this.s
    }, e.fromSelfie = function(a) {
        return new e(a)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function(a, i) {
        this.f = null, this.filters = [], void 0 !== a && (this.filters[0] = a, void 0 !== i && (this.filters[1] = i))
    };
    e.prototype.add = function(a) {
        this.filters.push(a)
    }, e.prototype.retrieve = function(a, i) {
        for (var e = this.filters.length; e--;) this.filters[e].retrieve(a, i)
    }, e.prototype.fid = "[]", e.prototype.toSelfie = function() {
        return this.filters.length.toString()
    }, e.fromSelfie = function() {
        return new e
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var t = e(54),
        o = function(a, i) {
            this.s = a, this.hostname = i
        };
    o.prototype.retrieve = function(a, i) {
        a.slice(-this.hostname.length) === this.hostname && i.push(this.s)
    }, o.prototype.fid = "h", o.prototype.toSelfie = function() {
        return (0, t.encode)(this.s) + "	" + this.hostname
    }, o.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new o((0, t.decode)(a.slice(0, i)), a.slice(i + 1))
    }, i["default"] = o, a.exports = i["default"]
}, function(a, i, e) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var t = e(54),
        o = function(a, i) {
            this.s = a, this.entity = i
        };
    o.prototype.retrieve = function(a, i) {
        a.slice(-this.entity.length) === this.entity && i.push(this.s)
    }, o.prototype.fid = "e", o.prototype.toSelfie = function() {
        return (0, t.encode)(this.s) + "	" + this.entity
    }, o.fromSelfie = function(a) {
        var i = a.indexOf("	");
        return new o((0, t.decode)(a.slice(0, i)), a.slice(i + 1))
    }, i["default"] = o, a.exports = i["default"]
}, function(a, i) {
    "use strict";
    Object.defineProperty(i, "__esModule", {
        value: !0
    });
    var e = function() {
        this.prefix = this.suffix = this.style = "", this.unhide = 0, this.hostnames = [], this.invalid = !1, this.cosmetic = !0, this.reParser = /^([^#]*?)(##|#@#)(.+)$/, this.reScriptContains = /^script:contains\(.+?\)$/
    };
    e.prototype.reset = function() {
        return this.prefix = this.suffix = this.style = "", this.unhide = 0, this.hostnames.length = 0, this.invalid = !1, this.cosmetic = !0, this
    }, e.prototype.parse = function(a) {
        this.reset();
        var i = this.reParser.exec(a);
        if (null === i || 4 !== i.length) return this.cosmetic = !1, this;
        if (this.prefix = i[1].trim(), this.unhide = "@" === i[2].charAt(1) ? 1 : 0, this.suffix = i[3].trim(), "}" === this.suffix.slice(-1)) return this.invalid = !0, this;
        if (-1 !== this.suffix.indexOf("##")) return this.cosmetic = !1, this;
        if ("[" === this.suffix.charAt(1) && 'href^="' === this.suffix.slice(2, 9) && (this.suffix = this.suffix.slice(1)), "" !== this.prefix && (this.hostnames = this.prefix.split(/\s*,\s*/)), "s" === this.suffix.charAt(0) && this.reScriptContains.test(this.suffix)) {
            if (0 === this.hostnames.length || 1 === this.unhide) return this.invalid = !0, this;
            var e = this.suffix;
            this.suffix = "script//:", "/" !== e.charAt(16) || "/)" !== e.slice(-2) ? this.suffix += e.slice(16, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : this.suffix += e.slice(17, -2).replace(/\\/g, "\\")
        }
        return this
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e() {
        this.reset()
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), e.junkyard = [], e.factory = function() {
        var a = e.junkyard.pop();
        return a ? a.reset() : new e
    }, e.prototype.netLowWaterMark = 20, e.prototype.netHighWaterMark = 30, e.prototype.reset = function() {
        return this.cosmetic = {}, this.net = {}, this.netCount = 0, this.lastAccessTime = Date.now(), this
    }, e.prototype.dispose = function() {
        this.cosmetic = this.net = null, e.junkyard.length < 25 && e.junkyard.push(this)
    }, e.prototype.addCosmetic = function(a) {
        for (var i = this.cosmetic, e = a.length || 0; e--;) i[a[e]] = !0
    }, e.prototype.addNet = function(a) {
        if ("string" == typeof a ? this.addNetOne(a, Date.now()) : this.addNetMany(a, Date.now()), !(this.netCount < this.netHighWaterMark))
            for (var i = this.net, e = Object.keys(i).sort(function(a, e) {
                    return i[e] - i[a]
                }).slice(this.netLowWaterMark), t = e.length; t--;) delete i[e[t]]
    }, e.prototype.addNetOne = function(a, i) {
        var e = this.net;
        void 0 === e[a] && (this.netCount += 1), e[a] = i
    }, e.prototype.addNetMany = function(a, i) {
        for (var e, t = this.net, o = a.length || 0; o--;) e = a[o], void 0 === t[e] && (this.netCount += 1), t[e] = i
    }, e.prototype.add = function(a, i) {
        this.lastAccessTime = Date.now(), "cosmetic" === i ? this.addCosmetic(a) : this.addNet(a)
    }, e.prototype.remove = function(a) {
        this.lastAccessTime = Date.now(), void 0 !== a && "cosmetic" !== a || (this.cosmetic = {}), void 0 !== a && "net" !== a || (this.net = {}, this.netCount = 0)
    }, e.prototype.retrieve = function(a, i) {
        this.lastAccessTime = Date.now();
        var e = "cosmetic" === a ? this.cosmetic : this.net;
        for (var t in e) e.hasOwnProperty(t) && i.push(t)
    }, i["default"] = e, a.exports = i["default"]
}, function(a, i) {
    "use strict";

    function e(a) {
        return new Promise(function(i, e) {
            var t = new XMLHttpRequest;
            t.open("GET", a, !0), t.onload = function() {
                this.status >= 200 && this.status < 300 ? i(t.response) : e({
                    status: this.status,
                    statusText: t.statusText
                })
            }, t.onerror = function() {
                e({
                    status: this.status,
                    statusText: t.statusText
                })
            }, t.send()
        })
    }
    Object.defineProperty(i, "__esModule", {
        value: !0
    }), i.fetchLocal = e
}]);