<script lang="ts">
	import { TComponentView } from '@soldy/core'
	import PlaygroundLayout from '../layouts/PlaygroundLayout.svelte'
	import Properties from '../common/Properties.svelte'
	import type { TPropertiesSchema } from '../common/Properties.svelte'
	import PropsDemo from '../components/component-view/Component.svelte'
	import InstanceDemo from '../components/component-view/Instance.svelte'
	import SlotsDemo from '../components/component-view/Slots.svelte'
	import { HTML_TAGS } from '../common/items'
	import type { EventLogEntry } from '../common/EventLog.svelte'

	const { onLog }: { onLog: (entry: EventLogEntry) => void } = $props()

	const schema: TPropertiesSchema = {
		visible: { type: 'boolean', default: true },
		rendered: { type: 'boolean', default: true },
		tag: { type: 'select', default: 'div', options: HTML_TAGS },
	}

	let componentProps = $state<Record<string, any>>({
		visible: true,
		rendered: true,
		tag: 'div',
	})

	const instance = new TComponentView({ visible: true, rendered: true, tag: 'div' })
</script>

<PlaygroundLayout title="ComponentView Playground">
	{#snippet properties()}
		<Properties
			value={componentProps}
			{schema}
			onChange={(next) => (componentProps = next)}
			onShow={() => instance.show()}
			onHide={() => instance.hide()}
		/>
	{/snippet}

	{#snippet propsDemo()}
		<PropsDemo {...componentProps} {onLog} />
	{/snippet}

	{#snippet instanceDemo()}
		<InstanceDemo {instance} {...componentProps} {onLog} />
	{/snippet}

	{#snippet slotsDemo()}
		<SlotsDemo {...componentProps} />
	{/snippet}
</PlaygroundLayout>
