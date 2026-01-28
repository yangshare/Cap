import { createI18nContext } from "@solid-primitives/i18n";
import { onMount } from "solid-js";
import common from "./locales/en/common.json";
import editor from "./locales/en/editor.json";
import recording from "./locales/en/recording.json";
import settings from "./locales/en/settings.json";
import commonZhCN from "./locales/zh-CN/common.json";
import editorZhCN from "./locales/zh-CN/editor.json";
import recordingZhCN from "./locales/zh-CN/recording.json";
import settingsZhCN from "./locales/zh-CN/settings.json";
import { getInitialLanguage } from "./utils/language-detector";
import { saveLanguage } from "./utils/language-persistence";

const en = {
	...common,
	...recording,
	...settings,
	...editor,
};

const zhCN = {
	...commonZhCN,
	...recordingZhCN,
	...settingsZhCN,
	...editorZhCN,
};

export const i18n = createI18nContext(
	{
		en,
		"zh-CN": zhCN,
	},
	"en",
);

export const I18nProvider = (props: { children: JSX.Element }) => {
	const Provider = i18n.Provider;

	onMount(async () => {
		try {
			const initialLang = await getInitialLanguage();
			i18n.setCurrent(initialLang as never);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Failed to set initial language:", error);
			}
		}
	});

	return <Provider>{props.children}</Provider>;
};

export const useI18n = () => {
	const t = i18n.use();

	return (key: string, params?: Record<string, string>) => {
		const translated = t(key, params);

		if (translated === key) {
			const currentLang = i18n.current()[0];
			const enValue = i18n.dict.en[key];

			if (currentLang !== "en" && enValue) {
				if (import.meta.env.DEV) {
					console.warn(
						`Missing translation for "${key}" in ${currentLang}, falling back to English`,
					);
				}
				return enValue;
			}

			if (import.meta.env.DEV) {
				console.warn(`Missing translation for "${key}" in all languages`);
			}
		}

		return translated;
	};
};

export async function switchLanguage(lang: "en" | "zh-CN"): Promise<void> {
	try {
		await saveLanguage(lang);
		i18n.setCurrent(lang as never);
	} catch (error) {
		console.error("Failed to switch language:", error);
		throw error;
	}
}

export type TranslationKey = keyof typeof en;
