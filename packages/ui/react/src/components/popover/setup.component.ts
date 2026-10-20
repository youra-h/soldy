/**
 * useSetupPopover — setup-слой Popover (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(PopoverDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`,
 * жест — `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Корень служит панели якорем, а разметке он нужен значением рендера: его
 * отдаёт хук адаптера `useRootElement` — `null` на сервере и до коммита, узел
 * после, — как `rootElement` у Vue.
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useRootElement } from '../../adapter'
import type { PopoverProps } from './base.component'

export function useSetupPopover(props: PopoverProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(PopoverDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const binding = useAdapter(adapter, props)

	return { ...binding, rootElement: useRootElement(binding.root) }
}
