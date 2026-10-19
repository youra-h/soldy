import { scrollParentOf } from './scrollParent'

/** Позиционирование, от которого зависит блок отсчёта: `fixed` или `absolute`. */
export type TPositionStrategy = 'fixed' | 'absolute'

/** Точка в координатах окна. */
export type TPoint = { readonly x: number; readonly y: number }

/**
 * Значение свойства, которое делает узел блоком отсчёта и для `fixed`, и для
 * `absolute` потомков: трансформация, фильтр, сдерживание. Пустая строка —
 * свойство браузер не знает (jsdom, старый движок), и блока оно не даёт.
 */
const sets = (value: string | undefined): boolean => !!value && value !== 'none'

/**
 * Узел — блок отсчёта для потомка с `position: fixed`, а значит и с
 * `absolute`: так его делают трансформация и отдельные `translate`, `rotate`,
 * `scale`, перспектива, фильтры, сдерживание раскладки и отрисовки, контейнер
 * размера и `will-change` любого из них. Тот же список у Floating UI.
 */
function holdsFixed(style: CSSStyleDeclaration): boolean {
	return (
		sets(style.transform) ||
		sets(style.translate) ||
		sets(style.rotate) ||
		sets(style.scale) ||
		sets(style.perspective) ||
		sets(style.filter) ||
		sets(style.backdropFilter) ||
		/paint|layout|strict|content/.test(style.contain ?? '') ||
		/transform|translate|rotate|scale|perspective|filter/.test(style.willChange ?? '') ||
		(!!style.containerType && style.containerType !== 'normal')
	)
}

/**
 * Угол блока, от которого браузер отсчитывает `left`/`top` узла с этим
 * позиционированием, — в координатах окна.
 *
 * Блок — ближайший предок, который держит такие потомки: для `fixed` — только
 * трансформацией, фильтром и сдерживанием (`holdsFixed`), для `absolute` — ещё
 * и любым `position`, кроме `static`. Отсчёт идёт от края его паддинга — за
 * рамкой (`clientLeft`/`clientTop`) — и едет с его прокруткой. У корня
 * документа прокрутку не вычитаем: она — прокрутка окна, и в его
 * прямоугольнике уже учтена.
 *
 * Такого предка нет — для `fixed` это окно (`0, 0`), для `absolute` — начало
 * документа, то есть точка окна `-scrollX, -scrollY`.
 *
 * Узла ещё нет — блок не найти, и отсчёт тот же, что без предка.
 */
export function positionOriginOf(node: Element | null, strategy: TPositionStrategy): TPoint {
	for (let current = node?.parentElement ?? null; current; current = current.parentElement) {
		const style = getComputedStyle(current)

		if (!holdsFixed(style) && (strategy === 'fixed' || style.position === 'static')) continue

		const rect = current.getBoundingClientRect()
		const root = current === current.ownerDocument.documentElement

		return {
			x: rect.left + current.clientLeft - (root ? 0 : current.scrollLeft),
			y: rect.top + current.clientTop - (root ? 0 : current.scrollTop),
		}
	}

	return strategy === 'fixed' ? { x: 0, y: 0 } : { x: -window.scrollX, y: -window.scrollY }
}

/**
 * Узел стоит в окне, а не в документе: он сам или его предок —
 * `position: fixed`, или `sticky`, который липнет к окну, — у него нет
 * прокручиваемого предка (`scrollParentOf`). Прокрутка окна такой узел не
 * двигает.
 *
 * `sticky` во внутренней прокрутке с окном не стоит: окно везёт его вместе с
 * контейнером.
 */
export function isPinnedToViewport(node: Element): boolean {
	for (let current: Element | null = node; current; current = current.parentElement) {
		const position = getComputedStyle(current).position

		if (position === 'fixed') return true
		if (position === 'sticky' && !scrollParentOf(current, 'y')) return true
	}

	return false
}
