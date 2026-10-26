<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NInput, NModal } from 'naive-ui'

/** A button opens a modal card with a field inside, as the soldy preview. */
defineOptions({ name: 'NaiveDialogPage' })

const shown = ref(false)
</script>

<template>
	<NButton @click="shown = true">Открыть окно</NButton>
	<NModal v-model:show="shown">
		<NCard title="Настройки" style="width: 480px" role="dialog" aria-modal="true">
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<NInput placeholder="Имя" />
			<template #footer>
				<NButton @click="shown = false">Отмена</NButton>
				<NButton @click="shown = false">Сохранить</NButton>
			</template>
		</NCard>
	</NModal>
</template>
