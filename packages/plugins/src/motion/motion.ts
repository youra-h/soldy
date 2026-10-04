import type { TMotionMode } from './types'

/**
 * Режим движения — атрибут на корне документа, и это единственный его
 * источник: атрибут читают CSS темы (селектором) и плагины (`smoothScrollBehavior`
 * ниже), копии режима в JS нет. Значения — `full` и `reduce`; нет атрибута —
 * `system`. Без атрибута идут и серверная разметка, и кадры до старта
 * приложения: и CSS, и плагины берут тогда настройку системы.
 */
const ATTRIBUTE = 'data-s-motion'

/** Медиазапрос настройки системы: пользователь просит меньше движения. */
const SYSTEM_REDUCE = '(prefers-reduced-motion: reduce)'

/**
 * Режим, который приложение задало поверх системы, → убрано ли движение. Чего
 * в таблице нет (атрибута нет вовсе), решает система.
 */
const FORCED: ReadonlyMap<string, boolean> = new Map([
	['full', false],
	['reduce', true],
])

/**
 * Задать режим движения библиотеки — на всё приложение, как тему (`useTheme`)
 * и пакет иконок (`setIcons`): зовут в точке входа.
 *
 * ```ts
 * useMotion('full') // движение и тогда, когда система просит его убрать
 * ```
 *
 * Режим пишется атрибутом `data-s-motion` на корень документа: `full` и
 * `reduce` — как есть, `system` атрибут снимает. Сменить режим можно в любой
 * момент: CSS видит атрибут сам, плагины читают его в момент операции.
 *
 * Без документа (серверная отрисовка) вызов ничего не делает. Серверной
 * разметке, которой нужен свой режим до старта приложения, атрибут ставит
 * само приложение — в шаблоне страницы.
 */
export function useMotion(mode: TMotionMode): void {
	if (typeof document === 'undefined') return

	const root = document.documentElement

	if (mode === 'system') root.removeAttribute(ATTRIBUTE)
	else root.setAttribute(ATTRIBUTE, mode)
}

/**
 * Убрано ли движение для узла: режим приложения на корне его документа, а без
 * него — настройка системы у его окна. Документ и окно — узла, а не
 * глобальные: компонент живёт и в `iframe`.
 *
 * Среда без `matchMedia` (jsdom) о движении не просит.
 */
function isMotionReduced(element: Element): boolean {
	const { documentElement, defaultView } = element.ownerDocument
	const forced = FORCED.get(documentElement.getAttribute(ATTRIBUTE) ?? '')

	return forced ?? systemReduces(defaultView)
}

/** Просит ли система окна меньше движения. */
function systemReduces(view: Window | null): boolean {
	return typeof view?.matchMedia === 'function' && view.matchMedia(SYSTEM_REDUCE).matches
}

/**
 * Как прокручивать узел, когда просят плавно: плавно, если движение не
 * убрано, иначе сразу.
 *
 * Плавная прокрутка — движение, и режим решает её здесь, а не плагин: без
 * этой функции у каждого плагина был бы свой опрос среды, и режим приложения
 * до него не доходил бы. Режим читается в момент прокрутки, поэтому подписки
 * на его смену у плагинов нет.
 */
export function smoothScrollBehavior(element: Element): ScrollBehavior {
	return isMotionReduced(element) ? 'instant' : 'smooth'
}
