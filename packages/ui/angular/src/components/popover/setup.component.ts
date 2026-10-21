import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupPopover — setup-слой Popover: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`,
 * жест — `TSwipePlugin`, `id` панели и связка триггера — `TPopoverIdsPlugin`,
 * имя крестика по локали поддерева — `TPopoverNamesPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины; выход `dismiss_ownerAttribute`
 * шаблон кладёт на панель.
 */
export function setupPopover(ctrl: IPopover | undefined, props: object): TBinding<IPopover> {
	const adapter = createAngularAdapterContext(PopoverDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
