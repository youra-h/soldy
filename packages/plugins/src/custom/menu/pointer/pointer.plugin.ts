import type { IBatchExtension, IControl, IMenu } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionElements } from '../../collection'
import { TMenuKeyboardPlugin } from '../keyboard'
import type { IDomEventTarget } from '../../../utils'
import type { TMenuPointerPluginEvents } from './types'

/** Фокус строке под указателем — без прокрутки: пункт под указателем и так виден. */
const NO_SCROLL: FocusOptions = { preventScroll: true }

/** Указатель, который наводят, — мышь и перо. У пальца наведения нет. */
const hovers = (e: PointerEvent): boolean => e.pointerType === 'mouse' || e.pointerType === 'pen'

/**
 * TMenuPointerPlugin — указатель меню.
 *
 * **Клик по корню** переключает меню. В корне лежит только триггер (слот
 * `trigger`), поэтому клик по корню — клик по триггеру, чем бы потребитель
 * его ни нарисовал. Клик из Enter и пробела на `<button>` браузер делает сам,
 * но до него не доходит: эти клавиши берёт клавиатура меню — открыть на
 * первом пункте. По открытому триггеру клик закрывает меню без мигания:
 * корень — внутри владельца, и `pointerdown` перед кликом `TDismissPlugin`
 * мимо не считает.
 *
 * **Наведение**, пока меню открыто: мышь и перо над доступным пунктом
 * подсвечивают его, уход с пункта — на разделитель, подпись группы, поле
 * панели или за панель — и выключенный пункт подсветку снимают. Подсветка —
 * фокус (`TMenuKeyboardPlugin`), и указатель ставит его без прокрутки. Своего
 * наведения у строки нет: иначе после стрелок горели бы две строки —
 * подсвеченная и та, что под указателем. Касание не подсвечивает: у пальца
 * наведения нет, а нажатие пункта — его клик.
 *
 * Слушатели наведения висят на панели, пока меню открыто: панель
 * телепортирована, и находит её `TDismissPlugin` по пометке владельцем.
 */
export class TMenuPointerPlugin extends TBasePlugin<any, TMenuPointerPluginEvents> {
	private _owner: IMenu | null = null
	private _dismiss: TDismissPlugin | null = null
	private _keyboard: TMenuKeyboardPlugin | null = null
	private _elements: TCollectionElements | null = null
	/** Узлы нужны только под слушатели — отсюда и тип. */
	private _root: IDomEventTarget | null = null
	private _panel: IDomEventTarget | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IMenu>() ?? null
		this._dismiss = ctx.get(TDismissPlugin) ?? null
		this._keyboard = ctx.get(TMenuKeyboardPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
			element.addEventListener('click', this._onClick)
			this._syncPanel()
		})

		elementPlugin?.events.on('removed', () => {
			this._root?.removeEventListener('click', this._onClick)
			this._root = null
			this._syncPanel()
		})

		this._listenTo(this._owner?.events, 'change:open', () => this._syncPanel())
	}

	override destroy(): void {
		this._root?.removeEventListener('click', this._onClick)
		this._unlistenPanel()

		this._root = null
		this._owner = null
		this._dismiss = null
		this._keyboard = null
		this._elements = null

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

	private readonly _onClick = (): void => {
		const owner = this._owner

		if (owner) owner.open = !owner.open
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
