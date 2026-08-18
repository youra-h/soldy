/**
 * useVueCollectionItem — реактивная привязка item-адаптеров к Vue.
 *
 * Аналог useVueCollection, но для дочернего элемента коллекции (TabItem).
 * Возвращает context (TItemContext) — аналог ctrl в useVue, для прямого доступа в шаблоне.
 */

import { onUnmounted } from 'vue'
import type { TCollectionItemContextExtension } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export function useVueCollectionItem(
	itemExt: TCollectionItemContextExtension | undefined,
	props: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	if (!itemExt?.accessor) return {}

	const inspector = createInspector(itemExt.accessor)
	const { refs, bindOutput, bindInput } = useSyncProps(itemExt.accessor, inspector)

	bindOutput()
	bindInput(props)
	useSyncEvents(itemExt.accessor, inspector, emit)

	return {
		context: itemExt.itemContext,  // TItemContext — как ctrl в useVue
		...refs,
	}
}
