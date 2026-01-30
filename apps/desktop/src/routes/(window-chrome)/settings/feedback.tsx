import { Button } from "@cap/ui-solid";
import { action, useAction, useSubmission } from "@solidjs/router";
import { getVersion } from "@tauri-apps/api/app";
import { type as ostype } from "@tauri-apps/plugin-os";
import { createResource, createSignal, For, Show } from "solid-js";
import toast from "solid-toast";

import { useI18n } from "~/i18n";
import { commands, type SystemDiagnostics } from "~/utils/tauri";
import { apiClient, protectedHeaders } from "~/utils/web-api";

const sendFeedbackAction = action(async (feedback: string) => {
	const response = await apiClient.desktop.submitFeedback({
		body: { feedback, os: ostype() as any, version: await getVersion() },
		headers: await protectedHeaders(),
	});

	if (response.status !== 200) throw new Error("Failed to submit feedback");
	return response.body;
});

async function fetchDiagnostics(): Promise<SystemDiagnostics | null> {
	try {
		return await commands.getSystemDiagnostics();
	} catch (e) {
		console.error("Failed to fetch diagnostics:", e);
		return null;
	}
}

export default function FeedbackTab() {
	const t = useI18n();
	const [feedback, setFeedback] = createSignal("");
	const [uploadingLogs, setUploadingLogs] = createSignal(false);
	const [diagnostics] = createResource(fetchDiagnostics);

	const submission = useSubmission(sendFeedbackAction);
	const sendFeedback = useAction(sendFeedbackAction);

	const handleUploadLogs = async () => {
		setUploadingLogs(true);
		try {
			await commands.uploadLogs();
			toast.success(t("settings.feedback.toast.logsUploaded"));
		} catch (error) {
			toast.error(t("settings.feedback.toast.logsUploadFailed"));
			console.error("Failed to upload logs:", error);
		} finally {
			setUploadingLogs(false);
		}
	};

	return (
		<div class="flex flex-col w-full h-full">
			<div class="flex-1 custom-scroll">
				<div class="p-4 space-y-4">
					<div class="flex flex-col pb-4 border-b border-gray-2">
						<h2 class="text-lg font-medium text-gray-12">
							{t("settings.feedback.title")}
						</h2>
						<p class="text-sm text-gray-10">
							{t("settings.feedback.description")}
						</p>
					</div>
					<form
						class="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							sendFeedback(feedback());
						}}
					>
						<fieldset disabled={submission.pending}>
							<div>
								<textarea
									value={feedback()}
									onInput={(e) => setFeedback(e.currentTarget.value)}
									placeholder={t("settings.feedback.placeholder")}
									required
									minLength={10}
									class="p-2 w-full h-32 text-[13px] rounded-md border transition-colors duration-200 resize-none bg-gray-2 placeholder:text-gray-10 border-gray-3 text-primary focus:outline-none focus:ring-1 focus:ring-gray-8 hover:border-gray-6"
								/>
							</div>

							{submission.error && (
								<p class="mt-2 text-sm text-red-400">
									{submission.error.toString()}
								</p>
							)}

							{submission.result?.success && (
								<p class="text-sm text-primary">
									{t("settings.feedback.thankYou")}
								</p>
							)}

							<Button
								type="submit"
								size="md"
								variant="dark"
								disabled={feedback().trim().length < 4}
								class="mt-2"
							>
								{submission.pending
									? t("settings.feedback.submitting")
									: t("settings.feedback.submit")}
							</Button>
						</fieldset>
					</form>

					<div class="pt-6 border-t border-gray-2">
						<h3 class="text-sm font-medium text-gray-12 mb-2">
							{t("settings.feedback.community.title")}
						</h3>
						<p class="text-sm text-gray-10 mb-3">
							{t("settings.feedback.community.description")}
						</p>
						<Button
							onClick={() => window.open("https://cap.link/discord", "_blank")}
							size="md"
							variant="gray"
						>
							{t("settings.feedback.community.joinDiscord")}
						</Button>
					</div>

					<div class="pt-6 border-t border-gray-2">
						<h3 class="text-sm font-medium text-gray-12 mb-2">
							{t("settings.feedback.debug.title")}
						</h3>
						<p class="text-sm text-gray-10 mb-3">
							{t("settings.feedback.debug.description")}
						</p>
						<Button
							onClick={handleUploadLogs}
							size="md"
							variant="gray"
							disabled={uploadingLogs()}
						>
							{uploadingLogs()
								? t("settings.feedback.debug.uploading")
								: t("settings.feedback.debug.uploadLogs")}
						</Button>
					</div>

					<div class="pt-6 border-t border-gray-2">
						<h3 class="text-sm font-medium text-gray-12 mb-3">
							{t("settings.feedback.system.title")}
						</h3>
						<Show
							when={!diagnostics.loading && diagnostics()}
							fallback={
								<p class="text-sm text-gray-10">
									{t("settings.feedback.system.loading")}
								</p>
							}
						>
							{(diag) => {
								const d = diag() as Record<string, unknown>;
								const osVersion =
									"macosVersion" in d
										? (d.macosVersion as { displayName: string } | null)
										: "windowsVersion" in d
											? (d.windowsVersion as { displayName: string } | null)
											: null;
								const captureSupported =
									"screenCaptureSupported" in d
										? (d.screenCaptureSupported as boolean)
										: "graphicsCaptureSupported" in d
											? (d.graphicsCaptureSupported as boolean)
											: false;
								return (
									<div class="space-y-3 text-sm">
										<Show when={osVersion}>
											{(ver) => (
												<div class="space-y-1">
													<p class="text-gray-11 font-medium">
														{t("settings.feedback.system.operatingSystem")}
													</p>
													<p class="text-gray-10 bg-gray-2 px-2 py-1.5 rounded font-mono text-xs">
														{ver().displayName}
													</p>
												</div>
											)}
										</Show>

										<div class="space-y-1">
											<p class="text-gray-11 font-medium">
												{t("settings.feedback.system.captureSupport")}
											</p>
											<div class="flex gap-2 flex-wrap">
												<span
													class={`px-2 py-1 rounded text-xs ${
														captureSupported
															? "bg-green-500/20 text-green-400"
															: "bg-red-500/20 text-red-400"
													}`}
												>
													{t(
														captureSupported
															? "settings.feedback.system.captureSupported"
															: "settings.feedback.system.captureNotSupported",
													)}
												</span>
											</div>
										</div>

										<Show when={(d.availableEncoders as string[])?.length > 0}>
											<div class="space-y-1">
												<p class="text-gray-11 font-medium">
													{t("settings.feedback.system.availableEncoders")}
												</p>
												<div class="flex gap-1.5 flex-wrap">
													<For each={d.availableEncoders as string[]}>
														{(encoder) => (
															<span class="px-2 py-1 bg-gray-2 rounded text-xs text-gray-10 font-mono">
																{encoder}
															</span>
														)}
													</For>
												</div>
											</div>
										</Show>
									</div>
								);
							}}
						</Show>
					</div>
				</div>
			</div>
		</div>
	);
}
