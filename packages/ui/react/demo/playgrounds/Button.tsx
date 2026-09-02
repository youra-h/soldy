import { useRef, useState } from 'react'
import PlaygroundLayout from '../layouts/PlaygroundLayout'
import Properties from '../common/Properties'
import type { TPropertiesSchema } from '../common/Properties'
import PropsDemo from '../components/button/Component'
import InstanceDemo, { type ButtonInstanceDemoHandle } from '../components/button/Instance'
import SlotsDemo from '../components/button/Slots'
import { SIZES, VARIANTS, BUTTON_APPEARANCES } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

type ButtonPlaygroundProps = {
	onLog: (entry: EventLogEntry) => void
}

const propertiesSchema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	disabled: { type: 'boolean', default: false },
	size: { type: 'select', default: 'normal', options: SIZES },
	variant: { type: 'select', default: 'normal', options: VARIANTS },
	view: { type: 'select', default: 'filled', options: BUTTON_APPEARANCES },
	text: { type: 'string', default: 'Button', placeholder: 'Button text' },
}

type ButtonComponentProps = {
	visible: boolean
	rendered: boolean
	disabled: boolean
	size: TComponentSize
	variant: TComponentVariant
	view: TButtonView
	text: string
}

export default function ButtonPlayground({ onLog }: ButtonPlaygroundProps) {
	const [componentProps, setComponentProps] = useState<ButtonComponentProps>({
		visible: true,
		rendered: true,
		disabled: false,
		size: 'normal',
		variant: 'normal',
		view: 'filled',
		text: 'Button',
	})

	const instanceDemoRef = useRef<ButtonInstanceDemoHandle>(null)

	const handleShow = () => instanceDemoRef.current?.show()
	const handleHide = () => instanceDemoRef.current?.hide()

	return (
		<PlaygroundLayout
			title="Button Playground"
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
			instanceDemo={<InstanceDemo ref={instanceDemoRef} {...componentProps} onLog={onLog} />}
			slotsDemo={
				<SlotsDemo
					size={componentProps.size}
					variant={componentProps.variant}
					disabled={componentProps.disabled}
				/>
			}
		/>
	)
}
