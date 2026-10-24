import type { TTagsCollection } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'
import { tabStops } from '../../utils'

/**
 * Узел опции внутри узла тега. Корень элемента — пилюля для темы, а опцией со
 * своей ролью является вложенная строка: на неё и уходит фокус.
 */
const OPTION_SELECTOR = '[role="option"]'

/**
 * Строка тега с ролью опции — узел, на который уходит фокус тега, пока у
 * набора включён выбор. `null` — элемента нет в документе.
 *
 * Одна на клавиатуру Tags (куда перевести фокус стрелкой) и фокус набора
 * (`tagStopOf`): строку тега оба ищут одним правилом.
 */
export function tagOf(elements: TCollectionElements | null, uid: string | number): Element | null {
	return elements?.getElementByUid(uid)?.querySelector(OPTION_SELECTOR) ?? null
}

/**
 * Остановка тега в его узле — узел фокуса `Tags.Item` (`focusTarget` плагина
 * действия): запись `focused = true` ставит фокус туда же, куда ведёт Tab, а
 * не на корень — пилюлю для темы, которая фокус не держит.
 *
 * С выбором — строка с ролью опции, тем же правилом, что `tagOf`: по тегам
 * ходят стрелки, и строка — опция, даже когда остановка набора не у неё. Без
 * выбора у строки нет ни роли опции, ни `tabindex` — она `listitem` без
 * действия, — и остановка тега — первая в его узле, крестик.
 *
 * `null` — узла нет, или в нём нет ни опции, ни остановки: тег без выбора не
 * закрывается.
 */
export function tagStopIn(node: Element | null): Element | null {
	if (!node) return null

	return node.querySelector(OPTION_SELECTOR) ?? tabStops(node)[0] ?? null
}

/**
 * Остановка набора тегов — узел фокуса Tags (`focusTarget` плагина действия):
 * запись `focused = true` ставит фокус туда же, куда ведёт Tab.
 *
 * С выбором набор — одна остановка (roving tabindex), тег-остановка
 * (`tabStop` расширения тегов). Он берётся по модели, а не по
 * `[tabindex="0"]`: в такте смены остановки разметка ещё старая. Без выбора
 * остановки у строк нет, и у модели — тоже: остановки набора — крестики, и
 * фокус встаёт на первую из них — остановку первого тега, у которого она
 * есть (`tagStopIn`, то же правило, что у `Tags.Item`), по тегам в порядке
 * показа, на которые можно перейти (`isEnabledTag`, то же правило, что у
 * остановки с выбором).
 *
 * `null` — остановок у набора нет (теги не закрываются, или на них нельзя
 * перейти) или узла тега нет в документе.
 */
export function tagStopOf(_root: Element, ctx: IPluginContext): Element | null {
	const elements = ctx.get(TCollectionElements) ?? null
	// Движок приходит к плагинам без типа, как `engine:bound` клавиатуре тегов
	const engine: TTagsCollection | null = elements?.engine ?? null

	if (!engine) return null

	const { batch, tags } = engine.extensions
	const stop = tags.tabStop

	if (stop) return tagOf(elements, stop.uid)

	for (const tag of batch.shown) {
		const first = tags.isEnabledTag(tag)
			? tagStopIn(elements?.getElementByItem(tag) ?? null)
			: null

		if (first) return first
	}

	return null
}
