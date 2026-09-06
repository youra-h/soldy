import { TButton } from '@soldy/core'
import { playgroundLayout } from '../layouts/PlaygroundLayout'
import { createProperties, type TPropertiesSchema } from '../common/Properties'
import { buttonPropsDemo } from '../components/button/Component'
import { buttonInstanceDemo } from '../components/button/Instance'
import { buttonSlotsDemo } from '../components/button/Slots'
import { SIZES, VARIANTS, BUTTON_APPEARANCES } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	disabled: { type: 'boolean', default: false },
	size: { type: 'select', default: 'normal', options: SIZES },
	variant: { type: 'select', default: 'normal', options: VARIANTS },
	view: { type: 'select', default: 'filled', options: BUTTON_APPEARANCES },
	text: { type: 'string', default: 'Button', placeholder: 'Button text' },
}

const initial = {
	visible: true,
	rendered: true,
	disabled: false,
	size: 'normal',
	variant: 'normal',
	view: 'filled',
	text: 'Button',
}

export function buttonPlayground(onLog: (entry: EventLogEntry) => void): HTMLElement {
	/**
	 * Инстанс создаётся здесь, а не внутри Instance: кнопки Show/Hide из панели
	 * свойств просто дёргают его методы — так же, как в Svelte и Solid.
	 */
	const instance = new TButton({ ...initial } as any)

	const props = buttonPropsDemo(onLog)
	const instanceDemo = buttonInstanceDemo(instance, onLog)
	const slots = buttonSlotsDemo()

	const apply = (value: Record<string, any>) => {
		props.update(value)
		instanceDemo.update(value)
		slots.update(value)
	}

	const properties = createProperties({
		schema,
		value: initial,
		onChange: apply,
		onShow: () => instance.show(),
		onHide: () => instance.hide(),
	})

	apply(initial)

	return playgroundLayout({
		title: 'Button Playground',
		properties: properties.el,
		propsDemo: props.el,
		instanceDemo: instanceDemo.el,
		slotsDemo: slots.el,
	})
}
