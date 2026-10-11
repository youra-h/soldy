<script lang="ts">
	/**
	 * Тестовая обёртка: поле с кнопкой очистки под провайдером локали, рядом —
	 * вложенный провайдер со своим полем. Имя кнопки собирается из шаблона
	 * локали (`field.clear`) и имени поля.
	 */
	import type { TInput } from '@soldy-ui/core'
	import type { TLocale } from '@soldy-ui/plugins'
	import { Input, LocaleProvider } from '@soldy-ui/svelte'

	type THarnessProps = {
		locale: TLocale
		/** Инстанс поля под внешним провайдером. */
		ctrl?: TInput
		/** Локаль вложенного провайдера; нет — вложенного нет. */
		inner?: TLocale
	}

	const props: THarnessProps = $props()
</script>

<LocaleProvider locale={props.locale}>
	<div class="s-test-outer">
		<Input ctrl={props.ctrl} clearable name="Город" />
	</div>
	{#if props.inner}
		<LocaleProvider locale={props.inner}>
			<div class="s-test-inner">
				<Input clearable name="Город" />
			</div>
		</LocaleProvider>
	{/if}
</LocaleProvider>
