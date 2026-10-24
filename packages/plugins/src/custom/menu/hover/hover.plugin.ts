import { batchOf, isMenuPopupItem, menuOf } from '@soldy-ui/core'
import type { IControl, IMenuOwner, IMenuPopupItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TMenuKeyboardPlugin } from '../keyboard'
import { TMenuSubmenuKeyboardPlugin } from '../submenu-keyboard'
import { TMenuPopoverItemFocusPlugin } from '../popover-item-focus'
import type { TMenuNavigationPlugin } from '../navigation'
import { graceArea, isPointInPolygon } from '../../../utils'
import type { IDomEventTarget, TPoint } from '../../../utils'
import type { TMenuHoverPluginEvents } from './types'

/**
 * Сколько указатель стоит на пункте со своей панелью, пока она не откроется,
 * мс: указатель, который проходит мимо, панель не раскрывает (Radix — те же
 * 100 мс у подменю).
 */
const PANEL_OPEN_DELAY = 100

/**
 * Сколько держит путь к открытой панели пункта после ухода со строки, мс:
 * дольше указатель идёт к панели только стоя, а стоящий на соседнем пункте
 * его и выбрал (Radix — те же 300 мс).
 */
const PANEL_GRACE_DELAY = 300

/** Указатель, который наводят, — мышь и перо. У пальца наведения нет. */
const hovers = (e: PointerEvent): boolean => e.pointerType === 'mouse' || e.pointerType === 'pen'

/** Путь к открытой панели пункта: многоугольник и снятие по таймеру. */
type TGrace = { readonly area: readonly TPoint[]; readonly timer: ReturnType<typeof setTimeout> }

/** Отложенное открытие панели пункта наведением. */
type TPendingOpen = { readonly uid: string | number; readonly timer: ReturnType<typeof setTimeout> }

/**
 * TMenuHoverPlugin — указатель в панели одного уровня меню: корня или
 * подменю.
 *
 * **Подсветка**, пока меню открыто: мышь и перо над доступным пунктом
 * подсвечивают его, уход с пункта — на разделитель, подпись группы, поле
 * панели или за панель — и выключенный пункт подсветку снимают. Подсветка —
 * фокус (навигация уровня, без прокрутки), а пункт, срезанный краем списка,
 * докручивает прокрутка списка — тем же правилом, что подсветку от клавиш.
 * Своего наведения у строки нет: иначе после стрелок горели бы две строки —
 * подсвеченная и та, что под указателем. Касание не подсвечивает: у пальца
 * наведения нет, а нажатие пункта — его клик.
 *
 * **Панели пунктов** — подменю и панель пункта с панелью
 * (`Menu.PopoverItem`) — намерение указателя (APG Menu, как Radix и React
 * Aria):
 *
 * - указатель, простоявший на пункте со своей панелью `PANEL_OPEN_DELAY`,
 *   открывает её — через коллекцию (`openItem`): выключенному она откажет.
 *   Фокус остаётся на строке: в панель он входит указателем или клавишами.
 *   Подменю на открытии фокус на строке и так оставляет, а модель фокуса
 *   пункта с панелью увела бы его в панель, как после нажатия, — ей плагин
 *   сообщает, что панель открыл указатель (`keepFocusOnRow`). Нажали строку,
 *   пока указатель ждал, — панель уже открыта нажатием, и фокус у неё;
 * - указатель ушёл со строки пункта с открытой панелью — от точки ухода к
 *   панели ложится путь (`graceArea`): пока указатель на нём, пункты по
 *   дороге подсветку не перехватывают, и панель открыта. Путь держит
 *   `PANEL_GRACE_DELAY`, а сходит с него указатель — подсветка уходит к
 *   пункту под ним, и панель закрывается тем же путём, что от клавиш: фокус
 *   ушёл из пункта — его панель закрылась (`TDismissPlugin` с
 *   `focusOutside`);
 * - указатель ушёл с панели меню, пока панель пункта открыта, — подсветка
 *   остаётся у его строки: указатель уходит в его панель.
 *
 * Панель пункта (`TDismissPlugin` по пометке владельцем) и его модель фокуса
 * плагин берёт у набора пункта, а набор — в реестре коллекции.
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

	/** Пункт этого уровня с открытой панелью — подменю или своей; `null` — такого нет. */
	private _opened(): IMenuPopupItem | null {
		return menuOf(this._elements?.engine)?.opened ?? null
	}

	private readonly _onPointerMove = (e: PointerEvent): void => {
		if (!hovers(e)) return

		const point: TPoint = { x: e.clientX, y: e.clientY }
		const uid = this._uidAt(e.target)
		const last = this._lastUid

		this._lastUid = uid

		// Путь к открытой панели пункта: пункты по дороге подсветку не перехватывают
		if (this._onGrace(point, uid, last)) return

		this._scheduleOpen(uid)

		if (uid !== undefined && this._navigation?.highlightItem(uid)) return

		this._navigation?.unhighlight()
	}

	/**
	 * Указатель ушёл с панели: пункт с открытой панелью держит подсветку своей
	 * строки. Путь к ней снят — указатель до панели дошёл или ушёл мимо, и
	 * вернувшийся указатель решает заново.
	 */
	private readonly _onPointerLeave = (e: PointerEvent): void => {
		if (!hovers(e)) return

		this._lastUid = undefined
		this._dropGrace()
		this._cancelOpen()

		if (this._opened()) return

		this._navigation?.unhighlight()
	}

	/**
	 * Идёт ли указатель к открытой панели пункта. Только что ушёл с его строки
	 * — путь ложится от точки ухода; путь есть и указатель на нём — да; сошёл
	 * с пути — путь снят.
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

	/** Путь от точки ухода к панели пункта — на время `PANEL_GRACE_DELAY`. */
	private _layGrace(exit: TPoint, item: IMenuPopupItem): void {
		this._dropGrace()

		const panel = this._bundles?.getByUid(item.uid)?.get(TDismissPlugin)?.findPanel()
		const box = panel?.getBoundingClientRect()

		// Панель ещё не разложена — пути нет
		if (!box || box.width === 0 || box.height === 0) return

		this._grace = {
			area: graceArea(exit, box),
			timer: setTimeout(() => {
				this._grace = null
			}, PANEL_GRACE_DELAY),
		}
	}

	private _dropGrace(): void {
		if (this._grace) clearTimeout(this._grace.timer)

		this._grace = null
	}

	/**
	 * Пункт со своей панелью под указателем — подменю или пункт с панелью —
	 * откроется, если указатель на нём простоит: доступный, закрытый, —
	 * открытый, выключенный и пункт без своей панели ожидание снимают.
	 */
	private _scheduleOpen(uid: string | number | undefined): void {
		const item =
			uid === undefined ? undefined : this._shown().find((shown) => shown.uid === uid)

		if (!isMenuPopupItem(item) || item.open || item.disabled) {
			this._cancelOpen()

			return
		}

		if (this._pendingOpen?.uid === item.uid) return

		this._cancelOpen()

		this._pendingOpen = {
			uid: item.uid,
			timer: setTimeout(() => {
				this._pendingOpen = null
				this._openByPointer(item)
			}, PANEL_OPEN_DELAY),
		}
	}

	/**
	 * Открыть панель пункта указателем: фокус остаётся на строке. Панель уже
	 * открыта — строку нажали, пока указатель ждал, — фокус ведёт нажатие, и
	 * трогать его нечего. Модель фокуса пункта с панелью увела бы фокус в
	 * панель, как после нажатия, — ей сказано оставить его на строке; у
	 * подменю её нет, и фокус на строке оно оставляет само.
	 */
	private _openByPointer(item: IMenuPopupItem): void {
		if (item.open || !menuOf(this._elements?.engine)?.openItem(item)) return

		this._bundles?.getByUid(item.uid)?.get(TMenuPopoverItemFocusPlugin)?.keepFocusOnRow()
	}

	private _cancelOpen(): void {
		if (this._pendingOpen) clearTimeout(this._pendingOpen.timer)

		this._pendingOpen = null
	}
}
