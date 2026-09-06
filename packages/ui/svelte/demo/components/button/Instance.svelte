<script lang="ts">
	import { Button } from '@soldy/ui-svelte'
	import type { TButton } from '@soldy/core'
	import PanelDemo from '../../common/PanelDemo.svelte'
	import { buildEventHandlers, bindCoreEventLogger, syncPropsToInstance } from '../../common/eventLogger'
	import { BUTTON_EVENTS } from '../../common/items'
	import type { EventLogEntry } from '../../common/EventLog.svelte'

	type Props = {
		instance: TButton
		onLog: (entry: EventLogEntry) => void
		[key: string]: any
	}

	const { instance, onLog, ...rest }: Props = $props()

	const handlers = buildEventHandlers((entry) => onLog(entry), BUTTON_EVENTS)

	// Логирование ВСЕХ событий ядра через middleware — без перечисления имён
	$effect(() => bindCoreEventLogger(instance, onLog))

	// Панель свойств пишет напрямую в инстанс
	$effect(() => {
		syncPropsToInstance(instance, rest)
	})
</script>

<PanelDemo info="Managed by TButton instance">
	<Button ctrl={instance} {...handlers} />
</PanelDemo>
