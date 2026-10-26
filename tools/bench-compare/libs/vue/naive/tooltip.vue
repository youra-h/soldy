<script setup lang="ts">
import { NButton, NTooltip } from 'naive-ui'

/** Naive opens a tooltip by one trigger — hover by default; focus does not open it. */
defineOptions({ name: 'NaiveTooltipPage' })
</script>

<template>
	<NTooltip>
		<template #trigger>
			<NButton>Наведи</NButton>
		</template>
		Короткое пояснение к кнопке
	</NTooltip>
</template>
