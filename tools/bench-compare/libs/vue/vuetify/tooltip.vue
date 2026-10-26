<script setup lang="ts">
import { VBtn } from 'vuetify/components/VBtn'
import { VTooltip } from 'vuetify/components/VTooltip'

defineOptions({ name: 'VuetifyTooltipPage' })
</script>

<template>
	<VTooltip text="Короткое пояснение к кнопке">
		<template #activator="{ props }">
			<VBtn v-bind="props">Наведи</VBtn>
		</template>
	</VTooltip>
</template>
