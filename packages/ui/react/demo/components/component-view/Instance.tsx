import { forwardRef, useImperativeHandle, useRef } from 'react'
import { ComponentView } from '@soldy/ui-react'
import { TComponentView } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo'
import { buildEventHandlers, useCoreEventLogger } from '../../common/useEventLogger'
import { useSyncPropsToInstance } from '../../common/useSyncPropsToInstance'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

export type ComponentViewInstanceDemoHandle = {
	show: () => void
	hide: () => void
}

type ComponentViewInstanceDemoProps = {
	visible?: boolean
	rendered?: boolean
	tag?: string
	onLog: (entry: EventLogEntry) => void
}

const ComponentViewInstanceDemo = forwardRef<
	ComponentViewInstanceDemoHandle,
	ComponentViewInstanceDemoProps
>(function ComponentViewInstanceDemo({ onLog, ...props }, ref) {
	const instanceRef = useRef<TComponentView | null>(null)

	if (!instanceRef.current) {
		instanceRef.current = new TComponentView({
			tag: props.tag || 'div',
			rendered: props.rendered ?? true,
			visible: props.visible ?? true,
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

	const handlers = buildEventHandlers(onLog, COMPONENT_VIEW_EVENTS)

	return (
		<PanelDemo info="Managed by TComponentView instance">
			<ComponentView ctrl={instance} {...handlers}>
				<div style={{ textAlign: 'center' }}>
					<div style={{ fontWeight: 600 }}>Instance Demo</div>
					<div style={{ fontSize: '0.875rem', color: '#666' }}>Component with instance</div>
				</div>
			</ComponentView>
		</PanelDemo>
	)
})

export default ComponentViewInstanceDemo
