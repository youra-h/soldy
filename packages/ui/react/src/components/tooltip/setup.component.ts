/**
 * useSetupTooltip — setup-слой Tooltip (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(TooltipDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: наведение, фокус с клавиатуры, нажатие и Escape —
 * `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины.
 *
 * Корень служит панели якорем, а разметке он нужен значением рендера: его
 * отдаёт хук адаптера `useRootElement`, как у Popover.
 */

import { TooltipDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useRootElement } from '../../adapter'
import type { TooltipProps } from './base.component'

export function useSetupTooltip(props: TooltipProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(TooltipDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const binding = useAdapter(adapter, props)

	return { ...binding, rootElement: useRootElement(binding.root) }
}
