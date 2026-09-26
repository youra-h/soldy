import type { IScroller, TScrollerDirection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { itemOf, scrollWindowOf, tabStops } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import { resolveEdges } from './edges'
import { resolveFocusShift } from './focus'
import type { TScrollerViewportPluginEvents } from './types'

/**
 * TScrollerViewportPlugin — вьюпорт ленты: замер краёв, само листание и
 * доводка элемента под фокусом в окно снапа.
 *
 * Плагин, а не расширение или разметка: и то, и другое здесь — операции над
 * DOM. Где сейчас лента, сколько у неё содержимого и есть ли внутри свои
 * остановки Tab, знает только живой узел; результат уходит в ядро одним
 * вызовом (`IScroller.notifyViewport`) — тем же приёмом, каким замер ряда
 * тегов сообщает `notifyFit`.
 *
 * Клики по кнопкам плагин ловит сам, слушателем на корне, и зовёт команды
 * ядра (приём `TSelectPointerPlugin` → `owner.toggleOpen()`). В разметке
 * обработчиков нет: связка «нажали ⇄ листаем» повторялась бы в каждом из
 * шести адаптеров.
 *
 * Поводов пересчитать четыре — размер вьюпорта, размер его детей, смена
 * состава и прокрутка, — и все они сводятся в **один проход раз в кадр**.
 * Писать в DOM прямо из колбэка наблюдателя нельзя: петля
 * `ResizeObserver loop completed with undelivered notifications` роняет
 * браузерный прогон (сторож `playground/vue/browser/setup.ts`).
 *
 * **Фокус.** Элемент под фокусом браузер докручивает, только если тот целиком
 * ушёл из окна снапа, а частично видимый оставляет на месте — у края, под
 * подсказкой темы. Поэтому по `focusin` плагин доводит элемент в окно сам
 * (счёт — `resolveFocusShift`). Окно — паддинг-бокс вьюпорта без
 * `scroll-padding`: ширину подсказки знает только тема, и она же делает окно
 * чистой частью ленты. Замер окна и доводка без снапа — общие с рядом тегов
 * `scroll` (`scrollWindowOf`, `nearestShift`). Три решения:
 * - только фокус с клавиатуры (`:focus-visible`). Фокус от нажатия мышью
 *   браузер сам не докручивает, и правильно: сдвинься лента между нажатием и
 *   отпусканием, под указателем оказался бы другой элемент, и `click` не
 *   дошёл бы;
 * - сдвиг синхронный, прямо в обработчике, и мгновенный (`instant`). Фокус
 *   браузер докручивает и сам, тоже мгновенно: после `focus()` — сразу за
 *   `focusin`, и плавную анимацию он бы перебил, а после нашего сдвига ему уже
 *   нечего делать. При переходе Tab он докручивает ещё до `focusin`, и
 *   элемент, целиком ушедший из окна, плагин застаёт уже в окне;
 * - в окно встаёт элемент ленты (прямой ребёнок вьюпорта), а не только
 *   элемент под фокусом: не шире окна — целиком, к своей точке снапа; шире —
 *   к ближайшей точке, где он накрывает окно, а элемент под фокусом в окне.
 *   Элемент — потому что снап выравнивает элементы, а не их части: докрутку
 *   до конца окна (фокусом браузера или чужим `scrollIntoView`) он вернул бы
 *   к соседней точке, и элемент остался бы у края, — а крестик тега без
 *   подписи не скажет, какой тег он закроет. Точка — потому что снап
 *   действует и на программную прокрутку; ближайшая — потому что с одним
 *   «начало к началу» крестик в конце длинного тега остался бы за краем.
 */
export class TScrollerViewportPlugin extends TBasePlugin<IScroller, TScrollerViewportPluginEvents> {
	private _owner: IScroller | null = null
	private _root: Element | null = null
	private _viewport: Element | null = null
	private _resize: ResizeObserver | null = null
	private _mutation: MutationObserver | null = null
	private _frame: number | null = null

	/**
	 * Узлы под наблюдением размера — вьюпорт и его прямые дети.
	 *
	 * Список, а не «отключить и наблюдать заново каждый проход»: свежая
	 * подписка `ResizeObserver` сразу шлёт уведомление, и переподписка на
	 * каждом проходе гоняла бы проход по кругу кадр за кадром. Здесь новый
	 * узел даёт одно лишнее уведомление, а следующий проход состава уже не
	 * меняет.
	 */
	private readonly _observed = new Set<Element>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IScroller>() ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._bind(node))
		element?.events.on('removed', () => this._bind(null))

		this._listenTo(this._owner?.events, 'scroll:request', (direction: TScrollerDirection) =>
			this._scroll(direction),
		)
	}

	override destroy(): void {
		this._unlisten()
		this._disconnect()
		this._cancel()

		this._resize?.disconnect()
		this._resize = null
		this._mutation = null

		this._root = null
		this._viewport = null
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — вместе с ним переезжают вьюпорт, слушатели и наблюдатели. */
	private _bind(root: Element | null): void {
		this._unlisten()
		this._disconnect()
		this._cancel()

		this._root = root
		this._viewport = root?.querySelector(this._selector('__viewport')) ?? null

		this._listen()

		if (this._viewport) this._schedule()
	}

	private _listen(): void {
		const root: IDomEventTarget | null = this._root
		const viewport: IDomEventTarget | null = this._viewport

		root?.addEventListener('click', this._onClick)

		// `scrollend` в одиночку не годится: он не приходит вовсе, когда
		// положение не изменилось, — а нам нужен пересчёт и тогда. Поток
		// `scroll` гасится кадром, как и остальные поводы
		viewport?.addEventListener('scroll', this._onSchedule)
		viewport?.addEventListener('focusin', this._onFocusIn)

		if (this._viewport) {
			this._mutation ??= new MutationObserver(this._onSchedule)
			// `subtree`: содержимое ленты произвольно, и новый элемент
			// появляется не только прямым ребёнком вьюпорта
			this._mutation.observe(this._viewport, { childList: true, subtree: true })
		}
	}

	private _unlisten(): void {
		const root: IDomEventTarget | null = this._root
		const viewport: IDomEventTarget | null = this._viewport

		root?.removeEventListener('click', this._onClick)
		viewport?.removeEventListener('scroll', this._onSchedule)
		viewport?.removeEventListener('focusin', this._onFocusIn)

		this._mutation?.disconnect()
	}

	/** Снимает наблюдение размеров: узлы старого корня нас больше не касаются. */
	private _disconnect(): void {
		for (const node of this._observed) this._resize?.unobserve(node)

		this._observed.clear()
	}

	/** Проход — раз в кадр: подряд идущие поводы схлопываются в один замер. */
	private readonly _onSchedule = (): void => this._schedule()

	private _schedule(): void {
		if (this._frame !== null) return

		this._frame = requestAnimationFrame(() => {
			this._frame = null
			this._observe()
			this._measure()
		})
	}

	private _cancel(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}

	/**
	 * Под наблюдением вьюпорт и его прямые дети: лента меняет края и когда ей
	 * самой сменили ширину, и когда вырос любой элемент внутри.
	 *
	 * `border-box`: у вьюпорта есть паддинг (запас под кольцо фокуса
	 * содержимого), и `content-box` пропустил бы его смену вместе со сменой
	 * размера.
	 */
	private _observe(): void {
		const observer = (this._resize ??= new ResizeObserver(this._onSchedule))
		const current = new Set<Element>()

		if (this._viewport) {
			current.add(this._viewport)

			for (const child of this._viewport.children) current.add(child)
		}

		for (const node of this._observed) {
			if (current.has(node)) continue

			observer.unobserve(node)
			this._observed.delete(node)
		}

		for (const node of current) {
			if (this._observed.has(node)) continue

			observer.observe(node, { box: 'border-box' })
			this._observed.add(node)
		}
	}

	/** Три числа вьюпорта плюс остановки Tab внутри — весь замер ленты. */
	private _measure(): void {
		const viewport = this._viewport

		if (!this._owner || !viewport) return

		this._owner.notifyViewport({
			...resolveEdges({
				scrollLeft: viewport.scrollLeft,
				clientWidth: viewport.clientWidth,
				scrollWidth: viewport.scrollWidth,
			}),
			// Сам вьюпорт в список не попадает — `tabStops` ищет внутри узла,
			// поэтому его собственный `tabindex` себя же и не породит
			hasTabStops: tabStops(viewport).length > 0,
		})
	}

	/**
	 * Шаг — видимая ширина вьюпорта, то есть страница; до границы элемента
	 * страницу доводит снап темы, и границы элементов считать не нужно —
	 * в этом и была ставка на слот вместо коллекции.
	 *
	 * Знак — по вычисленному направлению письма: в RTL начало строки справа,
	 * и «вперёд» уводит ленту влево.
	 */
	private _scroll(direction: TScrollerDirection): void {
		const viewport = this._viewport

		if (!viewport) return

		const rtl = getComputedStyle(viewport).direction === 'rtl'
		const forward = direction === 'next' ? 1 : -1

		viewport.scrollBy({
			left: (rtl ? -forward : forward) * viewport.clientWidth,
			behavior: prefersReducedMotion() ? 'instant' : 'smooth',
		})
	}

	/**
	 * Нажатие по кнопке ленты. Кнопки стоят снаружи вьюпорта, поэтому чужая
	 * лента внутри содержимого своими кнопками нашу не двигает: её кнопки
	 * лежат в нашем вьюпорте.
	 */
	private readonly _onClick = (event: MouseEvent): void => {
		const target = event.target

		if (!(target instanceof Element)) return

		if (this._owns(target.closest(this._selector('__prev')))) {
			this._owner?.scrollPrev()

			return
		}

		if (this._owns(target.closest(this._selector('__next')))) this._owner?.scrollNext()
	}

	/**
	 * Фокус с клавиатуры пришёл в ленту — довести элемент под ним в окно
	 * снапа (почему так — в описании плагина).
	 *
	 * Сам вьюпорт — остановка Tab ленты без своих остановок: он и есть окно, и
	 * доводить его некуда.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const viewport = this._viewport
		const target = event.target

		if (!viewport || !(target instanceof Element) || target === viewport) return

		if (!target.matches(':focus-visible')) return

		const style = getComputedStyle(viewport)
		const shift = resolveFocusShift({
			snapport: scrollWindowOf(viewport, style),
			focused: target.getBoundingClientRect(),
			item: itemOf(target, viewport).getBoundingClientRect(),
			rtl: style.direction === 'rtl',
		})

		if (shift !== null) viewport.scrollBy({ left: shift, behavior: 'instant' })
	}

	private _owns(node: Element | null): boolean {
		if (node === null) return false

		return this._root?.contains(node) === true && this._viewport?.contains(node) !== true
	}

	/** Селектор части — из классов инстанса, а не строкой в плагине. */
	private _selector(part: string): string {
		return this._owner?.classes.resolve(part, { point: true }) ?? ''
	}
}

/**
 * Просит ли пользователь обойтись без анимации.
 *
 * Плавность задаёт плагин в вызове, а не проп ядра: из трёх значений
 * `TScrollBehavior` у ленты осмысленны два, и третье было бы мёртвым
 * значением в перечислении. Правило темы с этим не спорит — `scroll-behavior`
 * она не объявляет.
 *
 * Среда без `matchMedia` (серверная отрисовка, jsdom) считается обычной: там
 * анимации всё равно нет.
 */
function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
	)
}
