/**
 * setupTooltip — setup-слой Tooltip.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: наведение, фокус с клавиатуры, нажатие и
 * Escape — `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`. Шаблон
 * раскладывает то, что отдали ядро и плагины: связку — панели и триггеру, а
 * выход `dismiss_ownerAttribute` — пометкой на панель.
 */

import { TooltipDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { ITooltip } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

/** Выходы плагинов Tooltip — их читает шаблон: пометку панели владельцем. */
export type TTooltipOutputs = DescriptorPluginOutputs<typeof TooltipDescriptor>

export function setupTooltip(
	host: HTMLElement,
	ctrl: ITooltip | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITooltip, unknown, TTooltipOutputs> {
	const adapter = createWebcAdapterContext(host, TooltipDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
