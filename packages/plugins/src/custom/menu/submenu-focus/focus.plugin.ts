import type { IPluginContext } from '../../../base'
import { TDismissPlugin } from '../../dismiss'
import { TCollectionBundlesPlugin } from '../../collection'
import { TOverlayFocusPlugin } from '../../overlay/focus'
import type { IOverlayOpenOptions } from '../../overlay/types'
import { rowIn } from '../../list/row'
import { TMenuSubmenuKeyboardPlugin } from '../submenu-keyboard'
import { TMenuPopoverItemFocusPlugin } from '../popover-item-focus'
import { holdsFocus } from '../nested-layer'
import type { TMenuSubmenuFocusPluginEvents } from './types'

/**
 * TMenuSubmenuFocusPlugin — модель фокуса подменю: уровня меню, открытого со
 * строки пункта (APG Menu).
 *
 * Общее у оверлеев — запомнить, откуда открыли, увести фокус в панель кадром
 * позже, вернуть его при закрытии, закрыться по Escape и погасить его, —
 * лежит в `TOverlayFocusPlugin`. Открывают подменю со строки пункта, поэтому
 * запомнена и возвращается фокусу она. Своё у подменю:
 *
 * - **куда при открытии.** Открыли клавишей — подсвечен первый пункт
 *   (`TMenuSubmenuKeyboardPlugin`), и фокус встаёт на его строку. Открыли
 *   указателем — наведением или нажатием строки — фокус остаётся на строке:
 *   в панель он входит указателем, а клавишами — стрелкой к концу строки;
 * - **закрыть уровень.** Escape — один уровень: подменю закрывается, фокус
 *   возвращается на его строку, меню над ним открыто. Клавишу гасит
 *   `preventDefault`, и меню над подменю её пропускает, как слои Select в
 *   поповере;
 * - **возвращать ли фокус.** Только когда фокус ещё в подменю или нигде
 *   (`holdsFocus`): подменю, закрытое вместе с меню (выбор пункта), не тянет
 *   его на строку спрятанной панели — меню уже вернуло его на триггер.
 *   Нажатие и уход фокуса мимо фокус не возвращают, как у Popover:
 *   пользователь уже там, куда нажал или навёл;
 * - **Tab.** Закрывает все меню (APG) и ведёт к остановке за корнем меню, а
 *   корня подменю не знает. Поэтому подменю сообщает о Tab меню над собой
 *   (`tab`), а то — дальше, до корня (`TMenuFocusPlugin`): тот закрывается и
 *   ведёт фокус, как Tab из своей панели. Так же доходит Tab из слоёв под
 *   подменю — его подменю и панелей его пунктов. Подписка — через реестр
 *   наборов коллекции (`listenNestedTabs`).
 */
export class TMenuSubmenuFocusPlugin extends TOverlayFocusPlugin<TMenuSubmenuFocusPluginEvents> {
	private _navigation: TMenuSubmenuKeyboardPlugin | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this._navigation = ctx.get(TMenuSubmenuKeyboardPlugin) ?? null

		// Приходит до закрытия (`TDismissPlugin` сообщает, потом закрывает)
		ctx.get(TDismissPlugin)?.events.on('dismiss', () => {
			this._restore = false
		})

		// Tab подменю и панелей пунктов ниже — дальше, к корню
		listenNestedTabs(ctx, (event) => this.events.emit('tab', event))
	}

	override destroy(): void {
		this._navigation = null

		super.destroy()
	}

	/** Фокус при открытии — строке подсвеченного пункта, без подсветки остаётся на строке. */
	protected override _focusCandidates(_panel: Element): readonly Element[] {
		const row = this._navigation?.highlightedRow

		return row ? [row] : []
	}

	/** Запомненного элемента нет — фокус на строку пункта. */
	protected override _returnCandidates(root: Element): readonly Element[] {
		const row = rowIn(root)

		return row ? [row] : []
	}

	/** Возвращать фокус, только пока он в подменю или нигде. */
	protected override _returnsFocus(root: Element): boolean {
		return holdsFocus(root, this._dismiss)
	}

	/** Tab в подменю — меню над ним: куда вести фокус, решает корень. */
	protected override _onTab(event: KeyboardEvent): void {
		this.events.emit('tab', event)
	}
}

/**
 * Слушать Tab вложенных слоёв этого меню — подменю и панелей пунктов с
 * панелью: их модели фокуса сообщают о нём событием (`tab`), а их наборы
 * лежат в реестре коллекции. Подписка — прямым `on`: шина плагина элемента
 * умирает вместе с его набором.
 */
export function listenNestedTabs(ctx: IPluginContext, onTab: (event: KeyboardEvent) => void): void {
	ctx.get(TCollectionBundlesPlugin)?.events.on('bundle:registered', ({ bundle }) => {
		bundle.get(TMenuSubmenuFocusPlugin)?.events.on('tab', onTab)
		bundle.get(TMenuPopoverItemFocusPlugin)?.events.on('tab', onTab)
	})
}
