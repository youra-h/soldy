/**
 * useSetupScroller — setup-слой Scroller (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ScrollerDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: края ленты и её листание — `TScrollerViewportPlugin`,
 * выключенность кнопок и `tabindex` вьюпорта — ядро, имена кнопок — плагин
 * имён. Разметка раскладывает то, что они отдали.
 */

import { ScrollerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ScrollerProps } from './base.component'

export function useSetupScroller(props: ScrollerProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ScrollerDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
