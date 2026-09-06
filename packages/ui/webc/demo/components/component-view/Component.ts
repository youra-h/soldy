import { h } from '../../common/dom'
import { panelDemo } from '../../common/PanelDemo'
import { bindEventLogger } from '../../common/eventLogger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

export function componentViewPropsDemo(onLog: (entry: EventLogEntry) => void) {
	const view = h(
		'soldy-component-view',
		{},
		h('div', { class: 'cv-box' }, 'Props-driven ComponentView'),
	)

	bindEventLogger(view, COMPONENT_VIEW_EVENTS, onLog)

	return {
		el: panelDemo({ info: 'Props-based demo' }, view),

		update(props: Record<string, any>): void {
			for (const [key, value] of Object.entries(props)) {
				;(view as any)[key] = value
			}
		},
	}
}
