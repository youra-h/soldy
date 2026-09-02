<script setup lang="ts">
import { ref, watch } from 'vue'
import { Collapse, emitsCollapse } from '@soldy/ui-vue'
import { TCollapse } from '@soldy/core'
import type { TCollapseCollection } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo.vue'
import { useSyncPropsToInstance } from '../../common/useSyncPropsToInstance'
import { useEventLogger, useCoreEventLogger } from '../../common/useEventLogger'
import type { EventLogEntry } from '../../common/EventLog.vue'
import type {
	TComponentSize,
	TComponentVariant,
	TCollapseView,
	TSelectionMode,
	TCollapseArrowPlacement,
} from '@soldy/core'

type Props = {
	visible?: boolean
	rendered?: boolean
	disabled?: boolean
	size?: TComponentSize
	variant?: TComponentVariant
	view?: TCollapseView
	mode?: TSelectionMode
	arrowPlacement?: TCollapseArrowPlacement
	itemDisabled?: boolean
	itemApplyTarget?: 'all' | 'first'
}

const props = defineProps<Props>()

const emit = defineEmits<{
	log: [entry: EventLogEntry]
}>()

defineExpose({
	show: () => instance.show(),
	hide: () => instance.hide(),
})

const instance = new TCollapse({
	visible: props.visible ?? true,
	rendered: props.rendered ?? true,
	disabled: props.disabled ?? false,
	size: props.size ?? 'normal',
	variant: props.variant ?? 'normal',
	view: props.view ?? 'plain',
})

const collection = ref<TCollapseCollection | null>(null)

function onEngineCreate(engine: TCollapseCollection) {
	collection.value = engine

	const { plain, selection } = engine.extensions

	const item1 = plain.push({ text: 'Section 1', value: 'sec1' })
	plain.push({ text: 'Section 2', value: 'sec2' })
	plain.push({ text: 'Section 3', value: 'sec3' })

	selection.mode = props.mode ?? 'multiple'
	selection.select(item1)
}

const { handlers, logEvent } = useEventLogger(emit, emitsCollapse)
useCoreEventLogger(instance, logEvent, emitsCollapse)

useSyncPropsToInstance(props, instance, [
	'visible',
	'rendered',
	'disabled',
	'size',
	'variant',
	'view',
])

// Синхронизация свойств элементов и режима выбора
watch(
	[
		() => props.itemDisabled,
		() => props.itemApplyTarget,
		() => props.arrowPlacement,
		() => props.mode,
		collection,
	],
	() => {
		const engine = collection.value

		if (!engine) return

		if (props.mode !== undefined) {
			engine.extensions.selection.mode = props.mode
		}

		engine.driver.forEach((item, index) => {
			const apply = props.itemApplyTarget === 'all' || index === 0
			item.disabled = apply ? !!props.itemDisabled : false
			if (props.arrowPlacement !== undefined) {
				item.arrowPlacement = props.arrowPlacement
			}
		})
	},
	{ immediate: true },
)
</script>

<template>
	<PanelDemo info="Instance-based demo">
		<Collapse :ctrl="instance" @engine:create="onEngineCreate" v-bind="handlers">
			<template #panel:sec1>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
				incididunt ut labore et dolore magna aliqua.
			</template>
			<template #panel:sec2>
				lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
				incididunt ut labore et dolore magna aliqua.
			</template>
			<template #panel:sec3>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
				incididunt ut labore et dolore magna aliqua. lorem ipsum dolor sit amet, consectetur
				adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
			</template>
		</Collapse>
	</PanelDemo>
</template>
