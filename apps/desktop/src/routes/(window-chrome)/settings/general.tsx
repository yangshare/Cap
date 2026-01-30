import { Button } from "@cap/ui-solid";
import { createWritableMemo } from "@solid-primitives/memo";
import {
	isPermissionGranted,
	requestPermission,
} from "@tauri-apps/plugin-notification";
import { type OsType, type } from "@tauri-apps/plugin-os";
import "@total-typescript/ts-reset/filter-boolean";
import { Collapsible } from "@kobalte/core/collapsible";
import { CheckMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu";
import { confirm } from "@tauri-apps/plugin-dialog";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	onMount,
	type ParentProps,
	Show,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import themePreviewAuto from "~/assets/theme-previews/auto.jpg";
import themePreviewDark from "~/assets/theme-previews/dark.jpg";
import themePreviewLight from "~/assets/theme-previews/light.jpg";
import { Input } from "~/routes/editor/ui";
import { authStore, generalSettingsStore } from "~/store";
import {
	type AppTheme,
	type CaptureWindow,
	commands,
	events,
	type GeneralSettingsStore,
	type MainWindowRecordingStartBehaviour,
	type PostDeletionBehaviour,
	type PostStudioRecordingBehaviour,
	type WindowExclusion,
} from "~/utils/tauri";
import IconLucidePlus from "~icons/lucide/plus";
import IconLucideX from "~icons/lucide/x";
import { SettingItem, ToggleSettingItem } from "./Setting";
import { switchLanguage, getCurrentLanguage, useI18n } from "~/i18n";
import { type Language } from "~/utils/language-detector";

const getExclusionPrimaryLabel = (entry: WindowExclusion) =>
	entry.ownerName ?? entry.windowTitle ?? entry.bundleIdentifier ?? "Unknown";

const getExclusionSecondaryLabel = (entry: WindowExclusion) => {
	if (entry.ownerName && entry.windowTitle) {
		return entry.windowTitle;
	}

	if (entry.bundleIdentifier && (entry.ownerName || entry.windowTitle)) {
		return entry.bundleIdentifier;
	}

	return entry.bundleIdentifier ?? null;
};

const getWindowOptionLabel = (window: CaptureWindow) => {
	const parts = [window.owner_name];
	if (window.name && window.name !== window.owner_name) {
		parts.push(window.name);
	}
	return parts.join(" • ");
};

type ExtendedGeneralSettingsStore = GeneralSettingsStore;

const createDefaultGeneralSettings = (): ExtendedGeneralSettingsStore => ({
	uploadIndividualFiles: false,
	hideDockIcon: false,
	autoCreateShareableLink: false,
	enableNotifications: true,
	enableNativeCameraPreview: false,
	autoZoomOnClicks: false,
	custom_cursor_capture2: true,
	excludedWindows: [],
	instantModeMaxResolution: 1920,
	crashRecoveryRecording: true,
	maxFps: 60,
});

const deriveInitialSettings = (
	store: GeneralSettingsStore | null,
): ExtendedGeneralSettingsStore => {
	const defaults = createDefaultGeneralSettings();
	if (!store) return defaults;

	return {
		...defaults,
		...store,
	};
};

const INSTANT_MODE_RESOLUTION_OPTIONS = [
	{ value: 1280, label: "720p" },
	{ value: 1920, label: "1080p" },
	{ value: 2560, label: "1440p" },
	{ value: 3840, label: "4K" },
] satisfies {
	value: number;
	label: string;
}[];

const MAX_FPS_OPTIONS = [
	{ value: 30, label: "30 FPS" },
	{ value: 60, label: "60 FPS (Recommended)" },
	{ value: 120, label: "120 FPS" },
] satisfies {
	value: number;
	label: string;
}[];

const DEFAULT_PROJECT_NAME_TEMPLATE =
	"{target_name} ({target_kind}) {date} {time}";

export default function GeneralSettings() {
	const [store] = createResource(() => generalSettingsStore.get());

	return (
		<Show when={store.state === "ready" && ([store()] as const)}>
			{(store) => <Inner initialStore={store()[0] ?? null} />}
		</Show>
	);
}

function AppearanceSection(props: {
	currentTheme: AppTheme;
	onThemeChange: (theme: AppTheme) => void;
}) {
	const t = useI18n();
	const options = createMemo(() => [
		{
			id: "system",
			name: t("settings.theme.system"),
		},
		{
			id: "light",
			name: t("settings.theme.light"),
		},
		{
			id: "dark",
			name: t("settings.theme.dark"),
		},
	] satisfies { id: AppTheme; name: string }[]);

	const previews = {
		system: themePreviewAuto,
		light: themePreviewLight,
		dark: themePreviewDark,
	};

	return (
		<div class="flex flex-col gap-4">
			<div class="flex flex-col border-b border-gray-2">
				<h2 class="text-lg font-medium text-gray-12">{t("settings.general")}</h2>
			</div>
			<div
				class="flex justify-start items-center text-gray-12"
				onContextMenu={(e) => e.preventDefault()}
			>
				<div class="flex flex-col gap-3">
					<p class="text-sm text-gray-12">{t("settings.appearance")}</p>
					<div class="flex justify-between m-1 min-w-[20rem] w-[22.2rem] flex-nowrap">
						<For each={options()}>
						{(theme) => (
								<button
									type="button"
									aria-checked={props.currentTheme === theme.id}
									class="flex flex-col items-center rounded-md group focus:outline-none focus-visible:ring-gray-300 focus-visible:ring-offset-gray-50 focus-visible:ring-offset-2 focus-visible:ring-4"
									onClick={() => props.onThemeChange(theme.id)}
								>
									<div
										class={cx(
											`w-24 h-[4.8rem] rounded-md overflow-hidden focus:outline-none ring-offset-gray-50 transition-all duration-200`,
											{
												"ring-2 ring-gray-12 ring-offset-2":
													props.currentTheme === theme.id,
												"group-hover:ring-2 ring-offset-2 group-hover:ring-gray-5":
													props.currentTheme !== theme.id,
											},
										)}
										aria-label={`Select theme: ${theme.name}`}
									>
										<div class="flex justify-center items-center w-full h-full">
											<Show when={previews[theme.id]} keyed>
												{(preview) => (
													<img
														class="animate-in fade-in duration-300"
														draggable={false}
														src={preview}
														alt={`Preview of ${theme.name} theme`}
													/>
												)}
											</Show>
										</div>
									</div>
									<span
										class={cx(`mt-2 text-sm transition-color duration-200`, {
											"text-gray-12": props.currentTheme === theme.id,
											"text-gray-10": props.currentTheme !== theme.id,
										})}
									>
										{theme.name}
									</span>
								</button>
							)}
						</For>
					</div>
				</div>
			</div>
		</div>
	);
}

function LanguageSection() {
	const t = useI18n();
	const [currentLanguage, setCurrentLanguage] = createSignal<Language>("en");

	onMount(() => {
		const lang = getCurrentLanguage();
		setCurrentLanguage(lang);
	});

	const handleLanguageChange = async (lang: Language) => {
		try {
			await switchLanguage(lang);
			setCurrentLanguage(lang);
		} catch (error) {
			console.error("Failed to switch language:", error);
		}
	};

	const languageOptions = createMemo(() => [
		{ value: "en" as Language, label: t("settings.language.options.en") },
		{ value: "zh-CN" as Language, label: t("settings.language.options.zh-CN") },
	]);

	return (
		<div class="flex flex-col gap-4 border-b border-gray-2 pb-4">
			<div class="flex flex-col gap-3">
				<p class="text-sm text-gray-12">{t("settings.language")}</p>
				<div class="px-3 rounded-xl border border-gray-3 bg-gray-2">
					<SettingItem
						label={t("settings.language")}
						description={t("settings.language.description")}
					>
						<div class="flex gap-2">
							<For each={languageOptions()}>
								{(option) => (
									<button
										type="button"
										onClick={() => handleLanguageChange(option.value)}
										class={`px-3 py-1.5 rounded-md text-sm transition-colors ${
											currentLanguage() === option.value
												? "bg-gray-12 text-white"
												: "bg-gray-3 text-gray-11 hover:bg-gray-4"
										}`}
									>
										{option.label}
									</button>
								)}
							</For>
						</div>
					</SettingItem>
				</div>
			</div>
		</div>
	);
}

function Inner(props: { initialStore: GeneralSettingsStore | null }) {
	const t = useI18n();
	const [settings, setSettings] = createStore<ExtendedGeneralSettingsStore>(
		deriveInitialSettings(props.initialStore),
	);

	createEffect(() => {
		setSettings(reconcile(deriveInitialSettings(props.initialStore)));
	});

	const [windows, { refetch: refetchWindows }] = createResource(
		async () => {
			// Fetch windows with a small delay to avoid blocking initial render
			await new Promise((resolve) => setTimeout(resolve, 100));
			return commands.listCaptureWindows();
		},
		{
			initialValue: [] as CaptureWindow[],
		},
	);

	const handleChange = async <K extends keyof typeof settings>(
		key: K,
		value: (typeof settings)[K],
		extra?: Partial<GeneralSettingsStore>,
	) => {
		console.log(`Handling settings change for ${key}: ${value}`);

		setSettings(key as keyof GeneralSettingsStore, value);
		generalSettingsStore.set({ [key]: value, ...(extra ?? {}) });
	};

	const ostype: OsType = type();
	const excludedWindows = createMemo(() => settings.excludedWindows ?? []);

	const matchesExclusion = (
		exclusion: WindowExclusion,
		window: CaptureWindow,
	) => {
		const bundleMatch = exclusion.bundleIdentifier
			? window.bundle_identifier === exclusion.bundleIdentifier
			: false;
		if (bundleMatch) return true;

		const ownerMatch = exclusion.ownerName
			? window.owner_name === exclusion.ownerName
			: false;

		if (exclusion.ownerName && exclusion.windowTitle) {
			return ownerMatch && window.name === exclusion.windowTitle;
		}

		if (ownerMatch && exclusion.ownerName) {
			return true;
		}

		if (exclusion.windowTitle) {
			return window.name === exclusion.windowTitle;
		}

		return false;
	};

	const isManagedWindowsApp = (window: CaptureWindow) => {
		const bundle = window.bundle_identifier?.toLowerCase() ?? "";
		if (bundle.includes("so.cap.desktop")) {
			return true;
		}
		return window.owner_name.toLowerCase().includes("cap");
	};

	const isWindowAvailable = (window: CaptureWindow) => {
		if (excludedWindows().some((entry) => matchesExclusion(entry, window))) {
			return false;
		}
		if (ostype === "windows") {
			return isManagedWindowsApp(window);
		}
		return true;
	};

	const availableWindows = createMemo(() => {
		const data = windows() ?? [];
		return data.filter(isWindowAvailable);
	});

	const refreshAvailableWindows = async (): Promise<CaptureWindow[]> => {
		try {
			const refreshed = (await refetchWindows()) ?? windows() ?? [];
			return refreshed.filter(isWindowAvailable);
		} catch (error) {
			console.error("Failed to refresh available windows", error);
			return availableWindows();
		}
	};

	const applyExcludedWindows = async (windows: WindowExclusion[]) => {
		setSettings("excludedWindows", windows);
		try {
			await generalSettingsStore.set({ excludedWindows: windows });
			await commands.refreshWindowContentProtection();
			if (ostype === "macos") {
				await events.requestScreenCapturePrewarm.emit({ force: true });
			}
		} catch (error) {
			console.error("Failed to update excluded windows", error);
		}
	};

	const handleRemoveExclusion = async (index: number) => {
		const current = [...excludedWindows()];
		current.splice(index, 1);
		await applyExcludedWindows(current);
	};

	const handleAddWindow = async (window: CaptureWindow) => {
		const windowTitle = window.bundle_identifier ? null : window.name;

		const next = [
			...excludedWindows(),
			{
				bundleIdentifier: window.bundle_identifier ?? null,
				ownerName: window.owner_name ?? null,
				windowTitle,
			},
		];
		await applyExcludedWindows(next);
	};

	const handleResetExclusions = async () => {
		const defaults = await commands.getDefaultExcludedWindows();
		await applyExcludedWindows(defaults);
	};

	// Helper function to render select dropdown for recording behaviors
	const SelectSettingItem = <
		T extends
			| MainWindowRecordingStartBehaviour
			| PostStudioRecordingBehaviour
			| PostDeletionBehaviour
			| number,
	>(props: {
		label: string;
		description: string;
		value: T;
		onChange: (value: T) => void;
		options: { text: string; value: any }[];
	}) => {
		const t = useI18n();
		return (
			<SettingItem label={props.label} description={props.description}>
				<button
					type="button"
					class="flex flex-row gap-1 text-xs bg-gray-3 items-center px-2.5 py-1.5 rounded-md border border-gray-4"
					onClick={async () => {
						const currentValue = props.value;
						const items = props.options.map((option) =>
							CheckMenuItem.new({
								text: option.text,
								checked: currentValue === option.value,
								action: () => props.onChange(option.value),
							}),
						);
						const menu = await Menu.new({
							items: await Promise.all(items),
						});
						await menu.popup();
						await menu.close();
					}}
				>
					{(() => {
						const currentValue = props.value;
						const option = props.options.find(
							(opt) => opt.value === currentValue,
						);
						return option ? option.text : currentValue;
					})()}
					<IconCapChevronDown class="size-4" />
				</button>
			</SettingItem>
		);
	};

	return (
		<div class="flex flex-col h-full custom-scroll">
			<div class="p-4 space-y-6">
				<AppearanceSection
					currentTheme={settings.theme ?? "system"}
					onThemeChange={(newTheme) => {
						setSettings("theme", newTheme);
						generalSettingsStore.set({ theme: newTheme });
					}}
				/>

				<LanguageSection />

				{ostype === "macos" && (
					<SettingGroup title={t("settings.app")}>
						<ToggleSettingItem
							label={t("settings.app.dockIcon")}
							description={t("settings.app.dockIcon.description")}
							value={!settings.hideDockIcon}
							onChange={(v) => handleChange("hideDockIcon", !v)}
						/>
						<ToggleSettingItem
							label={t("settings.app.notifications")}
							description={t("settings.app.notifications.description")}
							value={!!settings.enableNotifications}
							onChange={async (value) => {
								if (value) {
									// Check current permission state
									console.log("Checking notification permission status");
									const permissionGranted = await isPermissionGranted();
									console.log(
										`Current permission status: ${permissionGranted}`,
									);

									if (!permissionGranted) {
										// Request permission if not granted
										console.log(
											"Permission not granted, requesting permission",
										);
										const permission = await requestPermission();
										console.log(`Permission request result: ${permission}`);
										if (permission !== "granted") {
											// If permission denied, don't enable the setting
											console.log("Permission denied, aborting setting change");
											return;
										}
									}
								}
								handleChange("enableNotifications", value);
							}}
						/>
					</SettingGroup>
				)}

				<SettingGroup title={t("settings.recording")}>
					<SelectSettingItem
						label={t("settings.recording.instantModeRes")}
						description={t("settings.recording.instantModeRes.description")}
						value={settings.instantModeMaxResolution ?? 1920}
						onChange={(value) =>
							handleChange("instantModeMaxResolution", value)
						}
						options={INSTANT_MODE_RESOLUTION_OPTIONS.map((option) => ({
							text: option.label,
							value: option.value,
						}))}
					/>
					<SelectSettingItem
						label={t("settings.recording.countdown")}
						description={t("settings.recording.countdown.description")}
						value={settings.recordingCountdown ?? 0}
						onChange={(value) => handleChange("recordingCountdown", value)}
						options={[
							{ text: t("settings.recording.countdown.off"), value: 0 },
							{ text: t("settings.recording.countdown.3s"), value: 3 },
							{ text: t("settings.recording.countdown.5s"), value: 5 },
							{ text: t("settings.recording.countdown.10s"), value: 10 },
						]}
					/>
					<SelectSettingItem
						label={t("settings.recording.mainWindowBehaviour")}
						description={t("settings.recording.mainWindowBehaviour.description")}
						value={settings.mainWindowRecordingStartBehaviour ?? "close"}
						onChange={(value) =>
							handleChange("mainWindowRecordingStartBehaviour", value)
						}
						options={[
							{ text: t("settings.recording.mainWindowBehaviour.close"), value: "close" },
							{ text: t("settings.recording.mainWindowBehaviour.minimise"), value: "minimise" },
						]}
					/>
					<SelectSettingItem
						label={t("settings.recording.studioBehaviour")}
						description={t("settings.recording.studioBehaviour.description")}
						value={settings.postStudioRecordingBehaviour ?? "openEditor"}
						onChange={(value) =>
							handleChange("postStudioRecordingBehaviour", value)
						}
						options={[
							{ text: t("settings.recording.studioBehaviour.openEditor"), value: "openEditor" },
							{
								text: t("settings.recording.studioBehaviour.showOverlay"),
								value: "showOverlay",
							},
						]}
					/>
					<SelectSettingItem
						label={t("settings.recording.postDeletionBehaviour")}
						description={t("settings.recording.postDeletionBehaviour.description")}
						value={settings.postDeletionBehaviour ?? "doNothing"}
						onChange={(value) => handleChange("postDeletionBehaviour", value)}
						options={[
							{ text: t("settings.recording.postDeletionBehaviour.doNothing"), value: "doNothing" },
							{
								text: t("settings.recording.postDeletionBehaviour.reopenWindow"),
								value: "reopenRecordingWindow",
							},
						]}
					/>
					<ToggleSettingItem
						label={t("settings.recording.deleteInstant")}
						description={t("settings.recording.deleteInstant.description")}
						value={settings.deleteInstantRecordingsAfterUpload ?? false}
						onChange={(v) =>
							handleChange("deleteInstantRecordingsAfterUpload", v)
						}
					/>
					<ToggleSettingItem
						label={t("settings.recording.crashRecovery")}
						description={t("settings.recording.crashRecovery.description")}
						value={settings.crashRecoveryRecording ?? true}
						onChange={(value) => handleChange("crashRecoveryRecording", value)}
					/>
					<div class="flex flex-col gap-1">
						<SelectSettingItem
							label={t("settings.recording.maxFps")}
							description={t("settings.recording.maxFps.description")}
							value={settings.maxFps ?? 60}
							onChange={(value) => handleChange("maxFps", value)}
							options={[
								{ value: 30, text: t("settings.recording.maxFps.30") },
								{ value: 60, text: t("settings.recording.maxFps.60") },
								{ value: 120, text: t("settings.recording.maxFps.120") },
							]}
						/>
						{(settings.maxFps ?? 60) > 60 && (
							<p class="text-xs text-amber-500 px-1 pb-2">
								{t("settings.recording.maxFps.warning")}
							</p>
						)}
					</div>
				</SettingGroup>

				<SettingGroup
					title={t("settings.pro")}
					titleStyling="bg-blue-500 py-1.5 mb-4 text-white text-xs px-2 rounded-lg"
				>
					<ToggleSettingItem
						label={t("settings.pro.autoOpenLinks")}
						description={t("settings.pro.autoOpenLinks.description")}
						value={!settings.disableAutoOpenLinks}
						onChange={(v) => handleChange("disableAutoOpenLinks", !v)}
					/>
				</SettingGroup>

				<DefaultProjectNameCard
					onChange={(value) =>
						handleChange("defaultProjectNameTemplate", value)
					}
					value={settings.defaultProjectNameTemplate ?? null}
				/>

				<ExcludedWindowsCard
					excludedWindows={excludedWindows()}
					availableWindows={availableWindows()}
					onRequestAvailableWindows={refreshAvailableWindows}
					onRemove={handleRemoveExclusion}
					onAdd={handleAddWindow}
					onReset={handleResetExclusions}
					isLoading={windows.loading}
					isWindows={ostype === "windows"}
				/>

				<ServerURLSetting
					value={settings.serverUrl ?? "https://cap.so"}
					onChange={async (v) => {
						const url = new URL(v);
						const origin = url.origin;

						if (
							!(await confirm(
								t("settings.server.url.confirm", { origin })
							))
						)
							return;

						await authStore.set(undefined);
						await commands.setServerUrl(origin);
						handleChange("serverUrl", origin);
					}}
				/>
			</div>
		</div>
	);
}

function SettingGroup(
	props: ParentProps<{ title: string; titleStyling?: string }>,
) {
	return (
		<div>
			<h3 class={cx("mb-3 text-sm text-gray-12 w-fit", props.titleStyling)}>
				{props.title}
			</h3>
			<div class="px-3 rounded-xl border divide-y divide-gray-3 border-gray-3 bg-gray-2">
				{props.children}
			</div>
		</div>
	);
}

function ServerURLSetting(props: {
	value: string;
	onChange: (v: string) => void;
}) {
	const t = useI18n();
	const [value, setValue] = createWritableMemo(() => props.value);

	return (
		<div class="flex flex-col gap-3">
			<h3 class="text-sm text-gray-12 w-fit">{t("settings.server")}</h3>
			<div class="flex flex-col gap-2 px-4 rounded-xl border border-gray-3 bg-gray-2">
				<SettingItem
					label={t("settings.server.url")}
					description={t("settings.server.url.description")}
				>
					<div class="flex flex-col gap-2 items-end">
						<Input
							class="bg-gray-3"
							value={value()}
							onInput={(e) => setValue(e.currentTarget.value)}
						/>
						<Button
							size="sm"
							class="mt-2"
							variant="dark"
							disabled={props.value === value()}
							onClick={() => props.onChange(value())}
						>
							{t("button.save")}
						</Button>
					</div>
				</SettingItem>
			</div>
		</div>
	);
}

function DefaultProjectNameCard(props: {
	value: string | null;
	onChange: (name: string | null) => Promise<void>;
}) {
	const t = useI18n();
	const MOMENT_EXAMPLE_TEMPLATE = "{moment:DDDD, MMMM D, YYYY h:mm A}";
	const macos = type() === "macos";
	const today = new Date();
	const datetime = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
		macos ? 9 : 12,
		macos ? 41 : 0,
		0,
		0,
	).toISOString();

	let inputRef: HTMLInputElement | undefined;

	const dateString = today.toISOString().split("T")[0];
	const initialTemplate = () => props.value ?? DEFAULT_PROJECT_NAME_TEMPLATE;

	const [inputValue, setInputValue] = createSignal<string>(initialTemplate());
	const [preview, setPreview] = createSignal<string | null>(null);
	const [momentExample, setMomentExample] = createSignal("");

	async function updatePreview(val = inputValue()) {
		const formatted = await commands.formatProjectName(
			val,
			macos ? "Safari" : "Chrome",
			"Window",
			"instant",
			datetime,
		);
		setPreview(formatted);
	}

	onMount(() => {
		commands
			.formatProjectName(
				MOMENT_EXAMPLE_TEMPLATE,
				macos ? "Safari" : "Chrome",
				"Window",
				"instant",
				datetime,
			)
			.then(setMomentExample);

		const seed = initialTemplate();
		setInputValue(seed);
		if (inputRef) inputRef.value = seed;
		updatePreview(seed);
	});

	const isSaveDisabled = () => {
		const input = inputValue();
		return (
			!input ||
			input === (props.value ?? DEFAULT_PROJECT_NAME_TEMPLATE) ||
			input.length <= 3
		);
	};

	function CodeView(props: { children: string }) {
		return (
			<button
				type="button"
				title={t("settings.defaultProjectName.clickToCopy")}
				class="bg-gray-1 hover:bg-gray-5 rounded-md m-0.5 p-0.5 cursor-pointer transition-[color,background-color,transform] ease-out duration-200 active:scale-95"
				onClick={() => commands.writeClipboardString(props.children)}
			>
				<code>{props.children}</code>
			</button>
		);
	}

	return (
		<div class="flex flex-col gap-3 px-4 py-3 mt-6 rounded-xl border border-gray-3 bg-gray-2">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex flex-col gap-1">
					<p class="text-sm text-gray-12">
						{t("settings.defaultProjectName.title")}
					</p>
					<p class="text-xs text-gray-10">
						{t("settings.defaultProjectName.description")}
					</p>
				</div>
				<div class="flex flex-shrink-0 gap-2">
					<Button
						size="sm"
						variant="gray"
						disabled={
							inputValue() === DEFAULT_PROJECT_NAME_TEMPLATE &&
							inputValue() !== props.value
						}
						onClick={async () => {
							await props.onChange(null);
							const newTemplate = initialTemplate();
							setInputValue(newTemplate);
							if (inputRef) inputRef.value = newTemplate;
							await updatePreview(newTemplate);
						}}
					>
						{t("button.reset")}
					</Button>

					<Button
						size="sm"
						variant="dark"
						disabled={isSaveDisabled()}
						onClick={async () => {
							await props.onChange(inputValue() ?? null);
							await updatePreview();
						}}
					>
						{t("button.save")}
					</Button>
				</div>
			</div>

			<div class="flex flex-col gap-2 w-full">
				<Input
					autocorrect="off"
					ref={inputRef}
					type="text"
					class="bg-gray-3 font-mono"
					value={inputValue()}
					onInput={(e) => {
						setInputValue(e.currentTarget.value);
						updatePreview(e.currentTarget.value);
					}}
				/>

				<div class="w-full flex items-center py-2 px-2 rounded-lg bg-gray-transparent-50 border border-dashed border-gray-5">
					<IconCapLogo class="size-4 pointer-events-none mr-2" />
					<p class="whitespace-pre-wrap">{preview()}</p>
				</div>

				<Collapsible class="w-full rounded-lg">
					<Collapsible.Trigger class="group inline-flex items-center w-full text-xs rounded-lg outline-none px-0.5 py-1">
						<IconCapChevronDown class="size-4 ui-group-expanded:rotate-180 transition-transform duration-300 ease-in-out" />
						<p class="py-0.5 px-1">
							{t("settings.defaultProjectName.howToCustomize")}
						</p>
					</Collapsible.Trigger>

					<Collapsible.Content class="opacity-0 transition animate-collapsible-up ui-expanded:animate-collapsible-down ui-expanded:opacity-100 text-xs text-gray-12 space-y-3 px-1 pb-2">
						<p class="border-t pt-3">
							{t("settings.defaultProjectName.placeholdersIntro")}
						</p>

						<div class="space-y-1">
							<p class="font-medium text-foreground">
								{t("settings.defaultProjectName.sections.recordingMode")}
							</p>
							<p>
								<CodeView>{"{recording_mode}"}</CodeView> →{" "}
								{t("settings.defaultProjectName.examples.recordingModeValues")}
							</p>
							<p>
								<CodeView>{"{mode}"}</CodeView> →{" "}
								{t("settings.defaultProjectName.examples.modeValues")}
							</p>
						</div>

						<div class="space-y-1">
							<p class="font-medium text-foreground">
								{t("settings.defaultProjectName.sections.target")}
							</p>
							<p>
								<CodeView>{"{target_kind}"}</CodeView> →{" "}
								{t("settings.defaultProjectName.examples.targetKindValues")}
							</p>
							<p>
								<CodeView>{"{target_name}"}</CodeView> →{" "}
								{t("settings.defaultProjectName.examples.targetNameDescription")}
							</p>
						</div>

						<div class="space-y-1">
							<p class="font-medium text-foreground">
								{t("settings.defaultProjectName.sections.dateTime")}
							</p>
							<p>
								<CodeView>{"{date}"}</CodeView> → {dateString}
							</p>
							<p>
								<CodeView>{"{time}"}</CodeView> →{" "}
								{macos ? "09:41 AM" : "12:00 PM"}
							</p>
						</div>

						<div class="space-y-1">
							<p class="font-medium text-foreground">
								{t("settings.defaultProjectName.sections.customFormats")}
							</p>
							<p>
								{t("settings.defaultProjectName.customFormatsIntro")}{" "}
								<CodeView>{"{moment:HH:mm}"}</CodeView>{" "}
								{t("settings.defaultProjectName.customFormatsOutro")}{" "}
								<code>hh</code> {t("settings.defaultProjectName.customFormats12h")}
							</p>
							<p class="flex flex-col items-start pt-1">
								<CodeView>{MOMENT_EXAMPLE_TEMPLATE}</CodeView> →{" "}
								{momentExample()}
							</p>
						</div>
					</Collapsible.Content>
				</Collapsible>
			</div>
		</div>
	);
}

function ExcludedWindowsCard(props: {
	excludedWindows: WindowExclusion[];
	availableWindows: CaptureWindow[];
	onRequestAvailableWindows: () => Promise<CaptureWindow[]>;
	onRemove: (index: number) => Promise<void>;
	onAdd: (window: CaptureWindow) => Promise<void>;
	onReset: () => Promise<void>;
	isLoading: boolean;
	isWindows: boolean;
}) {
	const t = useI18n();
	const hasExclusions = () => props.excludedWindows.length > 0;
	const canAdd = () => !props.isLoading;

	const handleAddClick = async (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		if (!canAdd()) return;

		// Use available windows if we have them, otherwise fetch
		let windows = props.availableWindows;

		// Only refresh if we don't have any windows cached
		if (!windows.length) {
			try {
				windows = await props.onRequestAvailableWindows();
			} catch (error) {
				console.error("Failed to fetch windows:", error);
				return;
			}
		}

		if (!windows.length) {
			console.log("No available windows to exclude");
			return;
		}

		try {
			const items = await Promise.all(
				windows.map((window) =>
					MenuItem.new({
						text: getWindowOptionLabel(window),
						action: () => {
							void props.onAdd(window);
						},
					}),
				),
			);

			const menu = await Menu.new({ items });

			// Save scroll position before popup
			const scrollPos = window.scrollY;

			await menu.popup();
			await menu.close();

			// Restore scroll position after menu closes
			requestAnimationFrame(() => {
				window.scrollTo(0, scrollPos);
			});
		} catch (error) {
			console.error("Error showing window menu:", error);
		}
	};

	return (
		<div class="flex flex-col gap-3 px-4 py-3 mt-6 rounded-xl border border-gray-3 bg-gray-2">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div class="flex flex-col gap-1">
					<p class="text-sm text-gray-12">
						{t("settings.excludedWindows.title")}
					</p>
					<p class="text-xs text-gray-10">
						{t("settings.excludedWindows.description")}
					</p>
					<Show when={props.isWindows}>
						<p class="text-xs text-gray-9">
							<span class="font-medium text-gray-11">
								{t("settings.excludedWindows.noteLabel")}
							</span>{" "}
							{t("settings.excludedWindows.note")}
						</p>
					</Show>
				</div>
				<div class="flex flex-shrink-0 gap-2">
					<Button
						variant="gray"
						size="sm"
						disabled={props.isLoading}
						onClick={() => {
							if (props.isLoading) return;
							void props.onReset();
						}}
					>
						{t("button.resetToDefault")}
					</Button>
					<Button
						variant="dark"
						size="sm"
						disabled={!canAdd()}
						onClick={(e) => void handleAddClick(e)}
						class="flex items-center gap-2"
					>
						<IconLucidePlus class="size-4" />
						{t("button.add")}
					</Button>
				</div>
			</div>
			<Show when={!props.isLoading} fallback={<ExcludedWindowsSkeleton />}>
				<Show
					when={hasExclusions()}
					fallback={
						<p class="text-xs text-gray-10">
							{t("settings.excludedWindows.empty")}
						</p>
					}
				>
					<div class="flex flex-wrap gap-2">
						<For each={props.excludedWindows}>
							{(entry, index) => (
								<div class="group flex items-center gap-2 rounded-full border border-gray-4 bg-gray-3 px-3 py-1.5">
									<div class="flex flex-col leading-tight">
										<span class="text-sm text-gray-12">
											{getExclusionPrimaryLabel(entry)}
										</span>
										<Show when={getExclusionSecondaryLabel(entry)}>
											{(label) => (
												<span class="text-[0.65rem] text-gray-9">
													{label()}
												</span>
											)}
										</Show>
									</div>
									<button
										type="button"
										class="flex items-center justify-center rounded-full bg-gray-4/70 text-gray-11 transition-colors hover:bg-gray-5 hover:text-gray-12 size-6"
										onClick={() => void props.onRemove(index())}
										aria-label={t("settings.excludedWindows.removeAria")}
									>
										<IconLucideX class="size-3" />
									</button>
								</div>
							)}
						</For>
					</div>
				</Show>
			</Show>
		</div>
	);
}

function ExcludedWindowsSkeleton() {
	const chipWidths = ["w-32", "w-28", "w-36"] as const;

	return (
		<div class="flex flex-wrap gap-2" aria-hidden="true">
			<For each={chipWidths}>
				{(width) => (
					<div class="flex items-center gap-2 rounded-full border border-gray-4 bg-gray-3 px-3 py-1.5 animate-pulse">
						<div class="flex flex-col gap-1 leading-tight">
							<div class={cx("h-3 rounded bg-gray-4", width)} />
							<div class="h-2 w-16 rounded bg-gray-4" />
						</div>
						<div class="size-6 rounded-full bg-gray-4" />
					</div>
				)}
			</For>
		</div>
	);
}
