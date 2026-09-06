import { TComponentView } from '@soldy/core'
import { playgroundLayout } from '../layouts/PlaygroundLayout'
import { createProperties, type TPropertiesSchema } from '../common/Properties'
import { componentViewPropsDemo } from '../components/component-view/Component'
import { componentViewInstanceDemo } from '../components/component-view/Instance'
import { componentViewSlotsDemo } from '../components/component-view/Slots'
import { HTML_TAGS } from '../common/items'
import type { EventLogEntry } from '../common/EventLog'

const schema: TPropertiesSchema = {
	visible: { type: 'boolean', default: true },
	rendered: { type: 'boolean', default: true },
	tag: { type: 'select', default: 'div', options: HTML_TAGS },
}

const initial = { visible: true, rendered: true, tag: 'div' }

export function componentViewPlayground(onLog: (entry: EventLogEntry) => void): HTMLElement {
	const instance = new TComponentView({ ...initial })

	const props = componentViewPropsDemo(onLog)
	const instanceDemo = componentViewInstanceDemo(instance, onLog)
	const slots = componentViewSlotsDemo()

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
		title: 'ComponentView Playground',
		properties: properties.el,
		propsDemo: props.el,
		instanceDemo: instanceDemo.el,
		slotsDemo: slots.el,
	})
}
