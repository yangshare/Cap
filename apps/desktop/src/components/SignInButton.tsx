import { Button } from "@cap/ui-solid";

import type { ComponentProps } from "solid-js";
import { createSignInMutation } from "~/utils/auth";
import { useI18n } from "~/i18n";

export function SignInButton(
	props: Omit<ComponentProps<typeof Button>, "onClick">,
) {
	const signIn = createSignInMutation();
	const t = useI18n();

	return (
		<Button
			size="md"
			class="flex flex-grow justify-center items-center"
			{...props}
			variant={signIn.isPending ? "gray" : "primary"}
			onClick={() => {
				if (signIn.isPending) {
					signIn.variables.abort();
					signIn.reset();
				} else {
					signIn.mutate(new AbortController());
				}
			}}
		>
			{signIn.isPending ? t("auth.cancelSignIn") : (props.children ?? t("auth.signIn"))}
		</Button>
	);
}
