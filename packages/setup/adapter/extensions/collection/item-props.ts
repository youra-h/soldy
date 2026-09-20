/**
 * Входные пропсы элемента коллекции, объявленные его дескриптором, — для `meta` движка.
 */

import type { TPropSpec } from '../../../define'

/**
 * Собрать значения входных (не protected) пропсов, объявленных в `decls`,
 * из набора `props`. Ключ результата — сырое имя пропса (`decl.name.name`).
 *
 * Потребитель один — `TCollectionItemExtension`, поэтому наружу пакета функция
 * не выходит: разметка передала элементу `active`/`selected`, и расширение
 * кладёт их в `meta` движка, где состав элемента и живёт.
 */
export function collectItemProps(
	decls: readonly TPropSpec[],
	props: object,
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const decl of decls) {
		if (decl.protected) continue

		const value: unknown = Reflect.get(props, decl.name.name)

		if (value !== undefined) result[decl.name.name] = value
	}

	return result
}
