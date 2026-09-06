<script lang="ts">
	import { Button } from '@soldy/ui-svelte'
	import PanelDemo from '../../common/PanelDemo.svelte'
	import { buildEventHandlers } from '../../common/eventLogger'
	import { BUTTON_EVENTS } from '../../common/items'
	import type { EventLogEntry } from '../../common/EventLog.svelte'

	type Props = {
		onLog: (entry: EventLogEntry) => void
		[key: string]: any
	}

	const { onLog, ...rest }: Props = $props()

	const handlers = buildEventHandlers((entry) => onLog(entry), BUTTON_EVENTS)
</script>

<PanelDemo info="Props-based demo">
	<Button {...rest} {...handlers} />
</PanelDemo>
