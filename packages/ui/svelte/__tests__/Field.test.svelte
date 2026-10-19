<script lang="ts">
	/**
	 * Тестовая обёртка: поле формы с контролами. Контрол — содержимое поля
	 * (слот `default`, у Svelte — `children`), а содержимое разметкой пишется
	 * только в `.svelte`.
	 *
	 * - `controls` — контролы поля по порядку, ключ — вид контрола;
	 * - `input` и `id` — экземпляр и свой `id` поля ввода;
	 * - `nested` — флажок в слоте `trailing` поля ввода: контрол в слоте
	 *   контрола, а не контрол поля формы;
	 * - `groupLabel` — своё имя группы радио.
	 */
	import type { TField, TInput } from '@soldy-ui/core'
	import { CheckBox, Field, Input, Label, RadioGroup, Switch } from '@soldy-ui/svelte'

	type TControl = 'input' | 'check-box' | 'switch' | 'radio-group' | 'label-check-box'

	type THarnessProps = {
		/** Экземпляр поля. */
		ctrl?: TField
		label?: string
		helper?: string
		error?: string
		invalid?: boolean
		/** Контролы поля по порядку. */
		controls: TControl[]
		/** Экземпляр поля ввода. */
		input?: TInput
		/** Свой `id` поля ввода. */
		id?: string
		/** Флажок в слоте `trailing` поля ввода. */
		nested?: boolean
		/** Своё имя группы радио. */
		groupLabel?: string
	}

	const props: THarnessProps = $props()
</script>

<Field
	ctrl={props.ctrl}
	label={props.label}
	helper={props.helper}
	error={props.error}
	invalid={props.invalid}
>
	{#each props.controls as control (control)}
		{#if control === 'input'}
			{#snippet trailing()}<CheckBox />{/snippet}
			<Input ctrl={props.input} id={props.id} trailing={props.nested ? trailing : undefined} />
		{:else if control === 'check-box'}
			<CheckBox />
		{:else if control === 'switch'}
			<Switch />
		{:else if control === 'radio-group'}
			<RadioGroup aria_label={props.groupLabel}>
				<RadioGroup.Item value="a">А</RadioGroup.Item>
				<RadioGroup.Item value="b">Б</RadioGroup.Item>
			</RadioGroup>
		{:else}
			<Label text="Согласен"><CheckBox /></Label>
		{/if}
	{/each}
</Field>
