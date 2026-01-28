import { render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";
import { type I18nProvider, i18n, useI18n } from "./i18n";

describe("i18n", () => {
	describe("initialization", () => {
		it("should initialize with default language en", () => {
			const [lang] = i18n.current();
			expect(lang).toBe("en");
		});

		it("should have translation dictionaries for all languages", () => {
			expect(i18n.dict.en).toBeDefined();
			expect(i18n.dict["zh-CN"]).toBeDefined();
		});

		it("should have all required translation modules", () => {
			const en = i18n.dict.en;

			expect(en["app.name"]).toBe("Cap");
			expect(en["button.save"]).toBe("Save");
			expect(en["recording.button.start"]).toBe("Start Recording");
			expect(en["settings.title"]).toBe("Settings");
			expect(en["editor.title"]).toBe("Video Editor");
		});
	});

	describe("useI18n hook", () => {
		it("should return translation function", () => {
			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					expect(typeof t).toBe("function");
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
		});

		it("should translate simple keys correctly", () => {
			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					expect(t("button.save")).toBe("Save");
					expect(t("button.cancel")).toBe("Cancel");
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
		});

		it("should translate nested keys correctly", () => {
			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					expect(t("recording.button.start")).toBe("Start Recording");
					expect(t("settings.language.description")).toBe(
						"Choose your preferred language"
					);
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
		});
	});

	describe("fallback mechanism", () => {
		it("should fallback to English when key is missing in current language", () => {
			i18n.setCurrent("zh-CN");

			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					const result = t("nonexistent.key");
					expect(result).toBe("nonexistent.key");
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
			i18n.setCurrent("en");
		});

		it("should return key when translation is missing in all languages", () => {
			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					const result = t("completely.missing.key");
					expect(result).toBe("completely.missing.key");
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
		});

		it("should log warning when falling back to English in dev mode", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			i18n.setCurrent("zh-CN");

			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					t("missing.key");
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
			i18n.setCurrent("en");

			if (import.meta.env.DEV) {
				expect(consoleSpy).toHaveBeenCalled();
			}

			consoleSpy.mockRestore();
		});
	});

	describe("parameter interpolation", () => {
		it("should support parameter interpolation", () => {
			const wrapper = () => {
				const TestComponent = () => {
					const t = useI18n();
					const result = t("notification.title", { name: "Test" });
					expect(result).toBeDefined();
					return null;
				};

				return (
					<I18nProvider>
						<TestComponent />
					</I18nProvider>
				);
			};

			render(wrapper);
		});
	});
});
