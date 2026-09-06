import { splitProps, type JSX } from 'solid-js'
import { Button } from '@soldy/ui-solid'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers } from '../../common/eventLogger'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

type Props = {
	onLog: (entry: EventLogEntry) => void
	[key: string]: any
}

export default function ButtonPropsDemo(props: Props): JSX.Element {
	const [local, rest] = splitProps(props, ['onLog'])
	const handlers = buildEventHandlers((entry) => local.onLog(entry), BUTTON_EVENTS)

	return (
		<PanelDemo info="Props-based demo">
			<Button {...rest} {...handlers} />
		</PanelDemo>
	)
}
