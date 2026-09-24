import { TooltipDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseTooltip, { type TooltipProps } from './base.component'

/**
 * Логики здесь нет: наведение, фокус с клавиатуры, нажатие и Escape —
 * `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Tooltip',
	extends: BaseTooltip,
	setup(props: TooltipProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TooltipDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		return useAdapter(adapter, props, emit)
	},
}
