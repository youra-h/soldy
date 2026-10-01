import type { ISelect } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TSelectIdsPlugin — связка «поле ↔ список» Select в документе.
 *
 * `id` списка — в `listAria`, который разметка раскладывает на список, и
 * ссылка на него `aria-controls` — в `aria` поля (`field.aria`): связку со
 * списком объявляет поле с `role="combobox"`, а не корень Select. Список
 * существует всегда — в отличие от панели у Tabs, которой может и не быть, —
 * поэтому ссылка стоит всегда.
 *
 * Сторона опций — у самих опций (`TSelectItemIdsPlugin`): у каждой своё
 * монтирование. `aria-activedescendant` берёт `id` подсвеченной опции из её
 * набора (`TSelectKeyboardPlugin`).
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 */
export class TSelectIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const select = ctx.getInstance<ISelect>()

		if (!select) return

		const listId = ctx.createId('list')

		select.listAria.add('id', listId)
		select.field.aria.add('aria-controls', listId)
	}
}
