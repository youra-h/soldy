import { PopoverDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	useExpose,
	roleIcon,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BasePopover, { type PopoverProps } from './base.component'

/**
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`,
 * жест — `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Popover',
	extends: BasePopover,
	expose: useExpose(),
	setup(props: PopoverProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(PopoverDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// The template spreads the output `dismiss_ownerAttribute` onto the panel
		return extendBinding(useAdapter(adapter, props, emit), {
			/**
			 * Инстанс — для кнопки закрытия: она только ставит ему `open = false`.
			 * Возврат фокуса — забота плагина, разметка о нём не знает.
			 */
			popover: adapter.instance,
			closeIconTag: roleIcon('close'),
		})
	},
}
