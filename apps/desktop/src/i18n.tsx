import { flatten } from "@solid-primitives/i18n";
import {
	createContext,
	createMemo,
	createSignal,
	onMount,
	useContext,
	type Accessor,
	type JSX,
} from "solid-js";
import common from "./locales/en/common.json";
import editor from "./locales/en/editor.json";
import overlay from "./locales/en/overlay.json";
import recording from "./locales/en/recording.json";
import screenshotEditor from "./locales/en/screenshot-editor.json";
import settings from "./locales/en/settings.json";
import setup from "./locales/en/setup.json";
import commonZhCN from "./locales/zh-CN/common.json";
import editorZhCN from "./locales/zh-CN/editor.json";
import overlayZhCN from "./locales/zh-CN/overlay.json";
import recordingZhCN from "./locales/zh-CN/recording.json";
import screenshotEditorZhCN from "./locales/zh-CN/screenshot-editor.json";
import settingsZhCN from "./locales/zh-CN/settings.json";
import setupZhCN from "./locales/zh-CN/setup.json";
import { getInitialLanguage, type Language } from "./utils/language-detector";
import { saveLanguage } from "./utils/language-persistence";

const en = {
	...common,
	...recording,
	...settings,
	...editor,
	...overlay,
	...setup,
	...screenshotEditor,
};

const zhCN = {
	...commonZhCN,
	...recordingZhCN,
	...settingsZhCN,
	...editorZhCN,
	...overlayZhCN,
	...setupZhCN,
	...screenshotEditorZhCN,
};

const dictionaries = {
	en: flatten(en),
	"zh-CN": flatten(zhCN),
};

const [currentLanguage, setCurrentLanguage] = createSignal<Language>("en");

function createTranslator(lang: Language) {
	return (key: string, params?: Record<string, string | number | boolean>) => {
		const dict = dictionaries[lang];
		let result = dict[key as keyof typeof dict] as string | undefined;

		if (result && params) {
			Object.entries(params).forEach(([paramKey, paramValue]) => {
				result = result?.replace(
					new RegExp(`{{${paramKey}}}`, "g"),
					String(paramValue),
				);
			});
		}

		if (!result && lang !== "en") {
			result = dictionaries.en[key as keyof typeof dictionaries.en] as
				| string
				| undefined;
			if (result && import.meta.env.DEV) {
				console.warn(
					`Missing translation for "${key}" in ${lang}, falling back to English`,
				);
			}
		}

		if (!result && import.meta.env.DEV) {
			console.warn(`Missing translation for "${key}" in all languages`);
		}

		return result || key;
	};
}

type I18nContextType = {
	t: (key: string, params?: Record<string, string | number | boolean>) => string;
	currentLanguage: Accessor<Language>;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = (props: { children: JSX.Element }) => {
	onMount(async () => {
		try {
			const initialLang = await getInitialLanguage();
			setCurrentLanguage(initialLang);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Failed to set initial language:", error);
			}
		}
	});

	const contextValue: I18nContextType = {
		get t() {
			return createTranslator(currentLanguage());
		},
		currentLanguage,
	};

	return (
		<I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>
	);
};

export const useI18n = () => {
	const translate = createMemo(() => {
		const lang = currentLanguage();
		return createTranslator(lang);
	});

	return (key: string, params?: Record<string, string | number | boolean>) => {
		return translate()(key, params);
	};
};

export const useI18nContext = () => {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useI18nContext must be used within I18nProvider");
	}
	return context;
};

export async function switchLanguage(lang: Language): Promise<void> {
	try {
		await saveLanguage(lang);
		setCurrentLanguage(lang);
	} catch (error) {
		console.error("Failed to switch language:", error);
		throw error;
	}
}

export { currentLanguage, getCurrentLanguage };

function getCurrentLanguage(): Language {
	return currentLanguage();
}

export const i18n = {
	current: () => [currentLanguage(), setCurrentLanguage] as const,
	dict: {
		en: en,
		"zh-CN": zhCN,
	},
	setCurrent: (lang: Language) => setCurrentLanguage(lang),
};

export type TranslationKey = keyof typeof en;
