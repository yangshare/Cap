import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
	detectSystemLanguage,
	getInitialLanguage,
} from "./utils/language-detector";

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

describe("language-detector", () => {
	describe("detectSystemLanguage", () => {
		const invokeMock = vi.mocked(invoke);

		beforeEach(() => {
			invokeMock.mockReset();
		});

		it("should map Chinese languages to zh-CN", async () => {
			invokeMock.mockResolvedValue("zh-CN");

			const result = await detectSystemLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should map zh to zh-CN", async () => {
			invokeMock.mockResolvedValue("zh");

			const result = await detectSystemLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should map English languages to en", async () => {
			invokeMock.mockResolvedValue("en-US");

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});

		it("should map other languages to en", async () => {
			invokeMock.mockResolvedValue("ja");

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});

		it("should fallback to en on error", async () => {
			invokeMock.mockRejectedValue(new Error("System detection failed"));

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});
	});

	describe("getInitialLanguage", () => {
		it("should call detectSystemLanguage and return result", async () => {
			const mod = await import("./utils/language-detector");
			vi.spyOn(mod, "detectSystemLanguage").mockResolvedValue("zh-CN");

			const result = await getInitialLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should fallback to en on error", async () => {
			const mod = await import("./utils/language-detector");
			vi.spyOn(mod, "detectSystemLanguage").mockRejectedValue(
				new Error("Detection failed"),
			);

			const result = await getInitialLanguage();
			expect(result).toBe("en");
		});
	});
});
