/**
 * useSyncEvents — проброс событий из Core в колбэк-пропы Svelte (`onXxx`).
 *
 * Список подписок дедуплицирован (см. collectEventBindings): один raw-триггер
 * объявлен у нескольких пропов, без дедупликации `onChangeVisible` вызывался
 * бы дважды на одно изменение.
 *
 * Принимает геттер props, а не сам объект: колбэк должен вызываться всегда
 * актуальный, а подписка при этом создаётся один раз.
 *
 * Возвращает функцию отписки — вызывать при уничтожении компонента.
 */

import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	getProps: () => Record<string, any>,
): () => void {
	const offs: Array<() => void> = []

	for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
		const handler = (...args: any[]) => {
			getProps()[exportName]?.(...args)
		}

		source.on(rawName, handler)
		offs.push(() => source.off(rawName, handler))
	}

	return () => offs.forEach((off) => off())
}
