import { useI18n } from "../i18n";

export function I18nTest() {
	const t = useI18n();

	return (
		<div>
			<h1>{t("app.name")}</h1>
			<p>{t("button.save")}</p>
			<p>{t("recording.button.start")}</p>
			<p>{t("settings.title")}</p>
			<p>{t("editor.title")}</p>
		</div>
	);
}
