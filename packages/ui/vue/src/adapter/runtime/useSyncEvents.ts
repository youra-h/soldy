import type { IAccessor, TDescriptorInspector, IAccessorProp } from '@soldy/accessor'
import { collectEventBindings } from '@soldy/setup'

/**
 * Проброс событий из Core наружу через emit + поддержка v-model.
 *
 * 1. События ядра: триггеры свойств (`change:visible`) и явные события
 *    (`ready` → `element:ready`). Список дедуплицирован: один raw-триггер
 *    объявлен у нескольких пропов (см. `present` в ComponentContribution),
 *    без дедупликации потребитель получал бы два эмита на одно изменение.
 *
 * 2. `update:<prop>` для каждого записываемого свойства — то, на чём держится
 *    `v-model:text` и подобные. Значение перечитывается через accessor, а не
 *    берётся из аргумента события: у производных триггеров полезная нагрузка
 *    может не совпадать со значением свойства.
 *
 * Возвращает функцию отписки — вызывать при размонтировании, иначе на внешнем
 * `ctrl`, переживающем компонент, хендлеры копятся с каждым монтированием.
 */
export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	emit?: (event: string, ...args: any[]) => void,
): () => void {
	if (!emit) return () => {}

	const offs: Array<() => void> = []

	for (const { source, rawName, exportName } of collectEventBindings(accessor, inspector)) {
		const handler = (...args: any[]) => emit(exportName, ...args)

		source.on(rawName, handler)
		offs.push(() => source.off(rawName, handler))
	}

	for (const prop of accessor.getProps(false) as IAccessorProp[]) {
		const source = accessor.getEventSource(prop)

		if (!source) continue

		const propName = inspector.getExportPropName(prop)

		for (const rawTrigger of inspector.getRawTriggers(prop)) {
			const handler = () => emit(`update:${propName}`, accessor.getValue(prop))

			source.on(rawTrigger, handler)
			offs.push(() => source.off(rawTrigger, handler))
		}
	}

	return () => offs.forEach((off) => off())
}
