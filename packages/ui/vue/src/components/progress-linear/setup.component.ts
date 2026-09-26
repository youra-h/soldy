import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseProgressLinear, { type ProgressLinearProps } from './base.component'

/**
 * Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
 * бег рисует тема. Выход `percentStyle` шаблон кладёт в `:style` корня.
 */
export default {
	name: '_ProgressLinear',
	extends: BaseProgressLinear,
	setup(props: ProgressLinearProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ProgressLinearDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
