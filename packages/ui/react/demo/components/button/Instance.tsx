import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Button } from '@soldy/ui-react'
import { TButton } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers, useCoreEventLogger } from '../../common/useEventLogger'
import { useSyncPropsToInstance } from '../../common/useSyncPropsToInstance'
import { BUTTON_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

export type ButtonInstanceDemoHandle = {
	show: () => void
	hide: () => void
}

type ButtonInstanceDemoProps = {
	visible?: boolean
	rendered?: boolean
	size?: TComponentSize
	variant?: TComponentVariant
	view?: TButtonView
	disabled?: boolean
	text?: string
	onLog: (entry: EventLogEntry) => void
}

const ButtonInstanceDemo = forwardRef<ButtonInstanceDemoHandle, ButtonInstanceDemoProps>(
	function ButtonInstanceDemo({ onLog, ...props }, ref) {
		const instanceRef = useRef<TButton | null>(null)

		if (!instanceRef.current) {
			instanceRef.current = new TButton({
				rendered: props.rendered ?? true,
				visible: props.visible ?? true,
				size: props.size || 'normal',
				variant: props.variant || 'normal',
				view: props.view || 'filled',
				disabled: props.disabled ?? false,
				text: props.text || 'Button',
			})
		}

		const instance = instanceRef.current

		useImperativeHandle(
			ref,
			() => ({
				show: () => instance.show(),
				hide: () => instance.hide(),
			}),
			[instance],
		)

		useCoreEventLogger(instance, onLog)
		useSyncPropsToInstance(instance, props)

		const handlers = buildEventHandlers(onLog, BUTTON_EVENTS)

		return (
			<PanelDemo info="Managed by TButton instance">
				<Button ctrl={instance} {...handlers} />
			</PanelDemo>
		)
	},
)

export default ButtonInstanceDemo
