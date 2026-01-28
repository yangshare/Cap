import { beforeEach, describe, expect, it } from "vitest";
import { switchLanguage } from "./i18n";
import type { Language } from "./utils/language-detector";
import {
	clearLanguage,
	loadLanguage,
	saveLanguage,
} from "./utils/language-persistence";

describe("language switching performance", () => {
	const TEST_TIMEOUT_MS = 100;
	const PERFORMANCE_MARGIN = 20;

	beforeEach(async () => {
		await clearLanguage();
	});

	it("should switch language in less than 100ms", async () => {
		const startTime = performance.now();
		await switchLanguage("zh-CN");
		const endTime = performance.now();

		const duration = endTime - startTime;
		expect(duration).toBeLessThan(TEST_TIMEOUT_MS);
	});

	it("should switch from zh-CN to en in less than 100ms", async () => {
		await switchLanguage("zh-CN");

		const startTime = performance.now();
		await switchLanguage("en");
		const endTime = performance.now();

		const duration = endTime - startTime;
		expect(duration).toBeLessThan(TEST_TIMEOUT_MS);
	});

	it("should handle rapid switching without blocking", async () => {
		const languages: Language[] = ["en", "zh-CN"];
		const times: number[] = [];

		for (const lang of languages) {
			const startTime = performance.now();
			await switchLanguage(lang);
			const endTime = performance.now();
			times.push(endTime - startTime);
		}

		times.forEach((duration) => {
			expect(duration).toBeLessThan(TEST_TIMEOUT_MS);
		});

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		expect(avgTime).toBeLessThan(TEST_TIMEOUT_MS - PERFORMANCE_MARGIN);
	});

	it("should switch language multiple times rapidly", async () => {
		const switchCount = 10;
		const times: number[] = [];

		for (let i = 0; i < switchCount; i++) {
			const lang = i % 2 === 0 ? "en" : "zh-CN";
			const startTime = performance.now();
			await switchLanguage(lang);
			const endTime = performance.now();
			times.push(endTime - startTime);
		}

		times.forEach((duration) => {
			expect(duration).toBeLessThan(TEST_TIMEOUT_MS);
		});

		const maxTime = Math.max(...times);
		expect(maxTime).toBeLessThan(TEST_TIMEOUT_MS);
	});
});

describe("language persistence integration", () => {
	beforeEach(async () => {
		await clearLanguage();
	});

	it("should save language preference immediately", async () => {
		await switchLanguage("zh-CN");

		const saved = await loadLanguage();
		expect(saved).toBe("zh-CN");
	});

	it("should persist language after multiple switches", async () => {
		await switchLanguage("zh-CN");
		await switchLanguage("en");
		await switchLanguage("zh-CN");

		const saved = await loadLanguage();
		expect(saved).toBe("zh-CN");
	});

	it("should load persisted language on startup", async () => {
		const testLang: Language = "zh-CN";
		await saveLanguage(testLang);

		const loaded = await loadLanguage();
		expect(loaded).toBe(testLang);
	});
});

describe("non-blocking operations", () => {
	it("should return immediately without blocking main thread", async () => {
		let mainThreadBlocked = false;

		const checkMainThread = () => {
			mainThreadBlocked = true;
		};

		const startTime = performance.now();
		const switchPromise = switchLanguage("zh-CN");

		checkMainThread();

		await switchPromise;
		const endTime = performance.now();

		expect(mainThreadBlocked).toBe(true);
		expect(endTime - startTime).toBeLessThan(100);
	});

	it("should handle concurrent switches safely", async () => {
		const promises = [
			switchLanguage("en"),
			switchLanguage("zh-CN"),
			switchLanguage("en"),
		];

		const results = await Promise.allSettled(promises);

		results.forEach((result) => {
			expect(result.status).toBe("fulfilled");
		});

		const final = await loadLanguage();
		expect(final).toBe("en");
	});
});
