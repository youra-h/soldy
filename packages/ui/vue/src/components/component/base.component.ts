import { type PropType, type Ref } from 'vue'
import { type IComponentProps } from '@soldy/core'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { track } from '@soldy/host'

export const emitsComponent: TEmits = [
	'created',
	'show',
	'hide',
	'show:before',
	'show:after',
	'hide:before',
	'hide:after',
	'change:rendered',
	'change:visible',
	'change:present',
	'update:rendered',
	'update:visible',
] as const

export const propsComponent: TProps = {
	rendered: {
		type: Boolean as PropType<boolean>,
		default: true,
	},
	visible: {
		type: Boolean as PropType<boolean>,
		default: true,
	},
	ctrl: {
		type: Object as PropType<any>,
		default: undefined,
	},
	plugins: {
		type: Object as PropType<any>,
		default: undefined,
	},
}

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
	created() {
		// @ts-ignore
		this.$emit('created', { ctrl: this.instance, plugins: this.plugins })
	},
}

export interface IComponentState {
	rendered: Ref<boolean>
	visible: Ref<boolean>
	present: Ref<boolean>
}

/** @deprecated Использовать setup.component.ts с useAdapter */
export function syncComponent(options: ISyncComponentOptions<IComponentProps>): IComponentState {
	const { props, instance, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	// instance.events.on('created' as any, (instance: IComponentView) => {
	// 	emit?.('created', instance)
	// })

	instance.events.on('show:before' as any, () => {
		emit?.('show:before')
	})
	instance.events.on('show:after' as any, () => {
		emit?.('show:after')
	})
	instance.events.on('hide:before' as any, () => {
		emit?.('hide:before')
	})
	instance.events.on('hide:after' as any, () => {
		emit?.('hide:after')
	})
	instance.events.on('show' as any, () => {
		emit?.('show', instance)
	})
	instance.events.on('hide' as any, () => {
		emit?.('hide', instance)
	})
	instance.events.on('change:visible' as any, (value: boolean) => {
		emit?.('change:visible', value)
		emit?.('visible', value)
		emit?.('update:visible', value)
	})
	instance.events.on('change:rendered' as any, (value: boolean) => {
		emit?.('change:rendered', value)
		emit?.('rendered', value)
		emit?.('update:rendered', value)
	})

	track(props, 'rendered', (value) => {
		if (value !== undefined) instance.rendered = value
	})
	track(props, 'visible', (value) => {
		if (value !== undefined) instance.visible = value
	})

	return useSyncProps(instance.events, {
		rendered: () => instance.rendered,
		visible: () => instance.visible,
		present: () => instance.present,
	})
}
