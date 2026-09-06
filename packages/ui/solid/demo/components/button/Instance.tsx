import { createEffect, onCleanup, splitProps, type JSX } from 'solid-js'
import { Button } from '@soldy/ui-solid'
import type { TButton } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo'
import {
	buildEventHandlers,
	bindCoreEventLogger,
	syncPropsToInstance,
} from '../../common/eventLogger'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

type Props = {
	instance: TButton
	onLog: (entry: EventLogEntry) => void
	[key: string]: any
}

export default function ButtonInstanceDemo(props: Props): JSX.Element {
	const [local, rest] = splitProps(props, ['instance', 'onLog'])
	const handlers = buildEventHandlers((entry) => local.onLog(entry), BUTTON_EVENTS)

	// Логирование ВСЕХ событий ядра через middleware — без перечисления имён
	onCleanup(bindCoreEventLogger(local.instance, (entry) => local.onLog(entry)))

	// Панель свойств пишет напрямую в инстанс
	createEffect(() => syncPropsToInstance(local.instance, { ...rest }))

	return (
		<PanelDemo info="Managed by TButton instance">
			<Button ctrl={local.instance} {...handlers} />
		</PanelDemo>
	)
}
