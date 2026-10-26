<script setup lang="ts">
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
	DialogTitle,
	DialogTrigger,
} from 'reka-ui'

/**
 * A button opens a modal dialog with a field inside, as the soldy preview.
 * Reka has no button or field: they are native elements, as in shadcn-vue.
 */
defineOptions({ name: 'RekaDialogPage' })
</script>

<template>
	<DialogRoot>
		<DialogTrigger>Открыть окно</DialogTrigger>
		<DialogPortal>
			<DialogOverlay style="position: fixed; inset: 0; background: rgb(0 0 0 / 0.4)" />
			<DialogContent
				style="position: fixed; top: 20%; left: 30%; background: white; padding: 16px"
			>
				<DialogTitle>Настройки</DialogTitle>
				<DialogDescription style="margin: 0 0 8px">
					Произвольное содержимое: текст, поля, кнопки
				</DialogDescription>
				<input placeholder="Имя" />
				<div>
					<DialogClose>Отмена</DialogClose>
					<DialogClose>Сохранить</DialogClose>
				</div>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
