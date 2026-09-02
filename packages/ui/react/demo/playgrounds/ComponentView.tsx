import { useRef, useState } from 'react'
import PlaygroundLayout from '../layouts/PlaygroundLayout'
import Properties from '../common/Properties'
import type { TPropertiesSchema } from '../common/Properties'
import PropsDemo from '../components/component-view/Component'
import InstanceDemo, {
	type ComponentViewInstanceDemoHandle,
} from '../components/component-view/Instance'
import SlotsDemo from '../components/component-view/Slots'
import { HTML_TAGS } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'

type ComponentViewPlaygroundProps = {
	onLog: (entry: EventLogEntry) => void
}

const propertiesSchema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	tag: { type: 'select', default: 'div', options: HTML_TAGS },
}

type ComponentViewProps = {
	visible: boolean
	rendered: boolean
	tag: string
}

export default function ComponentViewPlayground({ onLog }: ComponentViewPlaygroundProps) {
	const [componentProps, setComponentProps] = useState<ComponentViewProps>({
		visible: true,
		rendered: true,
		tag: 'div',
	})

	const instanceDemoRef = useRef<ComponentViewInstanceDemoHandle>(null)

	const handleShow = () => instanceDemoRef.current?.show()
	const handleHide = () => instanceDemoRef.current?.hide()

	return (
		<PlaygroundLayout
			title="ComponentView Playground"
			properties={
				<Properties
					value={componentProps}
					schema={propertiesSchema}
					onChange={setComponentProps}
					onShow={handleShow}
					onHide={handleHide}
				/>
			}
			propsDemo={<PropsDemo {...componentProps} onLog={onLog} />}
			instanceDemo={
				<InstanceDemo ref={instanceDemoRef} {...componentProps} onLog={onLog} />
			}
			slotsDemo={<SlotsDemo {...componentProps} />}
		/>
	)
}
