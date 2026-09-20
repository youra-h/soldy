import { PopoverDescriptor } from '@soldy/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BasePopover, { type PopoverProps } from './base.component'

/**
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Popover',
	extends: BasePopover,
	setup(props: PopoverProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(PopoverDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return {
			// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
			...useAdapter(adapter, props, emit),
			/**
			 * Инстанс — для кнопки закрытия: она только ставит ему `open = false`.
			 * Возврат фокуса — забота плагина, разметка о нём не знает.
			 */
			popover: adapter.instance,
			closeIconTag: useIcon('close'),
		}
	},
}
