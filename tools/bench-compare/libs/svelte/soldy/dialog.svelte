<script lang="ts">
	import { Button, Dialog, Input } from '@soldy-ui/svelte'

	let shown = $state(false)
</script>

<Button text="Открыть окно" onclick={() => (shown = true)} />
<Dialog visible={shown} onChangeVisible={(value: boolean) => (shown = value)}>
	{#snippet title()}Настройки{/snippet}
	<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
	<Input placeholder="Имя" />
	{#snippet footer()}
		<Button text="Отмена" onclick={() => (shown = false)} />
		<Button text="Сохранить" onclick={() => (shown = false)} />
	{/snippet}
</Dialog>
