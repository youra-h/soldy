<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

/** Reka opens a tooltip on hover after its default delay (700 ms) and on focus at once. */
defineOptions({ name: 'RekaTooltipPage' })
</script>

<template>
	<TooltipRoot>
		<TooltipTrigger>Наведи</TooltipTrigger>
		<TooltipPortal>
			<TooltipContent style="background: black; color: white; padding: 4px 8px">
				Короткое пояснение к кнопке
			</TooltipContent>
		</TooltipPortal>
	</TooltipRoot>
</template>
