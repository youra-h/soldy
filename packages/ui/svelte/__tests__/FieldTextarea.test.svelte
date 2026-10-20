<script lang="ts">
	/**
	 * Тестовая обёртка: поле формы с многострочным полем. Контрол — содержимое
	 * поля (слот `default`, у Svelte — `children`), а содержимое разметкой
	 * пишется только в `.svelte`.
	 */
	import { Field, Textarea } from '@soldy-ui/svelte'

	type THarnessProps = {
		label?: string
		helper?: string
		/** Счётчик символов поля. */
		counter?: boolean
		maxlength?: number
	}

	const props: THarnessProps = $props()
</script>

<Field label={props.label} helper={props.helper}>
	<Textarea counter={props.counter} maxlength={props.maxlength} />
</Field>
