/**
 * Начальные значения пропсов — один раз, при сборке компонента.
 *
 * Пропсы фреймворк отдаёт в сборку при создании контекста, во всех шести
 * адаптерах. Здесь они и применяются, для любого инстанса одинаково:
 *
 * - свой инстанс получил пропсы ядра конструктором (`new ctor(props)`) — их
 *   второй раз не пишем: сеттер коллекции `items` пересоздал бы элементы;
 * - внешний `ctrl` собран без этих пропсов — пишем в него;
 * - плагины создаются после инстанса и пропсов не видят — пишем в них.
 *
 * Пишется только то, что отличается от умолчания декларации. Проп, равный
 * умолчанию, ничего не задаёт: так внешний `ctrl` сохраняет своё состояние,
 * даже если фреймворк подставил умолчание за автора (Vue делает это с каждым
 * пропом, у которого объявлен `default`).
 *
 * Запись идёт сеттером через аксессор, как любая другая: сеттер сам эмитит
 * триггер. Фреймворк берёт начальное состояние снимком после сборки, дальше
 * его обновляют только триггеры — второй стартовой записи из адаптера нет.
 *
 * Имена — те же, что у поверхности: `aria_label` во всех фреймворках, и сырое
 * `label` для headless-кода и тестов.
 */

import type { IPropDeclaration } from '@soldy/accessor'
import { underscorePropNaming } from '../naming'
import type { IInitialPropsTarget } from './types'

/** Значение пропа по имени фреймворка, а без него — по сырому имени. */
function readProp(props: object, declaration: Pick<IPropDeclaration, 'name'>): unknown {
	return (
		Reflect.get(props, underscorePropNaming(declaration.name)) ??
		Reflect.get(props, declaration.name.name)
	)
}

export function applyInitialProps(target: IInitialPropsTarget, props: object | undefined): void {
	if (!props) return

	const declarations = new Map(
		target.declarations.map((declaration) => [declaration.name.getName(), declaration]),
	)

	for (const prop of target.accessor.getProps()) {
		const own = prop.instance === target.instance

		if (own ? target.constructed : !target.ownsBundle) continue

		const declaration = declarations.get(prop.name.getName())

		if (!declaration) continue

		const value = readProp(props, declaration)

		if (value === undefined) continue
		if (Object.hasOwn(declaration, 'default') && Object.is(value, declaration.default)) continue
		if (Object.is(target.accessor.getValue(prop), value)) continue

		target.accessor.setValue(prop, value)
	}
}
