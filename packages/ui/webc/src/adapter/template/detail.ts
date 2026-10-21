/**
 * Деталь разметки — вложенный элемент soldy, которого шаблон строит сам:
 * кнопка очистки поля, иконка в ней.
 *
 * Разметка библиотеки помечает каждую свою деталь именем места (`embedded`):
 * плагин приложения со `scope: 'own'` ей не ставится (`docs/agents/setup.md`,
 * «`scope` и признак `embedded`»). В остальных адаптерах забытый признак
 * ловит сторож разметки (`setup/__tests__/embedded-markup.spec.ts`), а шаблоны
 * Web Components — код, и разметки, которую он прочёл бы, у них нет. Поэтому
 * деталь строит этот помощник, а имя места у него — обязательный параметр:
 * забытое ловят типы.
 *
 * Деталь — разметка владельца, как и элемент из данных (`createItem`): её
 * построил шаблон, и её события не всплывают — владелец слушает их на самом
 * элементе. Это метка элемента, а не `embedded` (`runtime/owner-markup.ts`):
 * помощник ставит её при создании, до вставки.
 *
 * Признак — атрибутом, как в разметке остальных адаптеров: до сборки, которая
 * его читает, — элемент ещё не в документе. Рядом с ним помощник ставит
 * статические атрибуты детали (`attributes`) — то, что в разметке остальных
 * адаптеров стоит в теге детали: кнопке — `type="button"`. У `<button>` без
 * `type` тип `submit`, и в форме клик по детали отправил бы форму, а Enter в
 * поле нажал бы её вместо отправки (`docs/agents/a11y.md`, «Третий набор:
 * `attrs`…»). Вид элемента проверяет `guard`: модуль элемента импортирует
 * шаблон, которому он нужен, и элемент обязан быть зарегистрирован. Не
 * зарегистрирован — это ошибка, а не обычный узел: шаблон писал бы ему
 * пропсы, которых у обычного узла нет.
 */

import { markOwnerMarkup } from '../runtime/owner-markup'

/** Как построить деталь: тег, имя элемента soldy, имя места и статические атрибуты. */
export type TDetailOptions = {
	/** Имя элемента soldy — значение `is`: `so-button`. */
	readonly is: string
	/** Имя места детали в разметке владельца: `input.clear`. */
	readonly embedded: string
	/** Статические атрибуты детали, как в её теге в разметке: `{ type: 'button' }`. */
	readonly attributes?: Readonly<Record<string, string>>
}

/** Деталь разметки владельца — элемент soldy с именем места (см. шапку). */
export function createDetail<T extends HTMLElement>(
	owner: Document,
	tag: string,
	{ is, embedded, attributes = {} }: TDetailOptions,
	guard: (node: Element) => node is T,
): T {
	const element = owner.createElement(tag, { is })

	if (!guard(element)) {
		throw new Error(`[soldy] <${tag} is="${is}"> не элемент soldy: модуль элемента не загружен`)
	}

	markOwnerMarkup(element)
	element.setAttribute('embedded', embedded)

	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)

	return element
}
