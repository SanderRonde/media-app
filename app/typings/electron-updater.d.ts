declare module 'electron-updater' {
	class Lazy<T> {
		private _value;
		private creator;
		constructor(creator: () => Promise<T>);
		readonly hasValue: boolean;
		value: Promise<T>;
	}

	interface OutgoingHttpHeaders {
        [header: string]: number | string | string[] | undefined;
    }

	interface RequestHeaders extends OutgoingHttpHeaders {
		[key: string]: string;
	}

	type PublishProvider = "github" | "bintray" | "s3" | "generic";

	interface PublishConfiguration {
		/**
		 * The provider.
		 */
		readonly provider: PublishProvider;
		/**
		 * @private
		 */
		readonly publisherName?: Array<string> | null;
	}
	/**
	 * GitHub options.
	 *
	 * GitHub [personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) is required. You can generate by going to [https://github.com/settings/tokens/new](https://github.com/settings/tokens/new). The access token should have the repo scope/permission.
	 * Define `GH_TOKEN` environment variable.
	 */
	export interface GithubOptions extends PublishConfiguration {
		/**
		 * The repository name. [Detected automatically](#github-repository-and-bintray-package).
		 */
		readonly repo?: string | null;
		/**
		 * The owner.
		 */
		readonly owner?: string | null;
		/**
		 * Whether to use `v`-prefixed tag name.
		 * @default true
		 */
		readonly vPrefixedTagName?: boolean;
		/**
		 * The host (including the port if need).
		 * @default github.com
		 */
		readonly host?: string | null;
		/**
		 * The protocol. GitHub Publisher supports only `https`.
		 * @default https
		 */
		readonly protocol?: "https" | "http" | null;
		/**
		 * The access token to support auto-update from private github repositories. Never specify it in the configuration files. Only for [setFeedURL](/auto-update.md#appupdatersetfeedurloptions).
		 */
		readonly token?: string | null;
		/**
		 * Whether to use private github auto-update provider if `GH_TOKEN` environment variable is set. See [Private GitHub Update Repo](/auto-update.md#private-github-update-repo).
		 */
		readonly private?: boolean | null;
	}
	export interface GenericServerOptions extends PublishConfiguration {
		/**
		 * The base url. e.g. `https://bucket_name.s3.amazonaws.com`. You can use `${os}` (expanded to `mac`, `linux` or `win` according to target platform) and `${arch}` macros.
		 */
		readonly url: string;
		/**
		 * The channel.
		 * @default latest
		 */
		readonly channel?: string | null;
	}
	/**
	 * Amazon S3 options. `https` must be used, so, if you use direct Amazon S3 endpoints, format `https://s3.amazonaws.com/bucket_name` [must be used](http://stackoverflow.com/a/11203685/1910191). And do not forget to make files/directories public.
	 *
	 * AWS credentials are required, please see [getting your credentials](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-your-credentials.html).
	 * Define `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` [environment variables](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html).
	 * Or in the [~/.aws/credentials](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).
	 */
	export interface S3Options extends PublishConfiguration {
		/**
		 * The bucket name.
		 */
		readonly bucket: string;
		/**
		 * The directory path.
		 * @default /
		 */
		readonly path?: string | null;
		/**
		 * The region. Is determined and set automatically when publishing.
		 */
		readonly region?: string | null;
		/**
		 * The channel.
		 * @default latest
		 */
		readonly channel?: string | null;
		/**
		 * The ACL. Set to `null` to not [add](https://github.com/electron-userland/electron-builder/issues/1822).
		 *
		 * Please see [required permissions for the S3 provider](https://github.com/electron-userland/electron-builder/issues/1618#issuecomment-314679128).
		 *
		 * @default public-read
		 */
		readonly acl?: "private" | "public-read" | null;
		/**
		 * The type of storage to use for the object.
		 * @default STANDARD
		 */
		readonly storageClass?: "STANDARD" | "REDUCED_REDUNDANCY" | "STANDARD_IA" | null;
	}
	/**
	 * Bintray options.
	 */
	interface BintrayOptions extends PublishConfiguration {
		/**
		 * The Bintray package name.
		 */
		readonly package?: string | null;
		/**
		 * The Bintray repository name.
		 * @default generic
		 */
		readonly repo?: string | null;
		/**
		 * The owner.
		 */
		readonly owner?: string | null;
		/**
		 * The Bintray component (Debian only).
		 */
		readonly component?: string | null;
		/**
		 * The Bintray distribution (Debian only).
		 * @default stable
		 */
		readonly distribution?: string | null;
		/**
		 * The Bintray user account. Used in cases where the owner is an organization.
		 */
		readonly user?: string | null;
		readonly token?: string | null;
	}
	
	class CancellationToken {
		private parentCancelHandler;
		private _cancelled;
		readonly cancelled: boolean;
		private _parent;
		parent: CancellationToken;
		constructor(parent?: CancellationToken);
		cancel(): void;
		private onCancel(handler);
		createPromise<R>(callback: (resolve: (thenableOrResult?: R) => void, reject: (error?: Error) => void, onCancel: (callback: () => void) => void) => void): Promise<R>;
		private removeParentCancelHandler();
		dispose(): void;
	}

	interface VersionInfo {
		/**
		 * The version.
		 */
		readonly version: string;
	}
	interface UpdateInfo extends VersionInfo {
		readonly path: string;
		packages?: {
			[arch: string]: string;
		} | null;
		githubArtifactName?: string | null;
		/**
		 * The release name.
		 */
		readonly releaseName?: string | null;
		/**
		 * The release notes.
		 */
		readonly releaseNotes?: string | null;
		/**
		 * The release date.
		 */
		readonly releaseDate: string;
		/**
		 * @deprecated
		 * @private
		 */
		readonly sha2?: string;
		readonly sha512?: string;
		/**
		 * The [staged rollout](auto-update.md#staged-rollouts) percentage, 0-100.
		 */
		readonly stagingPercentage?: number;
	}	

	export abstract class AppUpdater {
		/**
		 * Whether to automatically download an update when it is found.
		 */
		autoDownload: boolean;
		/**
		 * *GitHub provider only.* Whether to allow update to pre-release versions. Defaults to `true` if application version contains prerelease components (e.g. `0.12.1-alpha.1`, here `alpha` is a prerelease component), otherwise `false`.
		 *
		 * If `true`, downgrade will be allowed (`allowDowngrade` will be set to `true`).
		 */
		allowPrerelease: boolean;
		/**
		 * Whether to allow version downgrade (when a user from the beta channel wants to go back to the stable channel).
		 * @default false
		 */
		allowDowngrade: boolean;
		/**
		 *  The request headers.
		 */
		requestHeaders: RequestHeaders | null;
		/**
		 * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
		 * Set it to `null` if you would like to disable a logging feature.
		 */
		logger: Logger | null;
		/**
		 * For type safety you can use signals, e.g. `autoUpdater.signals.updateDownloaded(() => {})` instead of `autoUpdater.on('update-available', () => {})`
		 */
		readonly signals: UpdaterSignal;
		/**
		 * test only
		 * @private
		 */
		updateConfigPath: string | null;
		configOnDisk: Lazy<any>;
		constructor(options: PublishConfiguration | null | undefined, app?: any);
		getFeedURL(): string | null | undefined;
		/**
		 * Configure update provider. If value is `string`, [GenericServerOptions](/publishing-artifacts.md#GenericServerOptions) will be set with value as `url`.
		 * @param options If you want to override configuration in the `app-update.yml`.
		 */
		setFeedURL(options: PublishConfiguration | GenericServerOptions | S3Options | BintrayOptions | GithubOptions | string): void;
		/**
		 * Asks the server whether there is an update.
		 */
		checkForUpdates(): Promise<UpdateCheckResult>;
		/**
		 * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
		 * @returns {Promise<string>} Path to downloaded file.
		 */
		downloadUpdate(cancellationToken?: CancellationToken): Promise<any>;
		/**
		 * Restarts the app and installs the update after it has been downloaded.
		 * It should only be called after `update-downloaded` has been emitted.
		 *
		 * **Note:** `autoUpdater.quitAndInstall()` will close all application windows first and only emit `before-quit` event on `app` after that.
		 * This is different from the normal quit event sequence.
		 *
		 * @param isSilent *windows-only* Runs the installer in silent mode.
		 * @param isForceRunAfter *windows-only* Run the app after finish even on silent install.
		 */
		abstract quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;

		on(event: 'checking-for-update', callback: () => void): void;
		on(event: 'update-available', callback: (info: UpdateInfo) => void): void;
		on(event: 'update-not-available', callback: (info: UpdateInfo) => void): void;
		on(event: 'error', callback: (err: Error) => void): void;
		on(event: 'download-progress', callback: (progressObj: ProgressInfo) => void): void;
		on(event: 'update-downloaded', callback: (info: UpdateInfo) => void): void;
	}	

	type LoginCallback = (username: string, password: string) => void;

	interface ProgressInfo {
		total: number;
		delta: number;
		transferred: number;
		percent: number;
		bytesPerSecond: number;
	}

	export const autoUpdater: AppUpdater;
	export interface FileInfo {
		readonly name: string;
		readonly url: string;
		readonly sha2?: string;
		readonly sha512?: string;
		readonly headers?: RequestHeaders;
	}
	export abstract class Provider<T extends VersionInfo> {
		protected requestHeaders: RequestHeaders | null;
		setRequestHeaders(value: RequestHeaders | null): void;
		abstract getLatestVersion(): Promise<T>;
		abstract getUpdateFile(versionInfo: T): Promise<FileInfo>;
		static validateUpdateInfo(info: UpdateInfo): void;
	}
	export function getDefaultChannelName(): string;
	export function getCustomChannelName(channel: string): string;
	export function getCurrentPlatform(): string;
	export function isUseOldMacProvider(): boolean;
	export function getChannelFilename(channel: string): string;
	export interface UpdateCheckResult {
		readonly versionInfo: VersionInfo;
		readonly fileInfo?: FileInfo;
		readonly downloadPromise?: Promise<any> | null;
		readonly cancellationToken?: CancellationToken;
	}
	export const DOWNLOAD_PROGRESS = "download-progress";
	export const UPDATE_DOWNLOADED = "update-downloaded";
	export type LoginHandler = (authInfo: any, callback: LoginCallback) => void;
	export class UpdaterSignal {
		private emitter;
		constructor(emitter: any);
		/**
		 * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
		 */
		login(handler: LoginHandler): void;
		progress(handler: (info: ProgressInfo) => void): void;
		updateDownloaded(handler: (info: VersionInfo) => void): void;
		updateCancelled(handler: (info: VersionInfo) => void): void;
	}
	export function formatUrl(url: URL): string;
	export interface Logger {
		info(message?: any): void;
		warn(message?: any): void;
		error(message?: any): void;
	}
}