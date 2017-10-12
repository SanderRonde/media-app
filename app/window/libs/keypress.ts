import { EmbeddableSendType } from '../../backgroundLibs/msg/msg';
import { MappedKeyboardEvent } from '../views/appWindow';
declare var sendMessage: EmbeddableSendType;;

(() => {
	function mapElement(el: HTMLElement): {
		id: string;
		classList: string[];
		tagName: string;
	} {
		if (el instanceof HTMLElement) {
			return {
				id: el.id,
				classList: Array.from(el.classList) as any,
				tagName: el.tagName
			};
		}
		return null;
	}

	function mapKeyEvent(e: KeyboardEvent): MappedKeyboardEvent {
		return {
			altKey: e.altKey,
			bubbles: e.bubbles,
			AT_TARGET: e.AT_TARGET,
			BUBBLING_PHASE: e.BUBBLING_PHASE,
			cancelable: e.cancelable,
			cancelBubble: e.cancelBubble,
			CAPTURING_PHASE: e.CAPTURING_PHASE,
			char: e.char,
			charCode: e.charCode,
			code: e.code,
			ctrlKey: e.ctrlKey,
			currentTarget: mapElement(e.currentTarget as HTMLElement),
			deepPath: e.deepPath,
			defaultPrevented: e.defaultPrevented,
			detail: e.detail,
			DOM_KEY_LOCATION_JOYSTICK: e.DOM_KEY_LOCATION_JOYSTICK,
			DOM_KEY_LOCATION_LEFT: e.DOM_KEY_LOCATION_LEFT,
			DOM_KEY_LOCATION_MOBILE: e.DOM_KEY_LOCATION_MOBILE,
			DOM_KEY_LOCATION_NUMPAD: e.DOM_KEY_LOCATION_NUMPAD,
			DOM_KEY_LOCATION_RIGHT: e.DOM_KEY_LOCATION_RIGHT,
			DOM_KEY_LOCATION_STANDARD: e.DOM_KEY_LOCATION_STANDARD,
			eventPhase: e.eventPhase,
			getModifierState: null,
			initEvent: null,
			initKeyboardEvent: null,
			initUIEvent: null,
			isTrusted: e.isTrusted,
			key: e.key,
			keyCode: e.keyCode,
			locale: e.locale,
			location: e.location,
			metaKey: e.metaKey,
			path: (e as any).path.map((element: HTMLElement) => {
				return mapElement(element);
			}),
			preventDefault: null,
			repeat: e.repeat,
			returnValue: e.returnValue,
			scoped: e.scoped,
			shiftKey: e.shiftKey,
			srcElement: mapElement(e.srcElement as HTMLElement),
			stopImmediatePropagation: null,
			stopPropagation: null,
			target: mapElement(e.target as HTMLElement),
			timeStamp: e.timeStamp,
			type: e.type,
			view: null,
			which: e.which
		};
	}

	document.body.addEventListener('keydown', (e) => {
		if (e.srcElement.tagName !== 'INPUT' && location.href.indexOf('accounts.google') === -1) {
			sendMessage('toWindow', 'keyPress', mapKeyEvent(e));
		}
	});

	document.body.addEventListener('paste', (e) => {
		if (e.srcElement.tagName !== 'INPUT' && location.href.indexOf('accounts.google') === -1) {
			sendMessage('toWindow', 'paste', e.clipboardData.getData('Text'));
		}
	});
})();