import common from "./locales/en/common.json";
import editor from "./locales/en/editor.json";
import recording from "./locales/en/recording.json";
import settings from "./locales/en/settings.json";

type NestedKeys<T> = T extends object
	? {
			[K in keyof T]: K extends string
				? T[K] extends object
					? `${K}.${NestedKeys<T[K]>}`
					: K
				: never;
		}[keyof T]
	: never;

export type TranslationKey = NestedKeys<
	typeof common & typeof recording & typeof settings & typeof editor
>;

export const translationKeys = {
	...common,
	...recording,
	...settings,
	...editor,
} as const;
