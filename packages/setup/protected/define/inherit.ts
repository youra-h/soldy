/**
 * inheritDeclarations — свои объявления поверх родительских, одним правилом на все категории.
 *
 * Правило: объявление с тем же ключом ложится на родительское и остаётся на
 * его месте, остальные встают следом. `Map.set` позицию ключа не меняет, и
 * порядок объявлений публичен — его хранят сгенерированные метаданные Angular.
 *
 * Что значит «поверх», решает само объявление (`IDeclaration.inheritFrom`), а
 * не эта функция: проп переобъявляет написанные факты, слот и плагин встают
 * целиком. Поэтому здесь нет ни ветки на категорию, ни функции извлечения
 * ключа, а новая категория объявлений приносит своё правило с собой.
 *
 * Двух объявлений с одним ключом на выходе не бывает — по ключу их ровно одно.
 * Столкновение разных источников (проп компонента и проп плагина) этим не
 * прячется: у них разные списки, и сводит их дескриптор (`getProps`), сообщая
 * о дубле.
 */

import type { IDeclaration } from './types'

export function inheritDeclarations<T extends IDeclaration<T>>(
	parent: readonly T[],
	own: readonly T[],
): T[] {
	const byKey = new Map<unknown, T>()

	for (const declaration of [...parent, ...own]) {
		const base = byKey.get(declaration.key)

		byKey.set(declaration.key, base ? declaration.inheritFrom(base) : declaration)
	}

	return [...byKey.values()]
}
