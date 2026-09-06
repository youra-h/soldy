/**
 * useSyncEvents — проброс событий из Core в CustomEvent на хост-элементе.
 *
 * Список подписок дедуплицирован (см. collectEventBindings): один raw-триггер
 * объявлен у нескольких пропов, без дедупликации `change:visible` диспатчился
 * бы дважды на одно изменение.
 *
 * Payload кладётся в `detail`: один аргумент — как есть, несколько — массивом.
 * `bubbles` + `composed` — чтобы событие было слышно снаружи и пересекало
 * границу shadow root'а, если элемент положат внутрь чужого компонента.
 */

import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	host: HTMLElement,
): () => void {
	const offs: Array<() => void> = []

	for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
		const handler = (...args: any[]) => {
			host.dispatchEvent(
				new CustomEvent(exportName, {
					detail: args.length > 1 ? args : args[0],
					bubbles: true,
					composed: true,
				}),
			)
		}

		source.on(rawName, handler)
		offs.push(() => source.off(rawName, handler))
	}

	return () => offs.forEach((off) => off())
}
