<script lang="ts">
	/**
	 * Тестовая обёртка: показанный Frame под провайдером локали, в панели —
	 * кнопка. Панель телепорт уводит в цель — отдельным корнем Svelte в своей
	 * обёртке; набор кнопки тест получает в `onBundleCreate`. Цель и
	 * `contained` у Frame тест меняет пропсами.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import { Button, Frame, LocaleProvider } from '@soldy-ui/svelte'

	type THarnessProps = {
		locale: TLocale
		target?: string
		contained?: boolean
		onBundleCreate?: (bundle: unknown) => void
	}

	const props: THarnessProps = $props()
</script>

<LocaleProvider locale={props.locale}>
	<Frame visible target={props.target} contained={props.contained}>
		<Button onBundleCreate={props.onBundleCreate} />
	</Frame>
</LocaleProvider>
