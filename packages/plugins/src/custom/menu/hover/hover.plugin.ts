import { batchOf, isMenuSubmenu, menuOf } from '@soldy-ui/core'
import type { IControl, IMenuOwner, IMenuSubmenu } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TMenuKeyboardPlugin } from '../keyboard'
import { TMenuSubmenuKeyboardPlugin } from '../submenu-keyboard'
import type { TMenuNavigationPlugin } from '../navigation'
import { graceArea, isPointInPolygon } from '../../../utils'
import type { IDomEventTarget, TPoint } from '../../../utils'
import type { TMenuHoverPluginEvents } from './types'

/** Фокус строке под указателем — без прокрутки: пункт под указателем и так виден. */
const NO_SCROLL: FocusOptions = { preventScroll: true }

/**
 * Сколько указатель стоит на пункте с подменю, пока оно не откроется, мс:
 * указатель, который проходит мимо, подменю не раскрывает (Radix — те же
 * 100 мс).
 */
const SUBMENU_OPEN_DELAY = 100

/**
 * Сколько держит путь к открытому подменю после ухода со строки, мс: дольше
 * указатель идёт к панели только стоя, а стоящий на соседнем пункте его и
 * выбрал (Radix — те же 300 мс).
 */
const SUBMENU_GRACE_DELAY = 300

/** Указатель, который наводят, — мышь и перо. У пальца наведения нет. */
const hovers = (e: PointerEvent): boolean => e.pointerType === 'mouse' || e.pointerType === 'pen'

/** Путь к открытому подменю: многоугольник и снятие по таймеру. */
type TGrace = { readonly area: readonly TPoint[]; readonly timer: ReturnType<typeof setTimeout> }

/** Отложенное открытие подменю наведением. */
type TPendingOpen = { readonly uid: string | number; readonly timer: ReturnType<typeof setTimeout> }

/**
 * TMenuHoverPlugin — указатель в панели одного уровня меню: корня или
 * подменю.
 *
 * **Подсветка**, пока меню открыто: мышь и перо над доступным пунктом
 * подсвечивают его, уход с пункта — на разделитель, подпись группы, поле
 * панели или за панель — и выключенный пункт подсветку снимают. Подсветка —
 * фокус (навигация уровня), и указатель ставит его без прокрутки. Своего
 * наведения у строки нет: иначе после стрелок горели бы две строки —
 * подсвеченная и та, что под указателем. Касание не подсвечивает: у пальца
 * наведения нет, а нажатие пункта — его клик.
 *
 * **Подменю** — намерение указателя (APG Menu, как Radix и React Aria):
 *
 * - указатель, простоявший на пункте с подменю `SUBMENU_OPEN_DELAY`,
 *   открывает его — через коллекцию (`openItem`): выключенному она
 *   откажет. Фокус остаётся на строке: в панель подменю он входит
 *   указателем или клавишами;
 * - указатель ушёл со строки открытого подменю — от точки ухода к его
 *   панели ложится путь (`graceArea`): пока указатель на нём, пункты по
 *   дороге подсветку не перехватывают, и подменю открыто. Путь держит
 *   `SUBMENU_GRACE_DELAY`, а сходит с него указатель — подсветка уходит к
 *   пункту под ним, и подменю закрывается тем же путём, что от клавиш:
 *   фокус ушёл из подменю — оно закрылось (`TDismissPlugin` с
 *   `focusOutside`);
 * - указатель ушёл с панели, пока подменю открыто, — подсветка остаётся у
 *   его строки: указатель уходит в его панель.
 *
 * Панель подменю плагин находит у его набора — `TDismissPlugin` по пометке
 * владельцем, — а набор пункта — в реестре коллекции.
 *
 * Слушатели висят на панели, пока меню открыто: панель телепортирована, и
 * находит её `TDismissPlugin` по пометке владельцем.
 */
export class TMenuHoverPlugin extends TBasePlugin<any, TMenuHoverPluginEvents> {
	private _owner: IMenuOwner<any> | null = null
	private _dismiss: TDismissPlugin | null = null
	private _navigation: TMenuNavigationPlugin | null = null
	private _elements: TCollectionElements | null = null
	private _bundles: TCollectionBundlesPlugin | null = null
	/** Корень объявлен — панель есть где искать. */
	private _root: Element | null = null
	/** Узел нужен только под слушатели — отсюда и тип. */
	private _panel: IDomEventTarget | null = null
	/** Пункт, над которым указатель был прошлым ходом. */
	private _lastUid: string | number | undefined = undefined
	private _grace: TGrace | null = null
	private _pendingOpen: TPendingOpen | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IMenuOwner<any>>() ?? null
		this._dismiss = ctx.get(TDismissPlugin) ?? null
		// Навигация уровня — у меню своя, у подменю своя; в наборе одна из них
		this._navigation =
			ctx.get(TMenuKeyboardPlugin) ?? ctx.get(TMenuSubmenuKeyboardPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
			this._syncPanel()
		})

		elementPlugin?.events.on('removed', () => {
			this._root = null
			this._syncPanel()
		})

		this._listenTo(this._owner?.events, 'change:open', () => this._syncPanel())
	}

	override destroy(): void {
		this._unlistenPanel()

		this._root = null
		this._owner = null
		this._dismiss = null
		this._navigation = null
		this._elements = null
		this._bundles = null

		super.destroy()
	}

	/** Слушать панель, пока меню открыто и корень объявлен. */
	private _syncPanel(): void {
		const panel: IDomEventTarget | null =
			this._root && this._owner?.open ? (this._dismiss?.findPanel() ?? null) : null

		if (panel === this._panel) return

		this._unlistenPanel()

		if (!panel) return

		this._panel = panel
		panel.addEventListener('pointermove', this._onPointerMove)
		panel.addEventListener('pointerleave', this._onPointerLeave)
	}

	private _unlistenPanel(): void {
		this._panel?.removeEventListener('pointermove', this._onPointerMove)
		this._panel?.removeEventListener('pointerleave', this._onPointerLeave)
		this._panel = null

		this._lastUid = undefined
		this._dropGrace()
		this._cancelOpen()
	}

	/** Пункт под указателем: показанный, чей узел содержит цель события. */
	private _uidAt(target: EventTarget | null): string | number | undefined {
		if (!(target instanceof Node)) return undefined

		return this._shown().find((item) =>
			this._elements?.getElementByUid(item.uid)?.contains(target),
		)?.uid
	}

	private _shown(): readonly IControl[] {
		return batchOf<IControl>(this._elements?.engine)?.shown ?? []
	}

	/** Открытое подменю этого уровня; `null` — открытого нет. */
	private _opened(): IMenuSubmenu | null {
		return menuOf(this._elements?.engine)?.opened ?? null
	}

	private readonly _onPointerMove = (e: PointerEvent): void => {
		if (!hovers(e)) return

		const point: TPoint = { x: e.clientX, y: e.clientY }
		const uid = this._uidAt(e.target)
		const last = this._lastUid

		this._lastUid = uid

		// Путь к открытому подменю: пункты по дороге подсветку не перехватывают
		if (this._onGrace(point, uid, last)) return

		this._scheduleOpen(uid)

		if (uid !== undefined && this._navigation?.highlightItem(uid, NO_SCROLL)) return

		this._navigation?.unhighlight(NO_SCROLL)
	}

	/** Указатель ушёл с панели: открытое подменю держит подсветку своей строки. */
	private readonly _onPointerLeave = (e: PointerEvent): void => {
		if (!hovers(e)) return

		this._lastUid = undefined
		this._cancelOpen()

		if (this._opened()) return

		this._navigation?.unhighlight(NO_SCROLL)
	}

	/**
	 * Идёт ли указатель к открытому подменю. Только что ушёл с его строки —
	 * путь ложится от точки ухода; путь есть и указатель на нём — да; сошёл с
	 * пути — путь снят.
	 */
	private _onGrace(point: TPoint, uid: string | number | undefined, last: unknown): boolean {
		const opened = this._opened()

		if (!opened || uid === opened.uid) {
			this._dropGrace()

			return false
		}

		if (last === opened.uid) this._layGrace(point, opened)

		if (this._grace && isPointInPolygon(point, this._grace.area)) return true

		this._dropGrace()

		return false
	}

	/** Путь от точки ухода к панели подменю — на время `SUBMENU_GRACE_DELAY`. */
	private _layGrace(exit: TPoint, submenu: IMenuSubmenu): void {
		this._dropGrace()

		const panel = this._bundles?.getByUid(submenu.uid)?.get(TDismissPlugin)?.findPanel()
		const box = panel?.getBoundingClientRect()

		// Панель ещё не разложена — пути нет
		if (!box || box.width === 0 || box.height === 0) return

		this._grace = {
			area: graceArea(exit, box),
			timer: setTimeout(() => {
				this._grace = null
			}, SUBMENU_GRACE_DELAY),
		}
	}

	private _dropGrace(): void {
		if (this._grace) clearTimeout(this._grace.timer)

		this._grace = null
	}

	/**
	 * Пункт с подменю под указателем откроется, если указатель на нём
	 * простоит: доступный, закрытый, — открытое и пункт без подменю
	 * ожидание снимают.
	 */
	private _scheduleOpen(uid: string | number | undefined): void {
		const item =
			uid === undefined ? undefined : this._shown().find((shown) => shown.uid === uid)

		if (!isMenuSubmenu(item) || item.open || item.disabled) {
			this._cancelOpen()

			return
		}

		if (this._pendingOpen?.uid === item.uid) return

		this._cancelOpen()

		this._pendingOpen = {
			uid: item.uid,
			timer: setTimeout(() => {
				this._pendingOpen = null
				menuOf(this._elements?.engine)?.openItem(item)
			}, SUBMENU_OPEN_DELAY),
		}
	}

	private _cancelOpen(): void {
		if (this._pendingOpen) clearTimeout(this._pendingOpen.timer)

		this._pendingOpen = null
	}
}
