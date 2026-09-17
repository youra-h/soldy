import type { ITabs, TTabsCollection } from '@soldy/core'
import {
	TBasePlugin,
	TCollectionBundlesPlugin,
	TElementPlugin,
	TTabsActiveTabPlugin,
} from '@soldy/plugins'
import type { IPluginContext, TActiveTabOffset } from '@soldy/plugins'

/**
 * TTabsViewPlugin — геометрия активного таба для темы.
 *
 * Слушает TTabsActiveTabPlugin (change:active-tab) и пишет на список табов
 * CSS-переменные: `--underline-pos`/`--underline-size` — полоса под активным
 * табом, `--gap-pos`/`--gap-size` — разрыв линии списка под ним. После
 * монтирования ставит модификатор `--ready-animation`: переходы полосы до него
 * не нужны, иначе она выезжала бы из угла при первой отрисовке.
 *
 * Плагин темы, а не библиотеки: переменные читает только CSS oren, у другой
 * темы полосы может не быть вовсе. Ставит его тема (`setup/plugins/install.ts`) на все
 * Tabs. Вид табов плагин не читает: переменные пишутся всегда, а какие из них
 * нужны виду, решает CSS.
 */
export class TTabsViewPlugin extends TBasePlugin<ITabs> {
	private _tabs: ITabs | null = null
	private _engine: TTabsCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._tabs = ctx.getInstance<ITabs>()

		ctx.get(TElementPlugin)?.events.on('ready', () => {
			this._tabs?.classes.add('--ready-animation')
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine as TTabsCollection
		})

		ctx.get(TTabsActiveTabPlugin)?.events.on('change:active-tab', (offset) => {
			this._updateUnderline(offset)
			this._updateGap(offset)
		})
	}

	override destroy(): void {
		this._tabs = null
		this._engine = null

		super.destroy()
	}

	/** Полоса под активным табом. */
	private _updateUnderline(offset: TActiveTabOffset | null): void {
		const tabs = this._tabs

		if (!offset || !this._engine || !tabs) return

		const activeItem = this._engine.extensions.activation.activeItem

		if (!activeItem && this._engine.extensions.tabs.hasEnabledTabs()) return

		const { listEl, offsetLeft, offsetWidth, offsetTop, offsetHeight } = offset

		if (tabs.orientation === 'vertical') {
			listEl.style.setProperty('--underline-pos', `${offsetTop}px`)
			listEl.style.setProperty('--underline-size', `${offsetHeight}px`)
		} else {
			listEl.style.setProperty('--underline-pos', `${offsetLeft}px`)
			listEl.style.setProperty('--underline-size', `${offsetWidth}px`)
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
}
