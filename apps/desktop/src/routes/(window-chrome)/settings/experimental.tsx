import { type } from "@tauri-apps/plugin-os";
import { createResource, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { useI18n } from "~/i18n";
import { generalSettingsStore } from "~/store";
import type { GeneralSettingsStore } from "~/utils/tauri";
import { ToggleSettingItem } from "./Setting";

export default function ExperimentalSettings() {
	const [store] = createResource(() => generalSettingsStore.get());

	return (
		<Show when={store.state === "ready" && ([store()] as const)}>
			{(store) => <Inner initialStore={store()[0] ?? null} />}
		</Show>
	);
}

function Inner(props: { initialStore: GeneralSettingsStore | null }) {
	const t = useI18n();
	const [settings, setSettings] = createStore<GeneralSettingsStore>(
		props.initialStore ?? {
			uploadIndividualFiles: false,
			hideDockIcon: false,
			autoCreateShareableLink: false,
			enableNotifications: true,
			enableNativeCameraPreview: false,
			autoZoomOnClicks: false,
			custom_cursor_capture2: true,
		},
	);

	const handleChange = async <K extends keyof typeof settings>(
		key: K,
		value: (typeof settings)[K],
	) => {
		console.log(`Handling settings change for ${key}: ${value}`);

		setSettings(key as keyof GeneralSettingsStore, value);
		generalSettingsStore.set({ [key]: value });
	};

	return (
		<div class="flex flex-col h-full custom-scroll">
			<div class="p-4 space-y-4">
				<div class="flex flex-col pb-4 border-b border-gray-2">
					<h2 class="text-lg font-medium text-gray-12">
						{t("settings.experimental.title")}
					</h2>
					<p class="text-sm text-gray-10">
						{t("settings.experimental.description")}
					</p>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm text-gray-12 w-fit">
						{t("settings.experimental.recordingFeatures")}
					</h3>
					<div class="px-3 rounded-xl border divide-y divide-gray-3 border-gray-3 bg-gray-2">
						<ToggleSettingItem
							label={t("settings.experimental.customCursorCapture.label")}
							description={t("settings.experimental.customCursorCapture.description")}
							value={!!settings.custom_cursor_capture2}
							onChange={(value) =>
								handleChange("custom_cursor_capture2", value)
							}
						/>
						{type() !== "windows" && (
							<ToggleSettingItem
								label={t("settings.experimental.nativeCameraPreview.label")}
								description={t("settings.experimental.nativeCameraPreview.description")}
								value={!!settings.enableNativeCameraPreview}
								onChange={(value) =>
									handleChange("enableNativeCameraPreview", value)
								}
							/>
						)}
						<ToggleSettingItem
							label={t("settings.experimental.autoZoomOnClicks.label")}
							description={t("settings.experimental.autoZoomOnClicks.description")}
							value={!!settings.autoZoomOnClicks}
							onChange={(value) => {
								handleChange("autoZoomOnClicks", value);
								setTimeout(
									() => window.scrollTo({ top: 0, behavior: "instant" }),
									5,
								);
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
