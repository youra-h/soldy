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
	 * - `groupLabel` — своё имя группы радио и поля даты;
	 * - `slider` — экземпляр ползунка; `slider-range` — ползунок с двумя
	 *   ручками и их именами;
	 * - `select` — Select с опциями разметки: поле в нём — деталь его разметки;
	 * - `date-input` — поле даты, `date-picker` и `date-picker-range` —
	 *   DatePicker одной даты и диапазона: его поля — детали его разметки.
	 */
	import type { TField, TInput, TSlider } from '@soldy-ui/core'
	import {
		CheckBox,
		DateInput,
		DatePicker,
		Field,
		Input,
		Label,
		NumberInput,
		RadioGroup,
		Rating,
		Select,
		Slider,
		Switch,
	} from '@soldy-ui/svelte'

	type TControl =
		| 'input'
		| 'number-input'
		| 'check-box'
		| 'switch'
		| 'radio-group'
		| 'label-check-box'
		| 'rating'
		| 'slider'
		| 'slider-range'
		| 'select'
		| 'date-input'
		| 'date-picker'
		| 'date-picker-range'

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
		/** Своё имя группы радио и поля даты. */
		groupLabel?: string
		/** Экземпляр ползунка. */
		slider?: TSlider
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
		{:else if control === 'number-input'}
			<NumberInput />
		{:else if control === 'check-box'}
			<CheckBox />
		{:else if control === 'switch'}
			<Switch />
		{:else if control === 'radio-group'}
			<RadioGroup aria_label={props.groupLabel}>
				<RadioGroup.Item value="a">А</RadioGroup.Item>
				<RadioGroup.Item value="b">Б</RadioGroup.Item>
			</RadioGroup>
		{:else if control === 'rating'}
			<Rating />
		{:else if control === 'slider'}
			<Slider ctrl={props.slider} />
		{:else if control === 'slider-range'}
			<Slider value={[20, 80]} thumbLabels={['От', 'До']} />
		{:else if control === 'select'}
			<Select>
				<Select.Item value="msk" text="Москва" />
				<Select.Item value="tver" text="Тверь" />
			</Select>
		{:else if control === 'date-input'}
			<DateInput aria_label={props.groupLabel} />
		{:else if control === 'date-picker'}
			<DatePicker />
		{:else if control === 'date-picker-range'}
			<DatePicker mode="range" />
		{:else}
			<Label text="Согласен"><CheckBox /></Label>
		{/if}
	{/each}
</Field>
