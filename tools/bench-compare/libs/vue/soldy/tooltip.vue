<script setup lang="ts">
import { Button, Tooltip } from '@soldy-ui/vue'

defineOptions({ name: 'SoldyTooltipPage' })
</script>

<template>
	<Tooltip>
		<template #trigger="{ triggerAria }">
			<Button text="Наведи" v-bind="triggerAria" />
		</template>
		Короткое пояснение к кнопке
	</Tooltip>
</template>
