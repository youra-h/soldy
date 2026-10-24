import type { ITabsItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TIdPlugin } from '../../id'

/**
 * TTabsItemIdsPlugin — связка «таб ↔ панель» в документе со стороны таба.
 *
 * Пишет в `aria` таба его `id` и `aria-controls` — `id` его панели; других
 * писателей у этих атрибутов нет. Панель своей формулы не держит: проводка
 * `Tabs.Content` (`TTabsContentBindingExtension`) берёт у таба, которого нашла
 * по `value`, его `id` себе в `aria-labelledby`, а `id` себе — из
 * `aria-controls`, если своего у неё нет, — и идёт за ними на каждую смену
 * набора таба (`change:aria`).
 *
 * `id`, заданный приложением, главнее `id` от монтирования — с обеих сторон
 * связки. Свой `id` таба (`TIdPlugin` таба) встаёт на строку таба, и на него
 * ссылается панель. Свой `id` панели (`TIdPlugin` панели) таб узнаёт от
 * связки: принятая панель отдаёт плагину свой `TIdPlugin` (`bindPanel`), и
 * `aria-controls` ведёт на `id` из него, отвязанная (`unbindPanel`) — снова на
 * формулу. Сменили или сняли `id` с любой стороны — плагин переписывает набор,
 * и панель идёт следом.
 *
 * Без них — `id` от монтирования, а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Таб из данных
 * рисуется с готовым экземпляром (`ctrl`), и его конструктор адаптер не зовёт,
 * а монтирование у него своё. Пишется при установке, синхронно, — связка таба
 * есть уже в первой (и серверной) отрисовке. Свой `id` панели приходит позже,
 * со входом панели: таб в разметке раньше неё, и в разметке сервера его
 * `aria-controls` ведёт на формулу, а у панели уже свой `id` — ссылка сходится
 * после гидратации. Плата: `aria-controls` стоит и тогда, когда `Tabs.Content`
 * в разметке нет вовсе; в паттерне вкладок панель обязательна.
 */
export class TTabsItemIdsPlugin extends TBasePlugin {
	/** Таб — с установки; после `destroy()` писать некуда. */
	private _tab: ITabsItem | null = null
	/** `id` панели от монтирования таба — пока своего у панели нет. */
	private _formula = ''
	/** `TIdPlugin` привязанной панели: `id`, который ей задало приложение. */
	private _panel: TIdPlugin | undefined

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const tab = ctx.getInstance<ITabsItem>()

		if (!tab) return

		const idPlugin = ctx.get(TIdPlugin)
		const mountId = ctx.createId('tab')
		const write = (): void => {
			tab.aria.add('id', idPlugin?.id ?? mountId)
		}

		this._tab = tab
		this._formula = ctx.createId('panel')

		write()
		this._writeControls()

		idPlugin?.events.on('change:id', write)
	}

	/**
	 * Панель таба отдаёт свой `TIdPlugin`: `aria-controls` ведёт на `id`,
	 * который ей задало приложение, и идёт за его сменой; не задан — на
	 * формулу. Зовёт связка панели, когда принятая панель нашла таб. Панель у
	 * таба одна: привязанная следом заменяет прежнюю.
	 */
	bindPanel(panel: TIdPlugin): void {
		if (this._panel === panel) return

		this._panel?.events.off('change:id', this._writeControls)
		this._panel = panel
		panel.events.on('change:id', this._writeControls)
		this._writeControls()
	}

	/**
	 * Панель отвязалась: `aria-controls` — снова на формулу. Чужую панель
	 * отвязка не трогает: новое монтирование панели бывает принято раньше,
	 * чем снято прежнее.
	 */
	unbindPanel(panel: TIdPlugin): void {
		if (this._panel !== panel) return

		panel.events.off('change:id', this._writeControls)
		this._panel = undefined
		this._writeControls()
	}

	/**
	 * Шина `TIdPlugin` панели плагину чужая: панель переживает монтирование
	 * таба — таб из данных монтируется заново, когда его показывают снова.
	 */
	override destroy(): void {
		this._panel?.events.off('change:id', this._writeControls)
		this._panel = undefined
		this._tab = null

		super.destroy()
	}

	/** `aria-controls` — на `id` панели: свой, если его задали, иначе формула. */
	private readonly _writeControls = (): void => {
		this._tab?.aria.add('aria-controls', this._panel?.id ?? this._formula)
	}
}
