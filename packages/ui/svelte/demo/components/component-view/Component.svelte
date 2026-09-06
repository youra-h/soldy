<script lang="ts">
	import { ComponentView } from '@soldy/ui-svelte'
	import PanelDemo from '../../common/PanelDemo.svelte'
	import { buildEventHandlers } from '../../common/eventLogger'
	import { COMPONENT_VIEW_EVENTS } from '../../common/items'
	import type { EventLogEntry } from '../../common/EventLog.svelte'

	type Props = {
		onLog: (entry: EventLogEntry) => void
		[key: string]: any
	}

	const { onLog, ...rest }: Props = $props()

	const handlers = buildEventHandlers((entry) => onLog(entry), COMPONENT_VIEW_EVENTS)
</script>

<PanelDemo info="Props-based demo">
	<ComponentView {...rest} {...handlers}>
		<div class="cv-box">Props-driven ComponentView</div>
	</ComponentView>
</PanelDemo>
