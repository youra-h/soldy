<script setup lang="ts">
import { ref } from 'vue'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard, VCardActions, VCardText, VCardTitle } from 'vuetify/components/VCard'
import { VDialog } from 'vuetify/components/VDialog'
import { VTextField } from 'vuetify/components/VTextField'

/** A button opens a dialog with a field inside, as the soldy preview. */
defineOptions({ name: 'VuetifyDialogPage' })

const shown = ref(false)
</script>

<template>
	<VBtn @click="shown = true">Открыть окно</VBtn>
	<VDialog v-model="shown" max-width="480">
		<VCard>
			<VCardTitle>Настройки</VCardTitle>
			<VCardText>
				<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
				<VTextField placeholder="Имя" />
			</VCardText>
			<VCardActions>
				<VBtn @click="shown = false">Отмена</VBtn>
				<VBtn @click="shown = false">Сохранить</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>
