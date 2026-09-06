/**
 * bindEvents — проброс событий из Core в Angular EventEmitter'ы.
 *
 * Список подписок дедуплицирован (см. collectEventBindings): один raw-триггер
 * объявлен у нескольких пропов, без дедупликации `changeVisible` эмитился бы
 * дважды на одно изменение.
 */

import type { EventEmitter } from '@angular/core'
import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

export function bindEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	outputs: Record<string, EventEmitter<any>>,
): () => void {
	const offs: Array<() => void> = []

	for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
		const emitter = outputs[exportName]

		if (!emitter) continue

		const handler = (...args: any[]) => emitter.emit(args[0])

		source.on(rawName, handler)
		offs.push(() => source.off(rawName, handler))
	}

	return () => offs.forEach((off) => off())
}
