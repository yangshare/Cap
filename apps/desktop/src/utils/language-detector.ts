import { loadLanguage } from "./language-persistence";
import { commands } from "./tauri";

export type Language = "en" | "zh-CN";

export async function detectSystemLanguage(): Promise<Language> {
	try {
		const systemLang = await commands.getSystemLanguage();

		if (systemLang.startsWith("zh")) {
			return "zh-CN";
		}

		return "en";
	} catch (error) {
		console.error("Failed to detect system language:", error);
		return "en";
	}
}

export async function getInitialLanguage(): Promise<Language> {
	try {
		const savedLang = await loadLanguage();

		if (savedLang) {
			return savedLang;
		}

		const systemLang = await detectSystemLanguage();
		return systemLang;
	} catch (error) {
		console.error("Failed to get initial language:", error);
		return "en";
	}
}
