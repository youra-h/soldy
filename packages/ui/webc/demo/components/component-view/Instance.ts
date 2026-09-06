import type { TComponentView } from '@soldy/core'
import { h } from '../../common/dom'
import { panelDemo } from '../../common/PanelDemo'
import {
	bindEventLogger,
	bindCoreEventLogger,
	syncPropsToInstance,
} from '../../common/eventLogger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

export function componentViewInstanceDemo(
	instance: TComponentView,
	onLog: (entry: EventLogEntry) => void,
) {
	const view = h(
		'soldy-component-view',
		{},
		h('div', { class: 'cv-box' }, 'Instance-driven ComponentView'),
	)

	;(view as any).ctrl = instance

	bindEventLogger(view, COMPONENT_VIEW_EVENTS, onLog)
	bindCoreEventLogger(instance, onLog)

	return {
		el: panelDemo({ info: 'Managed by TComponentView instance' }, view),

		update(props: Record<string, any>): void {
			syncPropsToInstance(instance, props)
		},
	}
}
