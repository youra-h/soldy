import { ScrollerDescriptor } from '@soldy-ui/setup'
import type { IScroller } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupScroller — setup-слой Scroller: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: края ленты и её листание — `TScrollerViewportPlugin`,
 * выключенность кнопок и `tabindex` вьюпорта — ядро, имена кнопок — плагин
 * имён по локали поддерева. Разметка раскладывает то, что они отдали.
 */
export function setupScroller(ctrl: IScroller | undefined, props: object): TBinding<IScroller> {
	const adapter = createAngularAdapterContext(ScrollerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
