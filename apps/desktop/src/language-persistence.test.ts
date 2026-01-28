import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Language } from "./utils/language-detector";
import {
	clearLanguage,
	loadLanguage,
	saveLanguage,
} from "./utils/language-persistence";

describe("language-persistence", () => {
	describe("saveLanguage", () => {
		it("should save language to store", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				set: vi.fn().mockResolvedValue(undefined),
				save: vi.fn().mockResolvedValue(undefined),
			};

			vi.spyOn(Store.prototype, "set").mockImplementation(mockStore.set);
			vi.spyOn(Store.prototype, "save").mockImplementation(mockStore.save);

			await saveLanguage("zh-CN");

			expect(mockStore.set).toHaveBeenCalledWith("language", "zh-CN");
			expect(mockStore.save).toHaveBeenCalled();
		});

		it("should handle save errors", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				set: vi.fn().mockRejectedValue(new Error("Save failed")),
				save: vi.fn().mockResolvedValue(undefined),
			};

			vi.spyOn(Store.prototype, "set").mockImplementation(mockStore.set);

			await expect(saveLanguage("en")).rejects.toThrow("Save failed");
		});
	});

	describe("loadLanguage", () => {
		it("should load valid language from store", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				get: vi.fn().mockResolvedValue("zh-CN"),
			};

			vi.spyOn(Store.prototype, "get").mockImplementation(mockStore.get);

			const result = await loadLanguage();

			expect(result).toBe("zh-CN");
			expect(mockStore.get).toHaveBeenCalledWith("language");
		});

		it("should return null for invalid language", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				get: vi.fn().mockResolvedValue("fr"),
			};

			vi.spyOn(Store.prototype, "get").mockImplementation(mockStore.get);

			const result = await loadLanguage();

			expect(result).toBeNull();
		});

		it("should return null when store is empty", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				get: vi.fn().mockResolvedValue(null),
			};

			vi.spyOn(Store.prototype, "get").mockImplementation(mockStore.get);

			const result = await loadLanguage();

			expect(result).toBeNull();
		});

		it("should handle load errors", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				get: vi.fn().mockRejectedValue(new Error("Load failed")),
			};

			vi.spyOn(Store.prototype, "get").mockImplementation(mockStore.get);

			const result = await loadLanguage();

			expect(result).toBeNull();
		});
	});

	describe("clearLanguage", () => {
		it("should clear language from store", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");

			const mockStore = {
				delete: vi.fn().mockResolvedValue(undefined),
				save: vi.fn().mockResolvedValue(undefined),
			};

			vi.spyOn(Store.prototype, "delete").mockImplementation(mockStore.delete);
			vi.spyOn(Store.prototype, "save").mockImplementation(mockStore.save);

			await clearLanguage();

			expect(mockStore.delete).toHaveBeenCalledWith("language");
			expect(mockStore.save).toHaveBeenCalled();
		});
	});

	describe("integration with language-detector", () => {
		it("should prioritize saved language over system detection", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");
			const { getInitialLanguage } = await import("./utils/language-detector");

			const mockStore = {
				get: vi.fn().mockResolvedValue("zh-CN"),
			};

			vi.spyOn(Store.prototype, "get").mockImplementation(mockStore.get);

			const result = await getInitialLanguage();

			expect(result).toBe("zh-CN");
			expect(mockStore.get).toHaveBeenCalledWith("language");
		});
	});

	describe("language switching", () => {
		it("should switch language and save to store", async () => {
			const { Store } = await import("@tauri-apps/plugin-store");
			const { switchLanguage } = await import("./i18n");

			const mockStore = {
				set: vi.fn().mockResolvedValue(undefined),
				save: vi.fn().mockResolvedValue(undefined),
			};

			vi.spyOn(Store.prototype, "set").mockImplementation(mockStore.set);
			vi.spyOn(Store.prototype, "save").mockImplementation(mockStore.save);

			await switchLanguage("en");

			expect(mockStore.set).toHaveBeenCalledWith("language", "en");
			expect(mockStore.save).toHaveBeenCalled();
		});
	});
});
