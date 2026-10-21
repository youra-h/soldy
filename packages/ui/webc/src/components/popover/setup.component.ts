/**
 * setupPopover — setup-слой Popover.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: от неё имя крестика, которое
 * пишет плагин имён) и связывает его с элементом через useAdapter. Логики
 * здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и фокус мимо
 * — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`, жест —
 * `TSwipePlugin`. Шаблон раскладывает то, что отдали ядро и плагины: связку —
 * панели и триггеру, а выход `dismiss_ownerAttribute` — пометкой на панель.
 */

import { PopoverDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

/** Выходы плагинов Popover — их читает шаблон: пометку панели владельцем. */
export type TPopoverOutputs = DescriptorPluginOutputs<typeof PopoverDescriptor>

export function setupPopover(
	host: HTMLElement,
	ctrl: IPopover | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPopover, unknown, TPopoverOutputs> {
	const adapter = createWebcAdapterContext(host, PopoverDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
