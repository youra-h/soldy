import type { ITabs, ITabsItem, TTabsCollection } from '@soldy-ui/core'
import {
	TBasePlugin,
	TCollectionBundlesPlugin,
	TElementPlugin,
	TTabsActiveTabPlugin,
} from '@soldy-ui/plugins'
import type { IPluginContext, TActiveTabOffset } from '@soldy-ui/plugins'
import { afterPseudoTransitions } from './transitions'

/** Признак переезда на списке: пока он стоит, тема ведёт геометрию переходом. */
const MOVING = '--active-tab-moving'

/**
 * TTabsViewPlugin — геометрия активного таба для темы.
 *
 * Слушает TTabsActiveTabPlugin (change:active-tab) и пишет на список табов
 * CSS-переменные: `--active-tab-pos`/`--active-tab-size` — место и длина
 * активного таба по главной оси (по ним тема рисует полосу `line` и карточку
 * `contained`), `--gap-pos`/`--gap-size` — разрыв линии списка под ним. Когда
 * узел готов, ставит модификатор `--ready-animation` — знак теме, что
 * геометрия меряется: замер монтирования к этому времени уже записан. До
 * модификатора тема рисует без переменных: полосу без перехода, иначе она
 * выезжала бы из угла, карточку — фоном самого выбранного таба.
 *
 * **Признак переезда.** Сменился активный таб между двумя записанными —
 * плагин ставит на список `--active-tab-moving: 1` в той же записи, что и
 * новое место, и тема ведёт его переходом. Без признака идут первая запись,
 * нули при отсутствии активного таба и пересчёт того же таба — ресайз, сдвиг
 * от закрытия соседа, смена вида: геометрия встаёт на место сразу и не
 * отстаёт от текста таба. Признак снимается, когда доиграли переходы
 * псевдоэлементов списка — ими тема рисует геометрию (`transitions.ts`), — а
 * пока он стоит, каждая запись ждёт их заново: так переходом доезжает и сдвиг
 * посреди переезда — сосед встал на место закрытого таба. Каких именно
 * псевдоэлементов, плагин не выбирает: вида он не читает. Признак —
 * переменная, а не класс: класс дошёл бы до разметки только в цикле адаптера,
 * а переменные пишутся сразу, и переход должен увидеть новое место уже с
 * признаком.
 *
 * Плагин темы, а не библиотеки: переменные читает только CSS oren, у другой
 * темы полосы может не быть вовсе. Ставит его тема (`setup/plugins/install.ts`) на все
 * Tabs. Вид табов плагин не читает: переменные пишутся всегда, а какие из них
 * нужны виду, решает CSS.
 */
export class TTabsViewPlugin extends TBasePlugin<ITabs> {
	private _tabs: ITabs | null = null
	private _engine: TTabsCollection | null = null
	/**
	 * Таб, чьё место плагин записал последним; `null` — ещё не записывал или
	 * записал нули: активного таба не было.
	 */
	private _drawn: ITabsItem | null = null
	/** Список, на котором стоит признак переезда; `null` — признака нет. */
	private _moving: HTMLElement | null = null
	/** Отмена ожидания конца переезда; `null` — плагин не ждёт. */
	private _stopWaiting: (() => void) | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._tabs = ctx.getInstance<ITabs>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', () => {
			this._tabs?.classes.add('--ready-animation')
		})

		// Новый узел до замера рисуется как без плагина — статично
		element?.events.on('removed', () => this._forget())

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine as TTabsCollection
		})

		ctx.get(TTabsActiveTabPlugin)?.events.on('change:active-tab', (offset) => {
			this._updateActiveTab(offset)
			this._updateGap(offset)
		})
	}

	override destroy(): void {
		this._forget()
		this._tabs = null
		this._engine = null

		super.destroy()
	}

	/** Место и длина активного таба по главной оси. */
	private _updateActiveTab(offset: TActiveTabOffset | null): void {
		const tabs = this._tabs
		const engine = this._engine

		if (!offset || !engine || !tabs) return

		const active = engine.extensions.activation.activeItem ?? null

		// Активного нет, а перейти есть куда: запись пропущена, и записанный
		// таб остаётся прежним
		if (!active && engine.extensions.tabs.hasEnabledTabs()) return

		const { listEl, offsetLeft, offsetWidth, offsetTop, offsetHeight } = offset

		if (this._drawn && active && active !== this._drawn) this._startMoving(listEl)

		this._drawn = active

		if (tabs.orientation === 'vertical') {
			listEl.style.setProperty('--active-tab-pos', `${offsetTop}px`)
			listEl.style.setProperty('--active-tab-size', `${offsetHeight}px`)
		} else {
			listEl.style.setProperty('--active-tab-pos', `${offsetLeft}px`)
			listEl.style.setProperty('--active-tab-size', `${offsetWidth}px`)
		}

		// Пока признак стоит, конец переезда ждётся от последней записи
		if (this._moving === listEl) {
			this._stopWaiting?.()
			this._stopWaiting = afterPseudoTransitions(listEl, () => this._stopMoving())
		}
	}

	/** Разрыв линии списка под активным табом. */
	private _updateGap(offset: TActiveTabOffset | null): void {
		const tabs = this._tabs

		if (!offset || !this._engine || !tabs) return

		const { listEl, offsetLeft, offsetWidth, offsetTop, offsetHeight } = offset

		if (tabs.orientation === 'vertical') {
			listEl.style.setProperty('--gap-pos', `${offsetTop + 1}px`)
			listEl.style.setProperty('--gap-size', `${offsetHeight - 1}px`)
		} else {
			listEl.style.setProperty('--gap-pos', `${offsetLeft + 1}px`)
			listEl.style.setProperty('--gap-size', `${offsetWidth - 1}px`)
		}
	}

	/** Признак переезда на список — до записи нового места. */
	private _startMoving(list: HTMLElement): void {
		if (this._moving !== list) this._stopMoving()

		list.style.setProperty(MOVING, '1')
		this._moving = list
	}

	/** Снять признак переезда и ожидание его конца. */
	private _stopMoving(): void {
		this._stopWaiting?.()
		this._stopWaiting = null

		this._moving?.style.removeProperty(MOVING)
		this._moving = null
	}

	/**
	 * Забыть всё, что плагин нарисовал: узел снят или плагин уничтожен. Новый
	 * узел до первого замера получит прежнюю разметку без переменных — тема
	 * рисует её статично, — а его первая запись идёт без признака.
	 */
	private _forget(): void {
		this._stopMoving()
		this._drawn = null
		this._tabs?.classes.remove('--ready-animation')
	}
}
