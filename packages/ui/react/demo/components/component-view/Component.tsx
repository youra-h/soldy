import { ComponentView } from '@soldy/ui-react'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers } from '../../common/useEventLogger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

type ComponentViewPropsDemoProps = {
	visible?: boolean
	rendered?: boolean
	tag?: string
	onLog: (entry: EventLogEntry) => void
}

export default function ComponentViewPropsDemo({ onLog, ...props }: ComponentViewPropsDemoProps) {
	const handlers = buildEventHandlers(onLog, COMPONENT_VIEW_EVENTS)

	return (
		<PanelDemo info="Controlled by props from Properties panel">
			<ComponentView {...props} {...handlers}>
				<div style={{ textAlign: 'center' }}>
					<div style={{ fontWeight: 600 }}>Props Demo</div>
					<div style={{ fontSize: '0.875rem', color: '#666' }}>Component with props</div>
				</div>
			</ComponentView>
		</PanelDemo>
	)
}
