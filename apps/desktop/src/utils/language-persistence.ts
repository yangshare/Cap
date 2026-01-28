import { Store } from "@tauri-apps/plugin-store";

import type { Language } from "./language-detector";

const STORE_PATH = "preferences.json";
const LANGUAGE_KEY = "language";

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
	if (!storeInstance) {
		storeInstance = new Store(STORE_PATH);
	}
	return storeInstance;
}

export async function saveLanguage(lang: Language): Promise<void> {
	try {
		const store = await getStore();
		await store.set(LANGUAGE_KEY, lang);
		await store.save();
	} catch (error) {
		console.error("Failed to save language preference:", error);
		throw error;
	}
}

export async function loadLanguage(): Promise<Language | null> {
	try {
		const store = await getStore();
		const lang = await store.get<Language>(LANGUAGE_KEY);

		if (lang === "en" || lang === "zh-CN") {
			return lang;
		}

		return null;
	} catch (error) {
		console.error("Failed to load language preference:", error);
		return null;
	}
}

export async function clearLanguage(): Promise<void> {
	try {
		const store = await getStore();
		await store.delete(LANGUAGE_KEY);
		await store.save();
	} catch (error) {
		console.error("Failed to clear language preference:", error);
		throw error;
	}
}
