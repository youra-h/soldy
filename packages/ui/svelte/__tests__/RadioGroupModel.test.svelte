<script lang="ts">
	/**
	 * Тестовая обёртка: настоящее состояние у потребителя. Значение — своя руна
	 * обёртки, группа пишет в неё выбор (`onChangeValue`), а каждое значение
	 * обёртка отдаёт наружу (`onPick`): последнее — текущее. Радио уходят из
	 * группы и при её снятии (`group`), и по условию по одному (`second`).
	 */
	import type { TRadioGroupValue } from '@soldy-ui/core'
	import { RadioGroup } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Группа в разметке; `false` — снята. */
		group?: boolean
		/** Радио «b» в разметке; `false` — снято. */
		second?: boolean
		/** Каждое значение потребителя, с начального. */
		onPick: (value: TRadioGroupValue) => void
	}

	const { group = true, second = true, onPick }: THarnessProps = $props()

	let value = $state<TRadioGroupValue>('b')

	$effect(() => {
		onPick(value)
	})
</script>

{#if group}
	<RadioGroup {value} onChangeValue={({ newValue }) => (value = newValue)}>
		<RadioGroup.Item value="a" />
		{#if second}
			<RadioGroup.Item value="b" />
		{/if}
	</RadioGroup>
{/if}
