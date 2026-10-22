<script lang="ts">
	/**
	 * Тестовая обёртка: компонент в окружении — в подписи `Label` или под
	 * провайдером локали. Содержимое разметкой пишется только в `.svelte`.
	 *
	 * - `label` — подпись `text` вокруг оценки или ползунка (`control`);
	 * - `locale` — провайдер с локалью `locale` вокруг оценки, пагинации, ленты,
	 *   календаря, поля даты или DatePicker (`control`); смена `locale` — смена
	 *   пропа провайдера.
	 *
	 * Пропсы самого компонента — `rating`, `slider`, `pagination`, `calendar`,
	 * `dateInput` и `datePicker`; смена их полей — смена пропсов компонента.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import {
		Calendar,
		DateInput,
		DatePicker,
		Label,
		LocaleProvider,
		Pagination,
		Rating,
		Scroller,
		Slider,
		type CalendarProps,
		type DateInputProps,
		type DatePickerProps,
		type PaginationProps,
		type RatingProps,
		type SliderProps,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Что вокруг компонента. */
		around: 'label' | 'locale'
		/** Компонент. */
		control:
			| 'rating'
			| 'slider'
			| 'pagination'
			| 'scroller'
			| 'calendar'
			| 'date-input'
			| 'date-picker'
		/** Текст подписи. */
		text?: string
		/** Локаль провайдера. */
		locale?: TLocale
		rating?: RatingProps
		slider?: SliderProps
		pagination?: PaginationProps
		calendar?: CalendarProps
		dateInput?: DateInputProps
		datePicker?: DatePickerProps
	}

	const props: THarnessProps = $props()
</script>

{#snippet component()}
	{#if props.control === 'rating'}
		<Rating {...props.rating ?? {}} />
	{:else if props.control === 'slider'}
		<Slider {...props.slider ?? {}} />
	{:else if props.control === 'pagination'}
		<Pagination {...props.pagination ?? {}} />
	{:else if props.control === 'calendar'}
		<Calendar {...props.calendar ?? {}} />
	{:else if props.control === 'date-input'}
		<DateInput {...props.dateInput ?? {}} />
	{:else if props.control === 'date-picker'}
		<DatePicker {...props.datePicker ?? {}} />
	{:else}
		<Scroller><span class="so-test-item">Первый</span></Scroller>
	{/if}
{/snippet}

{#if props.around === 'label'}
	<Label text={props.text}>{@render component()}</Label>
{:else if props.locale}
	<LocaleProvider locale={props.locale}>{@render component()}</LocaleProvider>
{/if}
