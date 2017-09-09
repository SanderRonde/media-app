type optionalRequire = typeof OptionalRequireInit;

declare function OptionalRequire<T>(path: string): T;
declare function OptionalRequire<T>(path: string, message: string|boolean): T;
declare function OptionalRequire<T, S>(path: string, options: {
	message?: string|boolean;
	fail?(): void;
	notFound?(): S;
}): T|S;
declare function OptionalRequire<T, U>(path: string, options: {
	message?: string|boolean;
	fail?(): void;
	notFound?(): any;
	default: U;
}): T|U;

declare function OptionalRequireInit(requireFunc: NodeRequire): typeof OptionalRequire;