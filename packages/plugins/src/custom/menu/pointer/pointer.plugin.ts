import type { IBatchExtension, IControl, IMenu, TMenuOpenOn, TMenuPoint } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionElements } from '../../collection'
import { TMenuKeyboardPlugin } from '../keyboard'
import type { IDomEventTarget } from '../../../utils'
import { TMenuContextStrategy, TMenuPressStrategy } from './strategies'
import type { IMenuOpenHost, IMenuOpenStrategy, TMenuOpenStrategyCtor } from './strategies'
import type { TMenuPointerPluginEvents } from './types'

/** Фокус строке под указателем — без прокрутки: пункт под указателем и так виден. */
const NO_SCROLL: FocusOptions = { preventScroll: true }

/** Указатель, который наводят, — мышь и перо. У пальца наведения нет. */
const hovers = (e: PointerEvent): boolean => e.pointerType === 'mouse' || e.pointerType === 'pen'

/** Стратегия открытия на каждый способ: способ выбирает класс, а не ветку в обработчике. */
const OPEN_STRATEGIES: Readonly<Record<TMenuOpenOn, TMenuOpenStrategyCtor>> = {
	press: TMenuPressStrategy,
	contextmenu: TMenuContextStrategy,
}

/**
 * TMenuPointerPlugin — открытие меню и указатель в панели.
 *
 * **Открытие** — стратегия по способу владельца (`openOn`, `strategies/`):
 * у кнопки (`TMenuPressStrategy`) клик по корню переключает меню, у
 * контекстного меню (`TMenuContextStrategy`) `contextmenu` и долгое касание
 * над областью вызывают его у точки вызова (`point` владельца). Стратегию
 * выбирает подписка на `change:openOn`, а не проверка в обработчике, и
 * слушатели корня у каждого способа свои. Вызванное клавишей контекстное
 * меню открывается на первом пункте — через клавиатуру меню, как кнопка с
 * клавиатуры.
 *
 * **Наведение**, пока меню открыто: мышь и перо над доступным пунктом
 * подсвечивают его, уход с пункта — на разделитель, подпись группы, поле
 * панели или за панель — и выключенный пункт подсветку снимают. Подсветка —
 * фокус (`TMenuKeyboardPlugin`), и указатель ставит его без прокрутки. Своего
 * наведения у строки нет: иначе после стрелок горели бы две строки —
 * подсвеченная и та, что под указателем. Касание не подсвечивает: у пальца
 * наведения нет, а нажатие пункта — его клик. Наведение у способов общее:
 * панель у них одна.
 *
 * Слушатели наведения висят на панели, пока меню открыто: панель
 * телепортирована, и находит её `TDismissPlugin` по пометке владельцем.
 */
export class TMenuPointerPlugin
	extends TBasePlugin<any, TMenuPointerPluginEvents>
	implements IMenuOpenHost
{
	private _owner: IMenu | null = null
	private _dismiss: TDismissPlugin | null = null
	private _keyboard: TMenuKeyboardPlugin | null = null
	private _elements: TCollectionElements | null = null
	/** Корень — под стратегию открытия и как признак того, что панель есть где искать. */
	private _root: Element | null = null
	/** Узел нужен только под слушатели — отсюда и тип. */
	private _panel: IDomEventTarget | null = null
	/** Способ открытия на корне — по `openOn` владельца. */
	private _strategy: IMenuOpenStrategy | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IMenu>() ?? null
		this._dismiss = ctx.get(TDismissPlugin) ?? null
		this._keyboard = ctx.get(TMenuKeyboardPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
			this._syncStrategy()
			this._syncPanel()
		})

		elementPlugin?.events.on('removed', () => {
			this._root = null
			this._syncStrategy()
			this._syncPanel()
		})

		this._listenTo(this._owner?.events, 'change:openOn', () => this._syncStrategy())
		this._listenTo(this._owner?.events, 'change:open', () => this._syncPanel())
	}

	override destroy(): void {
		this._strategy?.destroy()
		this._strategy = null
		this._unlistenPanel()

		this._root = null
		this._owner = null
		this._dismiss = null
		this._keyboard = null
		this._elements = null

		super.destroy()
	}

	/** Открыто ли меню — для стратегий открытия. */
	get isOpen(): boolean {
		return this._owner?.open ?? false
	}

	/** Переключить меню — нажатие кнопки. */
	toggle(): void {
		const owner = this._owner

		if (owner) owner.open = !owner.open
	}

	/**
	 * Вызвать меню у точки окна, открытое — переставить к ней: точку отдаёт
	 * якорю панели разметка. Вызвали клавишей — меню открывается на первом
	 * пункте, как кнопка с клавиатуры, указателем — фокус на панели.
	 */
	invoke(point: TMenuPoint, byKeyboard: boolean): void {
		const owner = this._owner

		if (!owner) return

		owner.point = point

		if (byKeyboard && this._keyboard) {
			this._keyboard.openAt('first')
		} else {
			owner.open = true
		}
	}

	/** Закрыть меню. */
	close(): void {
		const owner = this._owner

		if (owner) owner.open = false
	}

	/** Стратегия открытия — по способу владельца, на объявленном корне. */
	private _syncStrategy(): void {
		this._strategy?.destroy()
		this._strategy = null

		const root = this._root
		const owner = this._owner

		if (!root || !owner) return

		this._strategy = new OPEN_STRATEGIES[owner.openOn](root, this)
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
	}

	/** Пункт под указателем: показанный, чей узел содержит цель события. */
	private _uidAt(target: EventTarget | null): string | number | undefined {
		if (!(target instanceof Node)) return undefined

		const batch = this._elements?.engine?.extensions.batch as
			IBatchExtension<IControl> | undefined

		return batch?.shown.find((item) =>
			this._elements?.getElementByUid(item.uid)?.contains(target),
		)?.uid
	}

	/** Над доступным пунктом — подсветить его; над чем-то другим — снять подсветку. */
	private readonly _onPointerMove = (e: PointerEvent): void => {
		if (!hovers(e)) return

		const uid = this._uidAt(e.target)

		if (uid !== undefined && this._keyboard?.highlightItem(uid, NO_SCROLL)) return

		this._keyboard?.unhighlight(NO_SCROLL)
	}

	/** Указатель ушёл с панели — подсветки нет. */
	private readonly _onPointerLeave = (e: PointerEvent): void => {
		if (hovers(e)) this._keyboard?.unhighlight(NO_SCROLL)
	}
}
