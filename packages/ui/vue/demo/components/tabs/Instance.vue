<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Tabs, emitsTabs } from '@soldy/ui-vue'
import { TTabs, TabsFactory } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo.vue'
import { useSyncPropsToInstance } from '../../common/useSyncPropsToInstance'
import { useEventLogger, useCoreEventLogger } from '../../common/useEventLogger'
import type { EventLogEntry } from '../../common/EventLog.vue'
import type {
	TComponentSize,
	TComponentVariant,
	TTabsOrientation,
	TTabsAlignment,
	TTabsPosition,
	TTabsView,
} from '@soldy/core'

type Props = {
	visible?: boolean
	rendered?: boolean
	disabled?: boolean
	size?: TComponentSize
	variant?: TComponentVariant
	orientation?: TTabsOrientation
	alignment?: TTabsAlignment
	position?: TTabsPosition
	view?: TTabsView
	closable?: boolean
	// Tab item props
	tabDisabled?: boolean
	tabClosable?: boolean
	tabApplyTarget?: 'all' | 'first'
}

const props = defineProps<Props>()

const emit = defineEmits<{
	log: [entry: EventLogEntry]
}>()

defineExpose({
	show: () => instance.show(),
	hide: () => instance.hide(),
})

const instance = new TTabs({
	visible: props.visible ?? true,
	rendered: props.rendered ?? true,
	disabled: props.disabled ?? false,
	size: props.size ?? 'normal',
	variant: props.variant ?? 'normal',
	orientation: props.orientation ?? 'horizontal',
	alignment: props.alignment ?? 'start',
	position: props.position ?? 'start',
	view: props.view ?? 'line',
	closable: props.closable ?? false,
})

const collection = TabsFactory(instance)
const { plain, activation } = collection.extensions

const tab1 = plain.push({ text: 'Tab 1', value: 'tab1' })
plain.push({ text: 'Tab 2', value: 'tab2' })
plain.push({ text: 'Tab 3', value: 'tab3' })

activation.activate(tab1)

const { handlers, logEvent } = useEventLogger(emit, emitsTabs)
useCoreEventLogger(instance, logEvent, emitsTabs)

useSyncPropsToInstance(props, instance, [
	'visible',
	'rendered',
	'disabled',
	'size',
	'variant',
	'orientation',
	'alignment',
	'position',
	'view',
	'closable',
])

// Синхронизация свойств вкладок
watch(
	[() => props.tabDisabled, () => props.tabClosable, () => props.tabApplyTarget],
	() => {
		collection.engine.forEach((item, index) => {
			const apply = props.tabApplyTarget === 'all' || index === 0
			item.disabled = apply ? !!props.tabDisabled : false
			item.closable = apply ? props.tabClosable : undefined
		})
	},
	{ immediate: true },
)
</script>

<template>
	<PanelDemo info="Instance-based demo">
		<Tabs :ctrl="instance" :engine="collection" v-bind="handlers">
			<template #panel:tab1><p>Content for Tab 1</p></template>
			<template #panel:tab2><p>Content for Tab 2</p></template>
			<template #panel:tab3><p>Content for Tab 3</p></template>
		</Tabs>
	</PanelDemo>
</template>
