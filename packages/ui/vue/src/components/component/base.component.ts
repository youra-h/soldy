import type { PropType, UnwrapNestedRefs, Ref } from 'vue'
import { watch } from 'vue'
import { useSyncProps } from '../../composables/useSyncProps'
import { type IComponent, type IComponentProps } from '@soldy/core'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'

export const emitsComponent: TEmits = [
	'created',
	'rendered',
	'update:rendered',
	'change:rendered',
	'visible',
	'update:visible',
	'change:visible',
	'hide',
	'show',
	'beforeShow',
	'afterShow',
	'beforeHide',
	'afterHide',
] as const

export const propsComponent: TProps = {
	ctrl: {
		type: Object as PropType<IComponent | UnwrapNestedRefs<IComponent>>,
	},
}

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
	created() {
		// @ts-ignore
		this.$emit('created', { ctrl: this.ctrl, plugins: this.plugins })
	},
}

export interface IComponentState {
	rendered: Ref<boolean>
	visible: Ref<boolean>
	present: Ref<boolean>
}

export function syncComponent(options: ISyncComponentOptions<IComponentProps>): IComponentState {
	const { props, ctrl, plugins, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	// ctrl.events.on('created' as any, (ctrl: IComponentView) => {
	// 	emit?.('created', ctrl)
	// })

	ctrl.events.on('beforeShow' as any, () => {
		emit?.('beforeShow')
	})
	ctrl.events.on('afterShow' as any, () => {
		emit?.('afterShow')
	})
	ctrl.events.on('beforeHide' as any, () => {
		emit?.('beforeHide')
	})
	ctrl.events.on('afterHide' as any, () => {
		emit?.('afterHide')
	})
	ctrl.events.on('show' as any, () => {
		emit?.('show', ctrl)
	})
	ctrl.events.on('hide' as any, () => {
		emit?.('hide', ctrl)
	})
	ctrl.events.on('change:visible' as any, (value: boolean) => {
		emit?.('change:visible', value)
		emit?.('visible', value)
		emit?.('update:visible', value)
	})
	ctrl.events.on('change:rendered' as any, (value: boolean) => {
		emit?.('change:rendered', value)
		emit?.('rendered', value)
		emit?.('update:rendered', value)
	})

	watch<boolean | undefined>(
		() => props.rendered,
		(value) => {
			if (value !== undefined && value !== ctrl.rendered) {
				ctrl.rendered = value
			}
		},
	)

	watch<boolean | undefined>(
		() => props.visible,
		(value) => {
			if (value !== undefined && value !== ctrl.visible) {
				ctrl.visible = value
			}
		},
	)

	return useSyncProps(ctrl.events, {
		rendered: () => ctrl.rendered,
		visible: () => ctrl.visible,
		present: () => ctrl.present,
	})
}
