<script lang="ts">
	/**
	 * Тестовая обёртка: провайдер локали с кнопкой и вложенный провайдер со
	 * своей кнопкой. Набор каждой кнопки тест получает в `onBundleCreate`.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import { Button, LocaleProvider } from '@soldy-ui/svelte'

	type THarnessProps = {
		locale: TLocale
		/** Локаль вложенного провайдера; нет — вложенного нет. */
		inner?: TLocale
		onOuter?: (bundle: unknown) => void
		onInner?: (bundle: unknown) => void
	}

	const props: THarnessProps = $props()
</script>

<LocaleProvider locale={props.locale}>
	<Button text="outer" onBundleCreate={props.onOuter} />
	{#if props.inner}
		<LocaleProvider locale={props.inner}>
			<Button text="inner" onBundleCreate={props.onInner} />
		</LocaleProvider>
	{/if}
</LocaleProvider>
