import { TooltipDescriptor } from '@soldy-ui/setup'
import type { ITooltip } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupTooltip — setup-слой Tooltip: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: наведение, фокус с клавиатуры, нажатие и Escape —
 * `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`, `id` панели и
 * ссылка триггера на неё по режиму — `TTooltipIdsPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины; выход `dismiss_ownerAttribute`
 * шаблон кладёт на панель.
 */
export function setupTooltip(ctrl: ITooltip | undefined, props: object): TBinding<ITooltip> {
	const adapter = createAngularAdapterContext(TooltipDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
