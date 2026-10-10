import type { IControl, IList, TCollectionEngine } from '@soldy-ui/core'
import { frameDebounce } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { smoothScrollBehavior } from '../../../motion'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TListKeyboardPlugin } from '../keyboard'
import type { TListScrollPluginEvents } from './types'

/** Куда довести элемент: в середину контейнера или до ближайшего края. */
type TScrollMode = 'center' | 'nearest'

/**
 * TListScrollPlugin — автоматическая прокрутка контейнера к выделенному элементу.
 *
 * Поведение берётся из `scrollBehavior` инстанса (`IList`): свойством владеет
 * ядро, плагин его только применяет. Так устроены и остальные плагины пакета.
 * Плавная прокрутка — движение: `smooth` плавный, только пока режим движения
 * библиотеки его не убрал (`smoothScrollBehavior`).
 *
 * Прокрутка за выбором и подсветкой откладывается на кадр: узел элемента,
 * который окно дорисовывает к ним, адаптер рисует после обработчика.
 * Отложенная прокрутка всегда одна — последняя.
 *
 * **Начальная прокрутка** — список открывается на выбранном элементе. Ей нужны
 * и узел корня, и движок, а приходят они порознь: движок привязывают при
 * сборке, узел корня плагин получает кадром после монтирования (`ready`).
 * Поэтому её зовут оба события, а срабатывает то, что пришло вторым, — в
 * жизни это `ready`. К нему узлы элементов уже привязаны, а предел строк
 * поставлен: `TListHeightPlugin` ставит его на том же `ready` и стоит в наборе
 * раньше.
 *
 * Окно (обёртка `Virtual`) до первого замера рисует только первые элементы, и
 * выбранного дальше них в документе ещё нет. Окно дорисует его после замера —
 * навигация закрепила его подсветкой, — поэтому прокрутка ждёт, когда набор
 * выбранного зарегистрируют, а прокручивает кадром позже: узел адаптер
 * привязывает после регистрации. Сменился выбор — прежний выбранный она больше
 * не ждёт: к новому прокрутит смена выбора.
 *
 * Начальная прокрутка мгновенная и при `smooth`: показывать на монтировании
 * нечего, а плавный проход перерисовывал бы окно на каждом кадре. При `none`
 * её нет.
 */
export class TListScrollPlugin extends TBasePlugin<any, TListScrollPluginEvents> {
	private _element: Element | null = null
	private _list: IList | null = null
	private _bundles: TCollectionBundlesPlugin | null = null
	private _collectionElements: TCollectionElements | null = null
	/** Выбранный элемент, чей узел ждёт начальная прокрутка; `null` — не ждёт. */
	private _awaitedUid: string | number | null = null
	/** Отложить прокрутку на кадр; прежняя отложенная отменяется. */
	private readonly _schedule = frameDebounce((scroll: () => void) => scroll())

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IList>()
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			this._revealSelected()
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element = null
		})

		this._bundles?.events.on('engine:bound', (engine) => {
			this._subscribeToEngine(engine)
			this._revealSelected()
		})

		// Выбранный вошёл в документ: окно нарисовало его после замера
		this._bundles?.events.on('bundle:registered', ({ uid }) => {
			if (uid !== this._awaitedUid) return

			this._awaitedUid = null
			this._schedule(() => this._reveal(uid))
		})

		const keyboardPlugin = ctx.get(TListKeyboardPlugin) ?? null

		keyboardPlugin?.events.on('change:highlight', ({ item }) => {
			if (item) {
				this._schedule(() => this._follow(item.uid, 'nearest'))
			}
		})
	}

	override destroy(): void {
		this._element = null
		this._list = null
		this._bundles = null
		this._collectionElements = null
		this._awaitedUid = null

		super.destroy()
	}

	private _subscribeToEngine(engine: TCollectionEngine<any, any>): void {
		this._listenTo(
			engine.extensions.selection.events,
			'change:selection',
			(items: IControl[]) => {
				this._awaitedUid = null

				if (items.length > 0) {
					const { uid } = items[0]

					this._schedule(() => this._follow(uid, 'center'))
				}
			},
		)
	}

	/**
	 * Начальная прокрутка к выбранному — когда есть и узел корня, и движок.
	 * Выбранного окно ещё не нарисовало — ждать регистрации его набора.
	 */
	private _revealSelected(): void {
		const engine = this._bundles?.engine

		this._awaitedUid = null

		if (!this._element || !engine) return

		const [selected] = engine.extensions.selection.selected as IControl[]

		if (!selected) return

		if (this._collectionElements?.getElementByUid(selected.uid)) {
			this._reveal(selected.uid)
		} else {
			this._awaitedUid = selected.uid
		}
	}

	/** Начальная прокрутка: элемент — в середину, сразу и при `smooth`. */
	private _reveal(uid: string | number): void {
		const target = this._targetOf(uid)

		if (target) this._scrollTo(target, 'center', 'instant')
	}

	/** Прокрутка за выбором и подсветкой — как велит `scrollBehavior`. */
	private _follow(uid: string | number, mode: TScrollMode): void {
		const target = this._targetOf(uid)

		if (!target) return

		const behavior =
			this._list?.scrollBehavior === 'instant' ? 'instant' : smoothScrollBehavior(target)

		this._scrollTo(target, mode, behavior)
	}

	/**
	 * Узел элемента, к которому прокручивать. `null` — прокручивать нечего или
	 * не велено: узла элемента нет, `scrollBehavior` — `none`.
	 */
	private _targetOf(uid: string | number): Element | null {
		const behavior = this._list?.scrollBehavior

		if (behavior === undefined || behavior === 'none') return null

		return this._collectionElements?.getElementByUid(uid) ?? null
	}

	private _scrollTo(target: Element, mode: TScrollMode, behavior: ScrollBehavior): void {
		const container = this._element

		if (!container) return

		if (mode === 'nearest') {
			target.scrollIntoView({ block: 'nearest', behavior })
			return
		}

		if (this._isFullyVisible(target)) return

		const containerRect = container.getBoundingClientRect()
		const targetRect = target.getBoundingClientRect()

		const scrollTop =
			container.scrollTop + (targetRect.top - containerRect.top) - container.clientHeight / 2

		container.scrollTo({ top: scrollTop, behavior })
	}

	private _isFullyVisible(el: Element): boolean {
		if (!this._element) return false

		const containerRect = this._element.getBoundingClientRect()
		const targetRect = el.getBoundingClientRect()

		return targetRect.top >= containerRect.top && targetRect.bottom <= containerRect.bottom
	}
}
