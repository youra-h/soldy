<script lang="ts">
	import { Button, Modal, TextInput } from 'carbon-components-svelte'

	/** A button opens the window; its buttons, the close icon, Escape and the backdrop close it. */
	let open = $state(false)
</script>

<Button on:click={() => (open = true)}>Открыть окно</Button>
<Modal
	bind:open
	modalHeading="Настройки"
	primaryButtonText="Сохранить"
	secondaryButtonText="Отмена"
	on:click:button--secondary={() => (open = false)}
	on:submit={() => (open = false)}
>
	<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
	<TextInput placeholder="Имя" />
</Modal>
