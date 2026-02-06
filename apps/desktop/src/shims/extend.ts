type RecordLike = Record<string, any>;

function isPlainObject(value: unknown): value is RecordLike {
	return (
		typeof value === "object" &&
		value !== null &&
		(Object.getPrototypeOf(value) === Object.prototype ||
			Object.getPrototypeOf(value) === null)
	);
}

function mergeDeep(target: RecordLike, source: RecordLike): RecordLike {
	for (const key of Object.keys(source)) {
		const sourceValue = source[key];
		const targetValue = target[key];

		if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
			target[key] = mergeDeep({ ...targetValue }, sourceValue);
			continue;
		}

		if (isPlainObject(sourceValue)) {
			target[key] = mergeDeep({}, sourceValue);
			continue;
		}

		target[key] = sourceValue;
	}

	return target;
}

function extendImpl(deep: boolean, target: RecordLike, sources: unknown[]): RecordLike {
	for (const source of sources) {
		if (!source || typeof source !== "object") continue;

		if (deep) {
			mergeDeep(target, source as RecordLike);
			continue;
		}

		Object.assign(target, source);
	}

	return target;
}

export default function extend(...args: unknown[]): RecordLike {
	if (typeof args[0] === "boolean") {
		const deep = args[0] as boolean;
		const target = (args[1] ?? {}) as RecordLike;
		return extendImpl(deep, target, args.slice(2));
	}

	const target = (args[0] ?? {}) as RecordLike;
	return extendImpl(false, target, args.slice(1));
}
