import { createSignal, type JSX } from 'solid-js'
import { TButton } from '@soldy/core'
import PlaygroundLayout from '../layouts/PlaygroundLayout'
import Properties from '../common/Properties'
import type { TPropertiesSchema } from '../common/Properties'
import PropsDemo from '../components/button/Component'
import InstanceDemo from '../components/button/Instance'
import SlotsDemo from '../components/button/Slots'
import { SIZES, VARIANTS, BUTTON_APPEARANCES } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'

type Props = {
	onLog: (entry: EventLogEntry) => void
}

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	disabled: { type: 'boolean', default: false },
	size: { type: 'select', default: 'normal', options: SIZES },
	variant: { type: 'select', default: 'normal', options: VARIANTS },
	view: { type: 'select', default: 'filled', options: BUTTON_APPEARANCES },
	text: { type: 'string', default: 'Button', placeholder: 'Button text' },
}

export default function ButtonPlayground(props: Props): JSX.Element {
	const [componentProps, setComponentProps] = createSignal<Record<string, any>>({
		visible: true,
		rendered: true,
		disabled: false,
		size: 'normal',
		variant: 'normal',
		view: 'filled',
		text: 'Button',
	})

	/**
	 * Инстанс создаётся здесь, а не внутри Instance.tsx: тогда кнопки Show/Hide
	 * из панели свойств просто дёргают его методы, без проброса ref-ов наружу
	 * (в React для этого понадобился useImperativeHandle).
	 */
	const instance = new TButton({
		rendered: true,
		visible: true,
		size: 'normal',
		variant: 'normal',
		view: 'filled',
		disabled: false,
		text: 'Button',
	})

	return (
		<PlaygroundLayout
			title="Button Playground"
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
			slotsDemo={
				<SlotsDemo
					size={componentProps().size}
					variant={componentProps().variant}
					disabled={componentProps().disabled}
				/>
			}
		/>
	)
}
