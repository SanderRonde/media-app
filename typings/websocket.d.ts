declare module 'websocket' {
	import http = require('http');

	class WebSocketRequest {
		constructor(socket: WebSocket, httpRequest: http.IncomingMessage, config: ServerConfigNoServer);
		httpRequest: http.IncomingMessage;
		host: string;
		resource: string;
		resourceURL: string;
		remoteAddress: string;
		webSocketVersion: number;
		origin: string|null|'*';
		requestedExtensions: any[];
		requestedProtocols: string[];

		accept(acceptedProtocol: string|null, allowedOrigin: string): WebSocketConnection;
		reject(httpStatus?: number, reason?: string): void;

		on(event: 'requestAccepted', handler: (webSocketConnection: WebSocketConnection) => void): void;
		on(event: 'requestRejected', handler: () => void): void;
	}

	class WebSocketFrame {
		fin: boolean;
		rsv1: boolean;
		rsv2: boolean;
		rsv3: boolean;
		mask: number;
		opcode: number;
		readonly length: number;
		binaryPayload: Buffer;
	}

	class WebSocketConnection {
		closeDescription: string;
		closeReasonCode: number;
		socket: WebSocket;
		protocol: string;
		extensions: any[];
		remoteAddress: string;
		webSocketVersion: number;
		connected: boolean;

		close(reasonCode?: number, description?: string): void;
		drop(reasonCode?: number, description?: string): void;
		sendUTF(string: string): void;
		sendBytes(buffer: Buffer): void;
		send(data: string|Buffer): void;
		ping(data: string|Buffer): void;
		pong(data: string|Buffer): void;
		sendFrame(webSocketFrame: WebSocketFrame): void;

		on(event: 'message', listener: (message: {
			type: 'utf8';
			utf8Data: string;
		}|{
			type: 'binary';
			binaryData: Buffer;
		}) => void): void;
		on(event: 'frame', listener: (websocketFrame: WebSocketFrame) => void): void;
		on(event: 'close', listener: (reasonCode: number, description: string) => void): void;
		on(event: 'error', listener: (error: Error) => void): void;
		on(event: 'ping', listener: (cancel: () => void, data: Buffer) => void): void;
		on(event: 'pong', listener: (data: Buffer) => void): void;
	}

	interface ServerConfigNoServer {
		maxReceivedFrameSize?: number;
		maxReceivedMessageSize?: number;
		fragmentOutgoingMessages?: number;
		fragmentationThreshold?: number;
		keepalive?: boolean;
		keepaliveInterval?: number;
		dropConnectionOnKeepaliveTimeout?: boolean;
		keepaliveGracePeriod?: number;
		assembleFragments?: boolean;
		autoAcceptConnections?: boolean;
		closeTimeout?: number;
		disableNagleAlgorithm?: boolean;
		ignoreXForwardedFor?: boolean;
	}

	interface ServerConfig extends ServerConfigNoServer {
		httpServer: http.Server;
	}

	export class server {
		constructor(config: ServerConfig);

		static mount(serverConfig: ServerConfig): server;
		static unmount(): void;
		static closeAllConnections(): void;
		static shutDown(): void;

		on(event: 'request', callback: (webSocketRequest: WebSocketRequest) => void): void;
		on(event: 'connect', callback: (connection: WebSocketConnection) => void): void;
		on(event: 'close', callback: (connection: WebSocketConnection, closeReason: number, description: string) => void): void;
	}

	interface ClientConfig {
		webSocketVersion?: number;
		maxReceivedFrameSize?: number;
		maxReceivedMessageSize?: number;
		fragmentOutgoingMessages?: number;
		fragmentationThreshold?: number;
		assembleFragments?: boolean;
		closeTimeout?: number;
		tlsOptions?: {
			hostname: string;
			port: number;
			path: string;
			method: string;
			key: string;
			cert: string;
		}
	}

	export class client {
		constructor(config?: ClientConfig);

		connect(requestUrl: string, requestedProtocols: string[]|null, origin?: string|null, headers?: null|{
			[key: string]: string;
		}, requestOptions?: {
			hostname: string;
			port: number;
			path: string;
			method: string;
			key: string;
			cert: string;
		}|{
			hostname: string;
			port: number;
			path: string;
			method: string;
		}): void;
		abort(): void;

		on(event: 'connect', listener: (connection: WebSocketConnection) => void): void;
		on(event: 'connectFailed', listener: (errorDescription: string) => void): void;
		on(event: 'httpResponse', listener: (response: http.IncomingMessage, webSocketClient: client) => void): void;
	}
}