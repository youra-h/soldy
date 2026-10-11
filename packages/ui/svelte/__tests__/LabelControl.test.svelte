<script lang="ts">
	/**
	 * Тестовая обёртка: подпись вокруг контрола. Контрол — содержимое подписи
	 * (слот `default`, у Svelte — `children`), а содержимое разметкой пишется
	 * только в `.svelte`.
	 */
	import { CheckBox, Label, Switch, type SwitchProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Контрол в подписи. */
		control: 'check-box' | 'switch'
		/** Текст подписи. */
		text?: string
		/** Смена значения контрола — колбэк одного типа у CheckBox и Switch. */
		onChangeValue?: SwitchProps['onChangeValue']
	}

	const { control, text, onChangeValue }: THarnessProps = $props()
</script>

<Label {text}>
	{#if control === 'check-box'}
		<CheckBox {onChangeValue} />
	{:else}
		<Switch {onChangeValue} />
	{/if}
</Label>
