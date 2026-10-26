<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

/** A button opens a modal dialog with a field inside, as the soldy preview. */
defineOptions({ name: 'PrimeDialogPage' })

const shown = ref(false)
</script>

<template>
	<Button label="Открыть окно" @click="shown = true" />
	<Dialog v-model:visible="shown" modal header="Настройки">
		<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
		<InputText placeholder="Имя" />
		<template #footer>
			<Button label="Отмена" @click="shown = false" />
			<Button label="Сохранить" @click="shown = false" />
		</template>
	</Dialog>
</template>
