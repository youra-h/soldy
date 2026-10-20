<script lang="ts">
	/**
	 * Тестовая обёртка: поле числа под провайдером локали. Текст ввода ядро
	 * пишет в формате тега локали, имена кнопок шага плагин имён собирает по
	 * её шаблонам (`numberInput.increment`, `numberInput.decrement`).
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import { LocaleProvider, NumberInput } from '@soldy-ui/svelte'

	type THarnessProps = {
		locale: TLocale
		value?: number
		name?: string
		min?: number
	}

	const props: THarnessProps = $props()
</script>

<LocaleProvider locale={props.locale}>
	<NumberInput value={props.value} name={props.name} min={props.min} />
</LocaleProvider>
