import type { TButton } from '@soldy/core'
import { h } from '../../common/dom'
import { panelDemo } from '../../common/PanelDemo'
import {
	bindEventLogger,
	bindCoreEventLogger,
	syncPropsToInstance,
} from '../../common/eventLogger'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

/** Instance-демо: элементом управляет готовый TButton. */
export function buttonInstanceDemo(instance: TButton, onLog: (entry: EventLogEntry) => void) {
	const button = h('soldy-button')

	// ctrl выставляем ДО вставки в DOM: adapter-context создаётся один раз
	;(button as any).ctrl = instance

	bindEventLogger(button, BUTTON_EVENTS, onLog)
	bindCoreEventLogger(instance, onLog)

	return {
		el: panelDemo({ info: 'Managed by TButton instance' }, button),

		update(props: Record<string, any>): void {
			syncPropsToInstance(instance, props)
		},
	}
}
