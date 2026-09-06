/**
 * useSyncEvents — проброс событий из Core в колбэк-пропы Solid (`onXxx`).
 *
 * Список подписок дедуплицирован (см. collectEventBindings): один raw-триггер
 * объявлен у нескольких пропов, без дедупликации `onChangeVisible` вызывался
 * бы дважды на одно изменение.
 *
 * Props в Solid — объект геттеров, поэтому подписка создаётся один раз, а
 * колбэк читается в момент события и всегда актуален. Обёртки вроде
 * propsRef из React здесь не нужны.
 *
 * Возвращает функцию отписки — вешать через onCleanup.
 */

import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	props: Record<string, any>,
): () => void {
	const offs: Array<() => void> = []

	for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
		const handler = (...args: any[]) => {
			props[exportName]?.(...args)
		}

		source.on(rawName, handler)
		offs.push(() => source.off(rawName, handler))
	}

	return () => offs.forEach((off) => off())
}
