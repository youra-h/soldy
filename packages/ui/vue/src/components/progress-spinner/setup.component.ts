import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseProgressSpinner, { type ProgressSpinnerProps } from './base.component'

/**
 * Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
 * рисунок и бег — тема. Выход `fractionStyle` шаблон кладёт в `:style` корня.
 */
export default {
	name: '_ProgressSpinner',
	extends: BaseProgressSpinner,
	setup(props: ProgressSpinnerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ProgressSpinnerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
