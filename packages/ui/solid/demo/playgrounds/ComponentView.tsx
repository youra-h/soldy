import { createSignal, type JSX } from 'solid-js'
import { TComponentView } from '@soldy/core'
import PlaygroundLayout from '../layouts/PlaygroundLayout'
import Properties from '../common/Properties'
import type { TPropertiesSchema } from '../common/Properties'
import PropsDemo from '../components/component-view/Component'
import InstanceDemo from '../components/component-view/Instance'
import SlotsDemo from '../components/component-view/Slots'
import { HTML_TAGS } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'

type Props = {
	onLog: (entry: EventLogEntry) => void
}

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	tag: { type: 'select', default: 'div', options: HTML_TAGS },
}

export default function ComponentViewPlayground(props: Props): JSX.Element {
	const [componentProps, setComponentProps] = createSignal<Record<string, any>>({
		visible: true,
		rendered: true,
		tag: 'div',
	})

	const instance = new TComponentView({ visible: true, rendered: true, tag: 'div' })

	return (
		<PlaygroundLayout
			title="ComponentView Playground"
			properties={
				<Properties
					value={componentProps()}
					schema={schema}
					onChange={setComponentProps}
					onShow={() => instance.show()}
					onHide={() => instance.hide()}
				/>
			}
			propsDemo={<PropsDemo {...componentProps()} onLog={props.onLog} />}
			instanceDemo={<InstanceDemo instance={instance} {...componentProps()} onLog={props.onLog} />}
			slotsDemo={<SlotsDemo {...componentProps()} />}
		/>
	)
}
