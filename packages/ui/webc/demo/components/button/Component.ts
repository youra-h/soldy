import { h } from '../../common/dom'
import { panelDemo } from '../../common/PanelDemo'
import { bindEventLogger } from '../../common/eventLogger'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

/** Props-демо: значения кладутся в свойства элемента напрямую. */
export function buttonPropsDemo(onLog: (entry: EventLogEntry) => void) {
	const button = h('soldy-button')

	bindEventLogger(button, BUTTON_EVENTS, onLog)

	return {
		el: panelDemo({ info: 'Props-based demo' }, button),

		update(props: Record<string, any>): void {
			for (const [key, value] of Object.entries(props)) {
				;(button as any)[key] = value
			}
		},
	}
}
