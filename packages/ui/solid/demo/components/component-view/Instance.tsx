import { createEffect, onCleanup, splitProps, type JSX } from 'solid-js'
import { ComponentView } from '@soldy/ui-solid'
import type { TComponentView } from '@soldy/core'
import PanelDemo from '../../common/PanelDemo'
import {
	buildEventHandlers,
	bindCoreEventLogger,
	syncPropsToInstance,
} from '../../common/eventLogger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'
import type { EventLogEntry } from '../../common/EventLog'

type Props = {
	instance: TComponentView
	onLog: (entry: EventLogEntry) => void
	[key: string]: any
}

export default function ComponentViewInstanceDemo(props: Props): JSX.Element {
	const [local, rest] = splitProps(props, ['instance', 'onLog'])
	const handlers = buildEventHandlers((entry) => local.onLog(entry), COMPONENT_VIEW_EVENTS)

	onCleanup(bindCoreEventLogger(local.instance, (entry) => local.onLog(entry)))

	createEffect(() => syncPropsToInstance(local.instance, { ...rest }))

	return (
		<PanelDemo info="Managed by TComponentView instance">
			<ComponentView ctrl={local.instance} {...handlers}>
				<div class="cv-box">Instance-driven ComponentView</div>
			</ComponentView>
		</PanelDemo>
	)
}
