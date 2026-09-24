/**
 * Пометки «спрятано от скринридера» со счётчиком на узел.
 *
 * Модальных слоёв бывает несколько — окно, из него второе окно, — и каждый
 * прячет фон сам. Узел страницы под обоими помечен дважды, и закрытие
 * верхнего не должно открыть его, пока нижний ещё открыт. Флагом у плагина
 * этого не выразить: плагин, снимая свою пометку, затёр бы чужую. Поэтому
 * пометка у узла одна на всех, у неё счётчик, и `aria-hidden` возвращается,
 * когда её снял последний.
 *
 * Возвращается **то значение, что было до первой пометки**, а не пустое:
 * `aria-hidden` страница могла поставить и сама — в том числе `"false"`.
 *
 * Тот же приём, что у замка прокрутки (`../scroll-lock/lock.ts`).
 */

const ATTRIBUTE = 'aria-hidden'

type TMark = {
	/** Сколько слоёв держат пометку. */
	count: number
	/** `aria-hidden` до первой пометки; `null` — атрибута не было. */
	value: string | null
}

const MARKS = new WeakMap<Element, TMark>()

/** Спрятать узел. Первая пометка пишет атрибут, остальные считаются. */
export function markHidden(node: Element): void {
	const mark = MARKS.get(node)

	if (mark) {
		mark.count += 1

		return
	}

	MARKS.set(node, { count: 1, value: node.getAttribute(ATTRIBUTE) })
	node.setAttribute(ATTRIBUTE, 'true')
}

/** Снять пометку. Атрибут вернётся, когда её снимет последний слой. */
export function unmarkHidden(node: Element): void {
	const mark = MARKS.get(node)

	if (!mark) return

	mark.count -= 1

	if (mark.count > 0) return

	MARKS.delete(node)

	if (mark.value === null) {
		node.removeAttribute(ATTRIBUTE)
	} else {
		node.setAttribute(ATTRIBUTE, mark.value)
	}
}
