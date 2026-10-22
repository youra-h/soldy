<script lang="ts">
	/**
	 * Тестовая обёртка: DatePicker в окружении — в форме (`form`: значение в
	 * форму отдают его поля) или в узле со своим обработчиком нажатия
	 * (`onParentClick`: клик кнопки очистки до него не всплывает). Смена полей
	 * `picker` — смена пропсов DatePicker.
	 */
	import { DatePicker, type DatePickerProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** DatePicker в `<form>`. */
		form?: boolean
		/** Обработчик нажатия на узле вокруг DatePicker. */
		onParentClick?: () => void
		picker: DatePickerProps
	}

	const props: THarnessProps = $props()
</script>

{#if props.form}
	<form><DatePicker {...props.picker} /></form>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div onclick={props.onParentClick}><DatePicker {...props.picker} /></div>
{/if}
