import { splitProps, type JSX } from 'solid-js'
import { ComponentView } from '@soldy/ui-solid'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers } from '../../common/eventLogger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

type Props = {
	onLog: (entry: EventLogEntry) => void
	[key: string]: any
}

export default function ComponentViewPropsDemo(props: Props): JSX.Element {
	const [local, rest] = splitProps(props, ['onLog'])
	const handlers = buildEventHandlers((entry) => local.onLog(entry), COMPONENT_VIEW_EVENTS)

	return (
		<PanelDemo info="Props-based demo">
			<ComponentView {...rest} {...handlers}>
				<div class="cv-box">Props-driven ComponentView</div>
			</ComponentView>
		</PanelDemo>
	)
}
