import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	detectSystemLanguage,
	getInitialLanguage,
} from "./utils/language-detector";

describe("language-detector", () => {
	describe("detectSystemLanguage", () => {
		it("should map Chinese languages to zh-CN", async () => {
			const { commands } = await import("./utils/tauri");

			vi.spyOn(commands, "getSystemLanguage").mockResolvedValue("zh-CN");

			const result = await detectSystemLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should map zh to zh-CN", async () => {
			const { commands } = await import("./utils/tauri");

			vi.spyOn(commands, "getSystemLanguage").mockResolvedValue("zh");

			const result = await detectSystemLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should map English languages to en", async () => {
			const { commands } = await import("./utils/tauri");

			vi.spyOn(commands, "getSystemLanguage").mockResolvedValue("en-US");

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});

		it("should map other languages to en", async () => {
			const { commands } = await import("./utils/tauri");

			vi.spyOn(commands, "getSystemLanguage").mockResolvedValue("ja");

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});

		it("should fallback to en on error", async () => {
			const { commands } = await import("./utils/tauri");

			vi.spyOn(commands, "getSystemLanguage").mockRejectedValue(
				new Error("System detection failed"),
			);

			const result = await detectSystemLanguage();
			expect(result).toBe("en");
		});
	});

	describe("getInitialLanguage", () => {
		it("should call detectSystemLanguage and return result", async () => {
			const { detectSystemLanguage } = await import(
				"./utils/language-detector"
			);

			vi.spyOn(
				{ detectSystemLanguage } as never,
				"detectSystemLanguage",
			).mockResolvedValue("zh-CN" as never);

			const result = await getInitialLanguage();
			expect(result).toBe("zh-CN");
		});

		it("should fallback to en on error", async () => {
			const { detectSystemLanguage } = await import(
				"./utils/language-detector"
			);

			vi.spyOn(
				{ detectSystemLanguage } as never,
				"detectSystemLanguage",
			).mockRejectedValue(new Error("Detection failed") as never);

			const result = await getInitialLanguage();
			expect(result).toBe("en");
		});
	});
});
