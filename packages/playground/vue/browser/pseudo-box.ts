/**
 * Коробка псевдоэлемента на экране — общее для спеков, которые меряют то, что
 * тема рисует псевдоэлементом без своего узла: карточку активного таба у
 * `view="contained"` (`tabs-contained.spec.ts`, `tabs-close.spec.ts`) и полосу
 * под ним у вида по умолчанию (`tabs-line.spec.ts`).
 *
 * `getBoundingClientRect()` есть только у узла, коробку псевдоэлемента браузер
 * не отдаёт. Она собирается из вычисленного стиля: место (`left`, `top`),
 * сдвиг (`transform`) и размеры — у положенного абсолютно браузер отдаёт их
 * использованными значениями, в пикселях. Отсчёт — паддинг-бокс узла, поэтому
 * годится только псевдоэлемент с `position: absolute`, чей содержащий блок —
 * сам узел: узел позиционирован и не прокручен.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча мерил
 * бы карточку иначе.
 */

/** Коробка псевдоэлемента узла в координатах окна. */
export function pseudoBox(element: HTMLElement, pseudo: '::before' | '::after'): DOMRect {
	const style = getComputedStyle(element, pseudo)

	if (style.content === 'none') throw new Error(`${pseudo}: псевдоэлемента нет`)
	if (style.position !== 'absolute') throw new Error(`${pseudo}: положен не абсолютно`)

	const shift = new DOMMatrixReadOnly(style.transform)
	const bounds = element.getBoundingClientRect()

	return new DOMRect(
		bounds.left + element.clientLeft + parseFloat(style.left) + shift.e,
		bounds.top + element.clientTop + parseFloat(style.top) + shift.f,
		parseFloat(style.width),
		parseFloat(style.height),
	)
}
