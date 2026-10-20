/**
 * setupPopover — setup-слой Popover.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента.
 *
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`,
 * жест — `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины:
 * выход `dismiss_ownerAttribute` — на панель, корень (`rootElement`) — её
 * якорем.
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { PopoverProps } from './base.component'

export function setupPopover(
	getProps: () => PopoverProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(PopoverDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
