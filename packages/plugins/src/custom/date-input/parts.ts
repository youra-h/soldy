import type { IDateInput, TDatePart } from '@soldy-ui/core'
import type { TDateInputSegmentNode } from './types'

/**
 * Узлы поля даты — один поиск на три плагина поля: клавиши, указатель и буфер
 * обмена находят части, ряд и выделение одинаково.
 *
 * Части находят по классам владельца (`classes.resolve`), а не строкой в
 * плагине, и только внутри его корня; тип части — из её `data-type`, который
 * разметке отдало ядро.
 */

/**
 * Типы частей — словарём по типу, а не списком: появится у ядра новая часть
 * (`hour`), и словарь без неё не скомпилируется.
 */
const PARTS: Readonly<Record<TDatePart, true>> = { day: true, month: true, year: true }

/** Ряд частей поля — `__segments` в корне. */
export function rowOf(owner: IDateInput, root: Element): Element | null {
	return root.querySelector(owner.classes.resolve('__segments', { point: true }))
}

/** Часть поля, в узле которой лежит `target`; не часть этого поля — `undefined`. */
export function segmentOf(
	owner: IDateInput,
	root: Element,
	target: EventTarget | null,
): TDateInputSegmentNode | undefined {
	if (!(target instanceof Element)) return undefined

	const element = target.closest(owner.classes.resolve('__segment', { point: true }))
	const part = element?.getAttribute('data-type')

	if (!element || !root.contains(element) || !isDatePart(part)) return undefined

	return { part, element }
}

/** Части ряда по порядку документа. */
export function segmentsOf(owner: IDateInput, root: Element): TDateInputSegmentNode[] {
	const elements = root.querySelectorAll(owner.classes.resolve('__segment', { point: true }))

	return [...elements].flatMap((element) => {
		const part = element.getAttribute('data-type')

		return isDatePart(part) ? [{ part, element }] : []
	})
}

/** Узел части по её типу. */
export function segmentElementOf(
	owner: IDateInput,
	root: Element,
	part: TDatePart,
): Element | undefined {
	return segmentsOf(owner, root).find((node) => node.part === part)?.element
}

/**
 * Выделение документа в ряду: непустой диапазон, оба конца которого в ряду.
 * Выделение шире ряда или вне его — не поля: `null`.
 */
export function rowSelection(row: Element): Range | null {
	const selection = row.ownerDocument.getSelection()

	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

	const range = selection.getRangeAt(0)

	return row.contains(range.startContainer) && row.contains(range.endContainer) ? range : null
}

/**
 * Части, у которых выделение задело хотя бы один знак. Край выделения ровно на
 * границе части её не задевает: протяжка до начала года год не выделила.
 */
export function touchedSegments(
	nodes: readonly TDateInputSegmentNode[],
	range: Range,
): TDatePart[] {
	return nodes.filter(({ element }) => touches(range, element)).map(({ part }) => part)
}

/**
 * Текст диапазона — текст его узлов подряд. Не `Selection#toString()`: тот
 * собирает текст по раскладке, и Chrome ставит перевод строки между
 * флекс-коробками частей (`12\n.\n05`), а Firefox — нет.
 */
export function rangeText(range: Range): string {
	return range.cloneContents().textContent ?? ''
}

/** Выделить весь ряд: диапазон по его содержимому. */
export function selectRow(row: Element): void {
	const selection = row.ownerDocument.getSelection()
	const range = row.ownerDocument.createRange()

	range.selectNodeContents(row)
	selection?.removeAllRanges()
	selection?.addRange(range)
}

/** Снять выделение документа, если оно в ряду: правка его уже исполнила. */
export function collapseRowSelection(row: Element): void {
	if (rowSelection(row)) row.ownerDocument.getSelection()?.removeAllRanges()
}

/** Тип части из `data-type` узла. */
function isDatePart(value: unknown): value is TDatePart {
	return typeof value === 'string' && Object.hasOwn(PARTS, value)
}

/** Задело ли выделение знаки узла: пересечение диапазонов не пусто. */
function touches(range: Range, element: Element): boolean {
	const overlap = element.ownerDocument.createRange()

	overlap.selectNodeContents(element)

	if (range.compareBoundaryPoints(Range.START_TO_START, overlap) > 0) {
		overlap.setStart(range.startContainer, range.startOffset)
	}

	if (range.compareBoundaryPoints(Range.END_TO_END, overlap) < 0) {
		overlap.setEnd(range.endContainer, range.endOffset)
	}

	return overlap.toString() !== ''
}
