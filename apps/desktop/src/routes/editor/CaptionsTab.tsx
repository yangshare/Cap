import { Button } from "@cap/ui-solid";
import { Select as KSelect } from "@kobalte/core/select";
import { createWritableMemo } from "@solid-primitives/memo";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onMount,
	Show,
} from "solid-js";
import toast from "solid-toast";
import { Toggle } from "~/components/Toggle";
import { useI18n } from "~/i18n";
import { defaultCaptionSettings } from "~/store/captions";
import type { CaptionSettings } from "~/utils/tauri";
import { commands, events } from "~/utils/tauri";
import IconCapChevronDown from "~icons/cap/chevron-down";
import IconCapCircleCheck from "~icons/cap/circle-check";
import IconLucideCheck from "~icons/lucide/check";
import IconLucideDownload from "~icons/lucide/download";
import { useEditorContext } from "./context";
import { TextInput } from "./TextInput";
import {
	Field,
	Input,
	MenuItem,
	MenuItemList,
	PopperContent,
	Slider,
	Subfield,
	topLeftAnimateClasses,
	topSlideAnimateClasses,
} from "./ui";

interface ModelOption {
	name: string;
	labelKey: string;
	size: string;
	descriptionKey: string;
}

interface LanguageOption {
	code: string;
	labelKey: string;
}

const MODEL_OPTIONS: ModelOption[] = [
	{
		name: "small",
		labelKey: "editor.captions.model.small",
		size: "466MB",
		descriptionKey: "editor.captions.model.small.description",
	},
	{
		name: "medium",
		labelKey: "editor.captions.model.medium",
		size: "1.5GB",
		descriptionKey: "editor.captions.model.medium.description",
	},
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
	{ code: "auto", labelKey: "editor.captions.language.autoDetect" },
	{ code: "en", labelKey: "editor.captions.language.en" },
	{ code: "es", labelKey: "editor.captions.language.es" },
	{ code: "fr", labelKey: "editor.captions.language.fr" },
	{ code: "de", labelKey: "editor.captions.language.de" },
	{ code: "it", labelKey: "editor.captions.language.it" },
	{ code: "pt", labelKey: "editor.captions.language.pt" },
	{ code: "nl", labelKey: "editor.captions.language.nl" },
	{ code: "pl", labelKey: "editor.captions.language.pl" },
	{ code: "ru", labelKey: "editor.captions.language.ru" },
	{ code: "tr", labelKey: "editor.captions.language.tr" },
	{ code: "ja", labelKey: "editor.captions.language.ja" },
	{ code: "ko", labelKey: "editor.captions.language.ko" },
	{ code: "zh", labelKey: "editor.captions.language.zh" },
];

interface PositionOption {
	value: string;
	labelKey: string;
}

const POSITION_OPTIONS: PositionOption[] = [
	{ value: "top-left", labelKey: "editor.captions.position.topLeft" },
	{ value: "top-center", labelKey: "editor.captions.position.topCenter" },
	{ value: "top-right", labelKey: "editor.captions.position.topRight" },
	{ value: "bottom-left", labelKey: "editor.captions.position.bottomLeft" },
	{ value: "bottom-center", labelKey: "editor.captions.position.bottomCenter" },
	{ value: "bottom-right", labelKey: "editor.captions.position.bottomRight" },
];

const DEFAULT_MODEL = "small";
const MODEL_FOLDER = "transcription_models";

const fontOptions = [
	{ value: "System Sans-Serif", label: "System Sans-Serif" },
	{ value: "System Serif", label: "System Serif" },
	{ value: "System Monospace", label: "System Monospace" },
];

function RgbInput(props: { value: string; onChange: (value: string) => void }) {
	const [text, setText] = createWritableMemo(() => props.value);
	let prevColor = props.value;
	let colorInput!: HTMLInputElement;

	return (
		<div class="flex flex-row items-center gap-[0.75rem] relative">
			<button
				type="button"
				class="size-[3rem] rounded-[0.5rem]"
				style={{
					"background-color": text(),
				}}
				onClick={() => colorInput.click()}
			/>
			<input
				ref={colorInput}
				type="color"
				class="absolute left-0 bottom-0 w-[3rem] opacity-0"
				value={text()}
				onChange={(e) => {
					setText(e.target.value);
					props.onChange(e.target.value);
				}}
			/>
			<TextInput
				class="w-[5rem] p-[0.375rem] border border-gray-3 text-gray-12 rounded-[0.5rem] bg-gray-2"
				value={text()}
				onFocus={() => {
					prevColor = props.value;
				}}
				onInput={(e) => {
					setText(e.currentTarget.value);
					props.onChange(e.currentTarget.value);
				}}
				onBlur={(e) => {
					if (!/^#[0-9A-F]{6}$/i.test(e.target.value)) {
						setText(prevColor);
						props.onChange(prevColor);
					}
				}}
			/>
		</div>
	);
}

export function CaptionsTab() {
	const t = useI18n();
	const { project, setProject, editorInstance, editorState, setEditorState } =
		useEditorContext();

	const getSetting = <K extends keyof CaptionSettings>(
		key: K,
	): NonNullable<CaptionSettings[K]> =>
		(project?.captions?.settings?.[key] ??
			defaultCaptionSettings[key]) as NonNullable<CaptionSettings[K]>;

	const updateCaptionSetting = <K extends keyof CaptionSettings>(
		key: K,
		value: CaptionSettings[K],
	) => {
		if (!project?.captions) return;

		setProject("captions", "settings", key, value);
	};

	const [selectedModel, setSelectedModel] = createSignal(DEFAULT_MODEL);
	const [selectedLanguage, setSelectedLanguage] = createSignal("auto");
	const [downloadedModels, setDownloadedModels] = createSignal<string[]>([]);

	const isDownloading = () => editorState.captions.isDownloading;
	const setIsDownloading = (value: boolean) =>
		setEditorState("captions", "isDownloading", value);
	const downloadProgress = () => editorState.captions.downloadProgress;
	const setDownloadProgress = (value: number) =>
		setEditorState("captions", "downloadProgress", value);
	const downloadingModel = () => editorState.captions.downloadingModel;
	const setDownloadingModel = (value: string | null) =>
		setEditorState("captions", "downloadingModel", value);
	const isGenerating = () => editorState.captions.isGenerating;
	const setIsGenerating = (value: boolean) =>
		setEditorState("captions", "isGenerating", value);
	const [hasAudio, setHasAudio] = createSignal(false);

	createEffect(
		on(
			() => project && editorInstance && !project.captions,
			(shouldInit) => {
				if (shouldInit) {
					setProject("captions", {
						segments: [],
						settings: { ...defaultCaptionSettings },
					});
				}
			},
		),
	);

	onMount(async () => {
		try {
			const appDataDirPath = await appLocalDataDir();
			const modelsPath = await join(appDataDirPath, MODEL_FOLDER);

			if (!(await exists(modelsPath))) {
				await commands.createDir(modelsPath, true);
			}

			const models = await Promise.all(
				MODEL_OPTIONS.map(async (model) => {
					const downloaded = await checkModelExists(model.name);
					return { name: model.name, downloaded };
				}),
			);

			const downloadedModelNames = models
				.filter((m) => m.downloaded)
				.map((m) => m.name);
			setDownloadedModels(downloadedModelNames);

			const savedModel = localStorage.getItem("selectedTranscriptionModel");
			if (savedModel && MODEL_OPTIONS.some((m) => m.name === savedModel)) {
				setSelectedModel(savedModel);
			}

			const savedLanguage = localStorage.getItem(
				"selectedTranscriptionLanguage",
			);
			if (
				savedLanguage &&
				LANGUAGE_OPTIONS.some((l) => l.code === savedLanguage)
			) {
				setSelectedLanguage(savedLanguage);
			}

			if (editorInstance?.recordings) {
				const hasAudioTrack = editorInstance.recordings.segments.some(
					(segment) => segment.mic !== null || segment.system_audio !== null,
				);
				setHasAudio(hasAudioTrack);
			}

			const downloadState = localStorage.getItem("modelDownloadState");
			if (downloadState) {
				const { model, progress } = JSON.parse(downloadState);
				if (model && progress < 100) {
					setDownloadingModel(model);
					setDownloadProgress(progress);
					setIsDownloading(true);
				} else {
					localStorage.removeItem("modelDownloadState");
				}
			}
		} catch (error) {
			console.error("Error checking models:", error);
		}
	});

	createEffect(
		on(
			() => [isDownloading(), downloadingModel(), downloadProgress()] as const,
			([downloading, model, progress]) => {
				if (downloading && model) {
					localStorage.setItem(
						"modelDownloadState",
						JSON.stringify({ model, progress }),
					);
				} else {
					localStorage.removeItem("modelDownloadState");
				}
			},
		),
	);

	createEffect(
		on(
			selectedModel,
			(model) => {
				if (model) localStorage.setItem("selectedTranscriptionModel", model);
			},
			{ defer: true },
		),
	);

	createEffect(
		on(
			selectedLanguage,
			(language) => {
				if (language)
					localStorage.setItem("selectedTranscriptionLanguage", language);
			},
			{ defer: true },
		),
	);

	const checkModelExists = async (modelName: string) => {
		const appDataDirPath = await appLocalDataDir();
		const modelsPath = await join(appDataDirPath, MODEL_FOLDER);
		const path = await join(modelsPath, `${modelName}.bin`);
		return await commands.checkModelExists(path);
	};

	const downloadModel = async () => {
		try {
			const modelToDownload = selectedModel();
			setIsDownloading(true);
			setDownloadProgress(0);
			setDownloadingModel(modelToDownload);

			const appDataDirPath = await appLocalDataDir();
			const modelsPath = await join(appDataDirPath, MODEL_FOLDER);
			const modelPath = await join(modelsPath, `${modelToDownload}.bin`);

			try {
				await commands.createDir(modelsPath, true);
			} catch (err) {
				console.error("Error creating directory:", err);
			}

			const unlisten = await events.downloadProgress.listen((event) => {
				setDownloadProgress(event.payload.progress);
			});

			await commands.downloadWhisperModel(modelToDownload, modelPath);
			unlisten();

			setDownloadedModels((prev) => [...prev, modelToDownload]);
			toast.success(t("editor.captions.model.downloadedToast"));
		} catch (error) {
			console.error("Error downloading model:", error);
			toast.error(t("editor.captions.model.downloadFailedToast"));
		} finally {
			setIsDownloading(false);
			setDownloadingModel(null);
		}
	};

	const generateCaptions = async () => {
		if (!editorInstance) {
			toast.error(t("editor.captions.error.editorNotFound"));
			return;
		}

		setIsGenerating(true);

		try {
			const videoPath = editorInstance.path;
			const lang = selectedLanguage();
			const currentModelPath = await join(
				await appLocalDataDir(),
				MODEL_FOLDER,
				`${selectedModel()}.bin`,
			);

			const result = await commands.transcribeAudio(
				videoPath,
				currentModelPath,
				lang,
			);

			if (result && result.segments.length > 0) {
				setProject("captions", "segments", result.segments);
				updateCaptionSetting("enabled", true);
				toast.success(t("editor.captions.generate.successToast"));
			} else {
				toast.error(
					t("editor.captions.generate.noCaptionsToast"),
				);
			}
		} catch (error) {
			console.error("Error generating captions:", error);
			let errorMessage = t("editor.captions.error.unknown");

			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (typeof error === "string") {
				errorMessage = error;
			}

			if (errorMessage.includes("No audio stream found")) {
				errorMessage = t("editor.captions.error.noAudio");
			} else if (errorMessage.includes("Model file not found")) {
				errorMessage = t("editor.captions.error.modelNotFound");
			} else if (errorMessage.includes("Failed to load Whisper model")) {
				errorMessage = t("editor.captions.error.modelLoadFailed");
			}

			toast.error(
				t("editor.captions.error.generateFailed", { reason: errorMessage }),
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const deleteSegment = (id: string) => {
		if (!project?.captions?.segments) return;

		setProject(
			"captions",
			"segments",
			project.captions.segments.filter((segment) => segment.id !== id),
		);
	};

	const updateSegment = (
		id: string,
		updates: Partial<{ start: number; end: number; text: string }>,
	) => {
		if (!project?.captions?.segments) return;

		setProject(
			"captions",
			"segments",
			project.captions.segments.map((segment) =>
				segment.id === id ? { ...segment, ...updates } : segment,
			),
		);
	};

	const addSegment = (time: number) => {
		if (!project?.captions) return;

		const id = `segment-${Date.now()}`;
		setProject("captions", "segments", [
			...project.captions.segments,
			{
				id,
				start: time,
				end: time + 2,
				text: t("editor.captions.segment.new"),
			},
		]);
	};

	const hasCaptions = createMemo(
		() => (project.captions?.segments?.length ?? 0) > 0,
	);

	return (
		<Field name={t("editor.captions.title")} icon={<IconCapMessageBubble />}>
			<div class="flex flex-col gap-4">
				<div class="space-y-6 transition-all duration-200">
					<div class="space-y-4">
						<div class="space-y-2">
							<label class="text-xs text-gray-11">
								{t("editor.captions.transcriptionModel")}
							</label>
							<div class="grid grid-cols-2 gap-3">
								<For each={MODEL_OPTIONS}>
									{(model) => {
										const isDownloaded = () =>
											downloadedModels().includes(model.name);
										const isSelected = () => selectedModel() === model.name;

										return (
											<button
												class={cx(
													"flex flex-col text-left p-3 rounded-lg border transition-all relative",
													isSelected()
														? "border-blue-8 bg-blue-3/40"
														: "border-gray-3 hover:border-gray-5 bg-gray-2",
												)}
												onClick={() => {
													setSelectedModel(model.name);
												}}
											>
												<div class="flex items-center justify-between w-full mb-1">
													<span class="font-medium text-sm text-gray-12">
														{t(model.labelKey)}
													</span>
													<Show when={isDownloaded()}>
														<div
															class="text-green-9"
															title={t("editor.captions.model.downloaded")}
														>
															<IconLucideCheck class="size-4" />
														</div>
													</Show>
												</div>
												<span class="text-xs text-gray-11 mb-2">
													{t(model.descriptionKey)}
												</span>
												<div class="flex items-center justify-between mt-auto">
													<span class="text-[10px] px-1.5 py-0.5 bg-gray-3 rounded text-gray-11">
														{model.size}
													</span>
												</div>
											</button>
										);
									}}
								</For>
							</div>
						</div>

						<Subfield name={t("editor.captions.language")}>
							<KSelect<string>
								options={LANGUAGE_OPTIONS.map((l) => l.code)}
								value={selectedLanguage()}
								onChange={(value: string | null) => {
									if (value) setSelectedLanguage(value);
								}}
								itemComponent={(props) => (
									<MenuItem<typeof KSelect.Item>
										as={KSelect.Item}
										item={props.item}
									>
										<KSelect.ItemLabel class="flex-1">
											{(() => {
												const option = LANGUAGE_OPTIONS.find(
													(l) => l.code === props.item.rawValue,
												);
												return option ? t(option.labelKey) : props.item.rawValue;
											})()}
										</KSelect.ItemLabel>
									</MenuItem>
								)}
							>
								<KSelect.Trigger class="flex flex-row items-center h-9 px-3 gap-2 border rounded-lg border-gray-3 bg-gray-2 w-full text-gray-12 text-sm hover:border-gray-4 hover:bg-gray-3 focus:border-blue-9 focus:ring-1 focus:ring-blue-9 transition-colors">
									<KSelect.Value<string> class="flex-1 text-left truncate">
										{(state) => {
											const language = LANGUAGE_OPTIONS.find(
												(l) => l.code === state.selectedOption(),
											);
											return (
												<span>
													{language?.labelKey
														? t(language.labelKey)
														: t("editor.captions.language.select")}
												</span>
											);
										}}
									</KSelect.Value>
									<KSelect.Icon>
										<IconCapChevronDown class="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180" />
									</KSelect.Icon>
								</KSelect.Trigger>
								<KSelect.Portal>
									<PopperContent<typeof KSelect.Content>
										as={KSelect.Content}
										class={topLeftAnimateClasses}
									>
										<MenuItemList<typeof KSelect.Listbox>
											class="max-h-48 overflow-y-auto"
											as={KSelect.Listbox}
										/>
									</PopperContent>
								</KSelect.Portal>
							</KSelect>
						</Subfield>

						<div class="pt-2">
							<Show
								when={downloadedModels().includes(selectedModel())}
								fallback={
									<div class="space-y-2">
										<Button
											class="w-full flex items-center justify-center gap-2"
											onClick={downloadModel}
											disabled={isDownloading()}
										>
											<Show
												when={isDownloading()}
												fallback={
													<>
														<IconLucideDownload class="size-4" />
														{t("editor.captions.model.downloadButton", {
															model:
																MODEL_OPTIONS.find(
																	(m) => m.name === selectedModel(),
																)?.labelKey
																	? t(
																			MODEL_OPTIONS.find(
																				(m) => m.name === selectedModel(),
																			)!.labelKey,
																		)
																	: selectedModel(),
														})}
													</>
												}
											>
												{t("editor.captions.model.downloadingPercent", {
													percent: Math.round(downloadProgress()),
												})}
											</Show>
										</Button>
										<Show when={isDownloading()}>
											<div class="w-full bg-gray-3 rounded-full h-1.5 overflow-hidden">
												<div
													class="bg-blue-9 h-1.5 rounded-full transition-all duration-300"
													style={{ width: `${downloadProgress()}%` }}
												/>
											</div>
										</Show>
									</div>
								}
							>
								<Show when={hasAudio()}>
									<Button
										onClick={generateCaptions}
										disabled={isGenerating()}
										class="w-full"
									>
										{isGenerating()
											? t("editor.captions.generate.generating")
											: hasCaptions()
												? t("editor.captions.generate.regenerate")
												: t("editor.captions.generate.generate")}
									</Button>
								</Show>
							</Show>
						</div>
					</div>

					<div
						class={cx(
							"space-y-4",
							!hasCaptions() && "opacity-50 pointer-events-none",
						)}
					>
						<Field
							name={t("editor.captions.fontSettings.title")}
							icon={<IconCapMessageBubble />}
						>
							<div class="space-y-3">
								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.fontSettings.fontFamily")}
									</span>
									<KSelect<string>
										options={fontOptions.map((f) => f.value)}
										value={getSetting("font")}
										onChange={(value) => {
											if (value === null) return;
											updateCaptionSetting("font", value);
										}}
										disabled={!hasCaptions()}
										itemComponent={(props) => (
											<MenuItem<typeof KSelect.Item>
												as={KSelect.Item}
												item={props.item}
											>
												<KSelect.ItemLabel class="flex-1">
													{
														fontOptions.find(
															(f) => f.value === props.item.rawValue,
														)?.label
													}
												</KSelect.ItemLabel>
											</MenuItem>
										)}
									>
										<KSelect.Trigger class="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-gray-2 border border-gray-3 text-gray-12 hover:border-gray-4 hover:bg-gray-3 focus:border-blue-9 focus:ring-1 focus:ring-blue-9 transition-colors">
											<KSelect.Value<string>>
												{(state) =>
													fontOptions.find(
														(f) => f.value === state.selectedOption(),
													)?.label
												}
											</KSelect.Value>
											<KSelect.Icon>
												<IconCapChevronDown />
											</KSelect.Icon>
										</KSelect.Trigger>
										<KSelect.Portal>
											<PopperContent<typeof KSelect.Content>
												as={KSelect.Content}
												class={topLeftAnimateClasses}
											>
												<MenuItemList<typeof KSelect.Listbox>
													class="max-h-48 overflow-y-auto"
													as={KSelect.Listbox}
												/>
											</PopperContent>
										</KSelect.Portal>
									</KSelect>
								</div>

								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.fontSettings.size")}
									</span>
									<Slider
										value={[getSetting("size")]}
										onChange={(v) => updateCaptionSetting("size", v[0])}
										minValue={12}
										maxValue={100}
										step={1}
										disabled={!hasCaptions()}
									/>
								</div>

								<div class="flex flex-col gap-2">
									<div class="flex items-center justify-between">
										<span class="text-gray-11 text-sm">
											{t("editor.captions.fontSettings.activeWordHighlight")}
										</span>
										<Toggle
											checked={getSetting("activeWordHighlight")}
											onChange={(checked) =>
												updateCaptionSetting("activeWordHighlight", checked)
											}
											disabled={!hasCaptions()}
										/>
									</div>
									<p class="text-xs text-gray-10">
										{t("editor.captions.fontSettings.activeWordHighlight.note")}
									</p>
								</div>

								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.fontSettings.fontColor")}
									</span>
									<RgbInput
										value={getSetting("color")}
										onChange={(value) => updateCaptionSetting("color", value)}
									/>
								</div>
							</div>
						</Field>

						<Field
							name={t("editor.captions.backgroundSettings.title")}
							icon={<IconCapMessageBubble />}
						>
							<div class="space-y-3">
								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.backgroundSettings.backgroundColor")}
									</span>
									<RgbInput
										value={getSetting("backgroundColor")}
										onChange={(value) =>
											updateCaptionSetting("backgroundColor", value)
										}
									/>
								</div>

								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.backgroundSettings.backgroundOpacity")}
									</span>
									<Slider
										value={[getSetting("backgroundOpacity")]}
										onChange={(v) =>
											updateCaptionSetting("backgroundOpacity", v[0])
										}
										minValue={0}
										maxValue={100}
										step={1}
										disabled={!hasCaptions()}
									/>
								</div>
							</div>
						</Field>

						<Field name={t("editor.captions.position.title")} icon={<IconCapMessageBubble />}>
							<KSelect<string>
								options={POSITION_OPTIONS.map((p) => p.value)}
								value={getSetting("position")}
								onChange={(value) => {
									if (value === null) return;
									updateCaptionSetting("position", value);
								}}
								disabled={!hasCaptions()}
								itemComponent={(props) => (
									<MenuItem<typeof KSelect.Item>
										as={KSelect.Item}
										item={props.item}
									>
										<KSelect.ItemLabel class="flex-1">
											{(() => {
												const option = POSITION_OPTIONS.find(
													(p) => p.value === props.item.rawValue,
												);
												return option ? t(option.labelKey) : props.item.rawValue;
											})()}
										</KSelect.ItemLabel>
									</MenuItem>
								)}
							>
								<KSelect.Trigger class="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-gray-2 border border-gray-3 text-gray-12 hover:border-gray-4 hover:bg-gray-3 focus:border-blue-9 focus:ring-1 focus:ring-blue-9 transition-colors">
									<KSelect.Value<string>>
										{(state) => (
											<span>
												{(() => {
													const option = POSITION_OPTIONS.find(
														(p) => p.value === state.selectedOption(),
													);
													return option ? t(option.labelKey) : "";
												})()}
											</span>
										)}
									</KSelect.Value>
									<KSelect.Icon>
										<IconCapChevronDown />
									</KSelect.Icon>
								</KSelect.Trigger>
								<KSelect.Portal>
									<PopperContent<typeof KSelect.Content>
										as={KSelect.Content}
										class={topLeftAnimateClasses}
									>
										<MenuItemList<typeof KSelect.Listbox>
											as={KSelect.Listbox}
										/>
									</PopperContent>
								</KSelect.Portal>
							</KSelect>
						</Field>

						<Field name={t("editor.captions.animation.title")} icon={<IconCapMessageBubble />}>
							<div class="space-y-3">
								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.animation.highlightColor")}
									</span>
									<RgbInput
										value={getSetting("highlightColor")}
										onChange={(value) =>
											updateCaptionSetting("highlightColor", value)
										}
									/>
								</div>
								<div class="flex flex-col gap-2">
									<span class="text-gray-11 text-sm">
										{t("editor.captions.animation.fadeDuration")}
									</span>
									<Slider
										value={[getSetting("fadeDuration") * 100]}
										onChange={(v) =>
											updateCaptionSetting("fadeDuration", v[0] / 100)
										}
										minValue={0}
										maxValue={50}
										step={1}
										disabled={!hasCaptions()}
									/>
									<span class="text-xs text-gray-11 text-right">
										{(getSetting("fadeDuration") * 1000).toFixed(0)}ms
									</span>
								</div>
							</div>
						</Field>

						<Field name={t("editor.captions.fontWeight.title")} icon={<IconCapMessageBubble />}>
							<KSelect
								options={[
									{ label: t("editor.captions.fontWeight.normal"), value: 400 },
									{ label: t("editor.captions.fontWeight.medium"), value: 500 },
									{ label: t("editor.captions.fontWeight.bold"), value: 700 },
								]}
								optionValue="value"
								optionTextValue="label"
								value={{
									label: t("editor.captions.fontWeight.custom"),
									value: getSetting("fontWeight"),
								}}
								onChange={(value) => {
									if (!value) return;
									updateCaptionSetting("fontWeight", value.value);
								}}
								disabled={!hasCaptions()}
								itemComponent={(selectItemProps) => (
									<MenuItem<typeof KSelect.Item>
										as={KSelect.Item}
										item={selectItemProps.item}
									>
										<KSelect.ItemLabel class="flex-1">
											{selectItemProps.item.rawValue.label}
										</KSelect.ItemLabel>
										<KSelect.ItemIndicator class="ml-auto text-blue-9">
											<IconCapCircleCheck />
										</KSelect.ItemIndicator>
									</MenuItem>
								)}
							>
								<KSelect.Trigger class="flex w-full items-center justify-between rounded-md border border-gray-3 bg-gray-2 px-3 py-2 text-sm text-gray-12 transition-colors hover:border-gray-4 hover:bg-gray-3 focus:border-blue-9 focus:outline-none focus:ring-1 focus:ring-blue-9">
									<KSelect.Value<{
										label: string;
										value: number;
									}> class="truncate">
										{(state) => {
											const selected = state.selectedOption();
											if (selected) return selected.label;
											const weight = getSetting("fontWeight");
											const option = [
												{ label: t("editor.captions.fontWeight.normal"), value: 400 },
												{ label: t("editor.captions.fontWeight.medium"), value: 500 },
												{ label: t("editor.captions.fontWeight.bold"), value: 700 },
											].find((o) => o.value === weight);
											return option
												? option.label
												: t("editor.captions.fontWeight.bold");
										}}
									</KSelect.Value>
									<KSelect.Icon>
										<IconCapChevronDown class="size-4 shrink-0 transform transition-transform ui-expanded:rotate-180 text-[--gray-500]" />
									</KSelect.Icon>
								</KSelect.Trigger>
								<KSelect.Portal>
									<PopperContent<typeof KSelect.Content>
										as={KSelect.Content}
										class={cx(topSlideAnimateClasses, "z-50")}
									>
										<MenuItemList<typeof KSelect.Listbox>
											class="overflow-y-auto max-h-40"
											as={KSelect.Listbox}
										/>
									</PopperContent>
								</KSelect.Portal>
							</KSelect>
						</Field>

						<Field name={t("editor.captions.exportOptions.title")} icon={<IconCapMessageBubble />}>
							<Subfield name={t("editor.captions.exportOptions.exportWithSubtitles")}>
								<Toggle
									checked={getSetting("exportWithSubtitles")}
									onChange={(checked) =>
										updateCaptionSetting("exportWithSubtitles", checked)
									}
									disabled={!hasCaptions()}
								/>
							</Subfield>
						</Field>
					</div>

					<Show when={hasCaptions()}>
						<Field
							name={t("editor.captions.segments.title")}
							icon={<IconCapMessageBubble />}
						>
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<Button
										onClick={() => addSegment(editorState.playbackTime)}
										class="w-full"
									>
										{t("editor.captions.segments.addAtCurrentTime")}
									</Button>
								</div>

								<div class="max-h-[300px] overflow-y-auto space-y-3 pr-2">
									<For each={project.captions?.segments}>
										{(segment) => (
											<div class="bg-gray-2 border border-gray-3 rounded-lg p-4 space-y-4">
												<div class="flex flex-col space-y-4">
													<div class="flex space-x-4">
														<div class="flex-1">
															<label class="text-xs text-gray-11">
																{t("editor.captions.segments.startTime")}
															</label>
															<Input
																type="number"
																class="w-full"
																value={segment.start.toFixed(1)}
																step="0.1"
																min={0}
																onChange={(e) =>
																	updateSegment(segment.id, {
																		start: parseFloat(e.target.value),
																	})
																}
															/>
														</div>
														<div class="flex-1">
															<label class="text-xs text-gray-11">
																{t("editor.captions.segments.endTime")}
															</label>
															<Input
																type="number"
																class="w-full"
																value={segment.end.toFixed(1)}
																step="0.1"
																min={segment.start}
																onChange={(e) =>
																	updateSegment(segment.id, {
																		end: parseFloat(e.target.value),
																	})
																}
															/>
														</div>
													</div>

													<div class="space-y-2">
														<label class="text-xs text-gray-11">
															{t("editor.captions.segments.captionText")}
														</label>
														<div class="w-full px-3 py-2 bg-gray-2 border border-gray-3 rounded-lg text-sm focus-within:border-blue-9 focus-within:ring-1 focus-within:ring-blue-9 transition-colors">
															<textarea
																class="w-full resize-none outline-none bg-transparent text-[--text-primary]"
																value={segment.text}
																rows={2}
																onChange={(e) =>
																	updateSegment(segment.id, {
																		text: e.target.value,
																	})
																}
															/>
														</div>
													</div>

													<div class="flex justify-end">
														<Button
															variant="destructive"
															size="sm"
															onClick={() => deleteSegment(segment.id)}
															class="text-gray-11 inline-flex items-center gap-1.5"
														>
															<IconDelete />
															{t("button.delete")}
														</Button>
													</div>
												</div>
											</div>
										)}
									</For>
								</div>
							</div>
						</Field>
					</Show>
				</div>
			</div>
		</Field>
	);
}

function IconDelete() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			class="size-4"
		>
			<path
				d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
				fill="currentColor"
			/>
		</svg>
	);
}
