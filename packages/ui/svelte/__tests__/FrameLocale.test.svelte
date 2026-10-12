<script lang="ts">
	/**
	 * Тестовая обёртка: показанный Frame под провайдером локали, в панели —
	 * кнопка. Панель телепорт уводит в `body`, отдельным корнем Svelte; набор
	 * кнопки тест получает в `onBundleCreate`.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import { Button, Frame, LocaleProvider } from '@soldy-ui/svelte'

	type THarnessProps = {
		locale: TLocale
		onBundleCreate?: (bundle: unknown) => void
	}

	const props: THarnessProps = $props()
</script>

<LocaleProvider locale={props.locale}>
	<Frame visible>
		<Button onBundleCreate={props.onBundleCreate} />
	</Frame>
</LocaleProvider>
