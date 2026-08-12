/**
 * useVueCollection — реактивная привязка коллекции к Vue.
 *
 * Аналог useVue, но для ICollectionAdapterContext.
 * Переиспользует useSyncProps / useSyncEvents — TCollectionAccessor
 * имеет тот же публичный API, что и TComponentAccessor.
 *
 * Возвращает только refs (items, activeItem, ...) — без ctrl/plugins/rootElement.
 */

import { onUnmounted } from 'vue'
import type { ICollectionAdapterContext } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export function useVueCollection(
	colCtx: ICollectionAdapterContext,
	props: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const inspector = createInspector(colCtx.accessor)

	const { refs, bindOutput, bindInput } = useSyncProps(colCtx.accessor, inspector)

	bindOutput()
	bindInput(props)

	useSyncEvents(colCtx.accessor, inspector, emit)

	onUnmounted(() => colCtx.destroy())

	return refs
}
