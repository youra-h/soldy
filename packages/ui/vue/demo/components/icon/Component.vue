<script setup lang="ts">
import { Icon, emitsIcon, useIconImport } from '@soldy/ui-vue'
import PanelDemo from '../../common/PanelDemo.vue'
import { useEventLogger } from '../../common/useEventLogger'
import type { EventLogEntry } from '../../common/EventLog.vue'
import type { TComponentSize } from '@soldy/core'

type Props = {
	visible?: boolean
	rendered?: boolean
	tag?: string
	size?: TComponentSize
	width?: number | string
	height?: number | string
}

const props = defineProps<Props>()

const emit = defineEmits<{
	log: [entry: EventLogEntry]
}>()

// Создаем обработчики событий через композабл
const { handlers } = useEventLogger(emit, emitsIcon)
</script>

<template>
	<PanelDemo info="Controlled by props from Properties panel">
		<Icon
			:tag="useIconImport(tag || 'home')"
			:visible="visible"
			:rendered="rendered"
			:size="size"
			:width="width"
			:height="height"
			v-bind="handlers"
		/>
	</PanelDemo>
</template>
