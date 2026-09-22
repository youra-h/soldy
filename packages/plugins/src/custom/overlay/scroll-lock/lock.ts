/**
 * Замок прокрутки документа со счётчиком слоёв.
 *
 * Слоёв поверх страницы бывает несколько — диалог, из него выезжающая
 * панель, — и каждый запирает прокрутку сам. Считать это флагом нельзя:
 * закрытие верхнего слоя вернуло бы прокрутку, пока нижний ещё открыт.
 * Поэтому замок один на документ, у него счётчик, и стиль документа
 * возвращается ровно тогда, когда его отпустил последний.
 *
 * Возвращаются **инлайновые** значения, которые были до замка: страница
 * могла задать `overflow` и своими правилами, и инлайном, а вернуть надо то,
 * что мы перебили.
 */

/** Инлайновое значение, которое замок перебил и вернёт при отпирании. */
type TStyleEntry = {
	style: CSSStyleDeclaration
	property: string
	value: string
}

type TDocumentLock = {
	/** Сколько слоёв держат замок. */
	count: number
	restore: TStyleEntry[]
}

const LOCKS = new WeakMap<Document, TDocumentLock>()

/** Запереть прокрутку документа. Первый вызов запирает, остальные считаются. */
export function lockScroll(doc: Document): void {
	const lock = LOCKS.get(doc)

	if (lock) {
		lock.count += 1

		return
	}

	LOCKS.set(doc, { count: 1, restore: applyLock(doc) })
}

/** Отпустить замок. Прокрутка вернётся, когда его отпустит последний слой. */
export function unlockScroll(doc: Document): void {
	const lock = LOCKS.get(doc)

	if (!lock) return

	lock.count -= 1

	if (lock.count > 0) return

	LOCKS.delete(doc)

	for (const entry of lock.restore) restoreStyle(entry)
}

/**
 * Запирает прокрутку и отдаёт то, что перебил.
 *
 * `overflow: hidden` ставится и на `html`, и на `body`: какой из них
 * прокручивает страницу, решает сама страница. По спецификации `overflow`
 * с `body` доходит до области просмотра, только пока у `html` он `visible`,
 * — а `html { overflow-y: scroll }` ставят как раз затем, чтобы страница не
 * дёргалась. Заперев только один из двух, замок молча не сработал бы.
 */
function applyLock(doc: Document): TStyleEntry[] {
	const root = doc.documentElement
	const body = doc.body
	const gap = scrollbarGap(doc)
	const restore = [takeStyle(root.style, 'overflow'), takeStyle(body.style, 'overflow')]

	root.style.setProperty('overflow', 'hidden')
	body.style.setProperty('overflow', 'hidden')

	if (gap > 0) {
		restore.push(takeStyle(body.style, 'padding-inline-end'))
		body.style.setProperty('padding-inline-end', `${paddingEnd(body) + gap}px`)
	}

	return restore
}

/**
 * Ширина полосы прокрутки — разница между окном и областью просмотра
 * документа. Без неё страница дёргается на ширину полосы, едва прокрутку
 * заперли.
 *
 * Компенсация — `padding-inline-end`, а не `padding-right`: полоса прокрутки
 * области просмотра стоит на той стороне, куда смотрит направление корня, и
 * в RTL это левый край — ровно то, что значит `inline-end`.
 *
 * Область просмотра нулевой ширины значит, что раскладки нет вовсе:
 * компенсировать нечего.
 */
function scrollbarGap(doc: Document): number {
	const view = doc.defaultView
	const width = doc.documentElement.clientWidth

	if (!view || width <= 0) return 0

	const gap = view.innerWidth - width

	return gap > 0 ? gap : 0
}

/** Отступ, который уже есть у элемента, — к нему прибавляется компенсация. */
function paddingEnd(element: Element): number {
	const view = element.ownerDocument.defaultView
	const parsed = Number.parseFloat(view?.getComputedStyle(element).paddingInlineEnd ?? '')

	return Number.isFinite(parsed) ? parsed : 0
}

function takeStyle(style: CSSStyleDeclaration, property: string): TStyleEntry {
	return { style, property, value: style.getPropertyValue(property) }
}

function restoreStyle({ style, property, value }: TStyleEntry): void {
	if (value === '') {
		style.removeProperty(property)
	} else {
		style.setProperty(property, value)
	}
}
