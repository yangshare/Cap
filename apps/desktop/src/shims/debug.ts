export type Debugger = ((...args: unknown[]) => void) & {
	enabled: boolean;
	namespace: string;
	extend: (subNamespace: string, delimiter?: string) => Debugger;
	destroy?: () => boolean;
};

export type DebugStatic = ((namespace: string) => Debugger) & {
	enable: (namespaces: string) => void;
	disable: () => string;
	enabled: (namespace: string) => boolean;
	log: (...args: unknown[]) => void;
};

function createDebugger(namespace: string): Debugger {
	const fn = ((..._args: unknown[]) => {}) as Debugger;
	fn.enabled = false;
	fn.namespace = namespace;
	fn.extend = (subNamespace: string, delimiter = ":") =>
		createDebugger(`${namespace}${delimiter}${subNamespace}`);
	fn.destroy = () => true;
	return fn;
}

const debug = ((namespace: string) => createDebugger(namespace)) as DebugStatic;

debug.enable = (_namespaces: string) => {};
debug.disable = () => "";
debug.enabled = (_namespace: string) => false;
debug.log = (..._args: unknown[]) => {};

export default debug;
export const enable = debug.enable;
export const disable = debug.disable;
export const enabled = debug.enabled;
export const log = debug.log;
