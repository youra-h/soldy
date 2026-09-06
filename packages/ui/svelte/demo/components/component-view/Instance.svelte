<script lang="ts">
	import { ComponentView } from '@soldy/ui-svelte'
	import type { TComponentView } from '@soldy/core'
	import PanelDemo from '../../common/PanelDemo.svelte'
	import {
		buildEventHandlers,
		bindCoreEventLogger,
		syncPropsToInstance,
	} from '../../common/eventLogger'
	import { COMPONENT_VIEW_EVENTS } from '../../common/items'
	import type { EventLogEntry } from '../../common/EventLog.svelte'

	type Props = {
		instance: TComponentView
		onLog: (entry: EventLogEntry) => void
		[key: string]: any
	}

	const { instance, onLog, ...rest }: Props = $props()

	const handlers = buildEventHandlers((entry) => onLog(entry), COMPONENT_VIEW_EVENTS)

	$effect(() => bindCoreEventLogger(instance, onLog))

	$effect(() => {
		syncPropsToInstance(instance, rest)
	})
</script>

<PanelDemo info="Managed by TComponentView instance">
	<ComponentView ctrl={instance} {...handlers}>
		<div class="cv-box">Instance-driven ComponentView</div>
	</ComponentView>
</PanelDemo>
