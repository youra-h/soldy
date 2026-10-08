import type { ITranslatable } from '@soldy-ui/core'
import { TBasePlugin } from '../base'
import type { IPluginContext } from '../base'
import { localeStore } from './store'

/**
 * TTranslationsPlugin — словарь приложения компоненту.
 *
 * Пишет владельцу словарь из `useTranslations` при установке, синхронно, —
 * поэтому имена кнопок на языке приложения есть уже в первой отрисовке, и в
 * серверной тоже. Смену словаря пишет на лету: компонент не перемонтируется,
 * а имена, собранные из словаря, приходят разметке готовыми выходами. Подписка
 * на хранилище живёт, пока жив набор, — её снимает `destroy()` базы.
 *
 * Своих строк у компонента нет: плагин переписывает и `translations`
 * внешнего `ctrl`. Свойство в ядре остаётся для тех, кто работает с ядром без
 * setup.
 *
 * Владельца плагин знает по контракту (`ITranslatable`), а не по классу:
 * словарь читают окно, поповер, табы, теги, лента, поле, таблица и даты.
 */
export class TTranslationsPlugin extends TBasePlugin<ITranslatable> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<ITranslatable>()

		if (!owner) return

		owner.translations = localeStore.translations

		this._listenTo(localeStore.events, 'change:translations', (translations) => {
			owner.translations = translations
		})
	}
}
