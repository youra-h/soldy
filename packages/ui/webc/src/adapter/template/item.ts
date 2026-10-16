/**
 * Элемент коллекции из данных — то, что шаблон владельца строит в петле по
 * ключу (`TKeyedLoop`): элемент soldy своей части (`<div is="so-tabs-item">`) с
 * инстансом данных (`ctrl`) и копиями образцов `item-*` владельца.
 *
 * Деталью он не является: элементы своей коллекции признака `embedded` не
 * несут (`docs/agents/setup.md`, «`scope` и признак `embedded`»), и плагин
 * приложения на элементы ставится, как на элементы разметки. Вид элемента
 * проверяет `guard`, как у детали (`createDetail`): модуль владельца
 * регистрирует свои части, и незарегистрированная часть — ошибка, а не
 * обычный узел.
 *
 * Слоты элемента из данных владелец берёт у себя: его слот `item-<слот>` — тот
 * же слот элемента (таблица — `setup/__tests__/item-slots.spec.ts`). Scope у
 * слотов Web Components нет, поэтому образец — общий на все элементы, и каждый
 * получает свою копию — назначением в свой слот (`lend`), вместе с текстом.
 * Данные элемента копия берёт у него самого (`el.ctrl`).
 */

import { lend } from './lend'
import type { ITemplateContext } from './types'

/** Карта копий образцов: слот владельца (`item-leading`) → слот элемента (`leading`). */
export type TItemSlots = Readonly<Record<string, string>>

/** Элемент коллекции из данных — без `embedded`, вид проверяет `guard` (см. шапку). */
export function createItem<T extends HTMLElement>(
	owner: Document,
	tag: string,
	is: string,
	guard: (node: Element) => node is T,
): T {
	const element = owner.createElement(tag, { is })

	if (!guard(element)) {
		throw new Error(`[soldy] <${tag} is="${is}"> не элемент soldy: модуль части не загружен`)
	}

	return element
}

/**
 * Копии образцов владельца — в элемент из данных, по карте слотов: каждая в
 * свой слот элемента. Образца нет — слот элемента не задан, и элемент рисует
 * своё: текст, иконку крестика, стрелку.
 */
export function lendSamples(
	ctx: Pick<ITemplateContext, 'sample'>,
	element: Element,
	slots: TItemSlots,
): void {
	for (const [from, to] of Object.entries(slots)) {
		const copy = ctx.sample(from)

		if (copy) lend(element, to, copy)
	}
}
