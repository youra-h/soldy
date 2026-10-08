import { TBasePlugin } from '../base'
import type { IPluginContext } from '../base'
import type { ILocaleOwner } from './types'

/**
 * TLocalePlugin — язык монтирования компоненту: тег локали в `locale`.
 *
 * Пишет владельцу тег локали поддерева (`ctx.locale`) при установке,
 * синхронно, — поэтому подписи дат на языке приложения есть уже в первой
 * отрисовке, и в серверной тоже. Смену локали пишет на лету: компонент не
 * перемонтируется. Подписка на источник живёт, пока жив набор, — её снимает
 * `destroy()` базы.
 *
 * Язык — не строка разметки, а вход модели: календарь считает им сетку и
 * первый день недели, поле даты — порядок частей, таблица — сравнение строк.
 * Поэтому он свойство ядра (без setup его задаёт код), а пишет его плагин:
 * язык знает место компонента в дереве, а не экземпляр. Своего языка у
 * компонента в разметке нет: плагин переписывает и `locale` внешнего `ctrl`.
 *
 * Владельца плагин знает по контракту (`ILocaleOwner`), а не по классу:
 * календарь, поле даты, DatePicker и таблица общего предка не имеют.
 */
export class TLocalePlugin extends TBasePlugin<ILocaleOwner> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<ILocaleOwner>()

		if (!owner) return

		owner.locale = ctx.locale.locale.tag

		this._listenTo(ctx.locale.events, 'change', (locale) => {
			owner.locale = locale.tag
		})
	}
}
