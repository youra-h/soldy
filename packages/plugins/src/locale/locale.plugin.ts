import { TBasePlugin } from '../base'
import type { IPluginContext } from '../base'
import { localeStore } from './store'
import type { ILocaleOwner } from './types'

/**
 * TLocalePlugin — язык приложения компоненту.
 *
 * Пишет владельцу язык из `useLocale` при установке, синхронно, — поэтому
 * подписи дат на языке приложения есть уже в первой отрисовке, и в серверной
 * тоже, как имена у `TAriaPlugin`. Смену языка пишет на лету: компонент не
 * перемонтируется. Подписка на хранилище живёт, пока жив набор, — её снимает
 * `destroy()` базы.
 *
 * Своего языка у компонента нет: плагин переписывает и `locale` внешнего
 * `ctrl`. Свойство в ядре остаётся для тех, кто работает с ядром без setup.
 *
 * Владельца плагин знает по контракту (`ILocaleOwner`), а не по классу:
 * календарь, поле даты, DatePicker и таблица общего предка не имеют.
 */
export class TLocalePlugin extends TBasePlugin<ILocaleOwner> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<ILocaleOwner>()

		if (!owner) return

		owner.locale = localeStore.locale

		this._listenTo(localeStore.events, 'change:locale', (locale) => {
			owner.locale = locale
		})
	}
}
