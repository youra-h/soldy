/**
 * setupTooltip — setup-слой Tooltip.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента.
 *
 * Логики здесь нет: наведение, фокус с клавиатуры, нажатие и Escape —
 * `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины: выход `dismiss_ownerAttribute`
 * — на панель, корень (`rootElement`) — её якорем.
 */

import { TooltipDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { TooltipProps } from './base.component'

export function setupTooltip(
	getProps: () => TooltipProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(TooltipDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
