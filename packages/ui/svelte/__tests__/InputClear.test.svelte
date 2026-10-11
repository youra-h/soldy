<script lang="ts">
	/**
	 * Тестовая обёртка: своя кнопка очистки в слоте `clear`. Команду очистки
	 * кнопка берёт из scope и зовёт голой функцией.
	 */
	import type { TInput } from '@soldy-ui/core'
	import { Input } from '@soldy-ui/svelte'

	const { ctrl, clearable = false }: { ctrl?: TInput; clearable?: boolean } = $props()
</script>

<Input {ctrl} {clearable}>
	{#snippet clear(scope)}
		<button type="button" class="probe" aria-label="Очистить" onclick={() => scope.clear()}
		></button>
	{/snippet}
</Input>
