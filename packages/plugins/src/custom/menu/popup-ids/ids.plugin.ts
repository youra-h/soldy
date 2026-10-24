import type { IMenuPopupItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TIdPlugin } from '../../id'

/**
 * TMenuPopupIdsPlugin — связка «пункт ↔ его панель» в документе: у пункта с
 * подменю (APG Menu) и у пункта с панелью (APG: пункт со всплывающим окном).
 *
 * Обе стороны ссылаются друг на друга: у строки пункта — `id` и
 * `aria-controls` на панель (`aria` пункта, его разметка раскладывает на
 * строку), у панели — `id` и `aria-labelledby` на строку (`panelAria`). Имя
 * панели — текст пункта: скринридер объявляет «Поделиться, меню» и «Срок,
 * диалог». Пишутся обе стороны здесь: формула одна на обе — и на оба вида
 * пункта, чья панель меню или диалог.
 *
 * `id` строки, заданный приложением (`TIdPlugin` пункта), главнее: он и
 * встаёт на строку, и на него ссылается панель. Сменили — плагин
 * переписывает обе стороны ссылки на строку, сняли — снова `id` от
 * монтирования. У панели `id` приложения нет, её `id` — формула.
 *
 * Без него — `id` от монтирования (`createId`), а не от экземпляра: он нужен
 * только документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытой панели: панель всегда в документе, закрытие её
 * только прячет.
 */
export class TMenuPopupIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const item = ctx.getInstance<IMenuPopupItem>()

		if (!item) return

		const idPlugin = ctx.get(TIdPlugin)
		const mountId = ctx.createId('row')
		const panelId = ctx.createId('panel')

		/** Обе стороны ссылки на строку: её `id` и `aria-labelledby` панели. */
		const linkRow = (): void => {
			const rowId = idPlugin?.id ?? mountId

			item.aria.add('id', rowId)
			item.panelAria.add('aria-labelledby', rowId)
		}

		item.panelAria.add('id', panelId)
		linkRow()
		item.aria.add('aria-controls', panelId)

		idPlugin?.events.on('change:id', linkRow)
	}
}
