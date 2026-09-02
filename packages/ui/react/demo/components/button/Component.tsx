import { Button } from '@soldy/ui-react'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers } from '../../common/useEventLogger'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

type ButtonPropsDemoProps = {
	visible?: boolean
	rendered?: boolean
	size?: TComponentSize
	variant?: TComponentVariant
	view?: TButtonView
	disabled?: boolean
	text?: string
	onLog: (entry: EventLogEntry) => void
}

export default function ButtonPropsDemo({ onLog, ...props }: ButtonPropsDemoProps) {
	const handlers = buildEventHandlers(onLog, BUTTON_EVENTS)

	return (
		<PanelDemo info="Props-based demo">
			<Button {...props} {...handlers} />
		</PanelDemo>
	)
}
