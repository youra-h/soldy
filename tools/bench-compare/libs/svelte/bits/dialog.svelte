<script lang="ts">
	import { Dialog } from 'bits-ui'

	/**
	 * The window with a field inside. Bits has no text field: the field is a
	 * native `<input>`, as shadcn-svelte's `Input` is.
	 */
</script>

<Dialog.Root>
	<Dialog.Trigger>Открыть окно</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content>
			<Dialog.Title>Настройки</Dialog.Title>
			<Dialog.Description>Произвольное содержимое: текст, поля, кнопки</Dialog.Description>
			<input placeholder="Имя" />
			<Dialog.Close>Отмена</Dialog.Close>
			<Dialog.Close>Сохранить</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
