/**
 * setupScroller — setup-слой Scroller.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней плагин имён пишет имена
 * кнопок) и связывает его с элементом через useAdapter. Логики здесь нет:
 * края ленты, её листание и клики по кнопкам — `TScrollerViewportPlugin`,
 * выключенность кнопок и `tabindex` вьюпорта — ядро. На корень классы и наборы
 * кладёт база элемента, а кнопки и вьюпорт ведёт шаблон.
 */

import { ScrollerDescriptor } from '@soldy-ui/setup'
import type { IScroller } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupScroller(
	host: HTMLElement,
	ctrl: IScroller | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IScroller> {
	const adapter = createWebcAdapterContext(host, ScrollerDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
