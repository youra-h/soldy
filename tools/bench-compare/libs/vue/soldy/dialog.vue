<script setup lang="ts">
import { ref } from 'vue'
import { Button, Dialog, Input } from '@soldy-ui/vue'

defineOptions({ name: 'SoldyDialogPage' })

const shown = ref(false)
</script>

<template>
	<Button text="Открыть окно" @click="shown = true" />
	<Dialog v-model:visible="shown">
		<template #title>Настройки</template>
		<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
		<Input placeholder="Имя" />
		<template #footer>
			<Button text="Отмена" @click="shown = false" />
			<Button text="Сохранить" @click="shown = false" />
		</template>
	</Dialog>
</template>
