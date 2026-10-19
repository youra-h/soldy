import type { IMenuPopupItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TMenuPopupIdsPlugin — связка «пункт ↔ его панель» в документе: у пункта с
 * подменю (APG Menu) и у пункта с панелью (APG: пункт со всплывающим окном).
 *
 * Обе стороны ссылаются друг на друга: у строки пункта — `id` и
 * `aria-controls` на панель (`aria` пункта, его разметка раскладывает на
 * строку), у панели — `id` и `aria-labelledby` на строку (`panelAria`). Имя
 * панели — текст пункта: скринридер объявляет «Поделиться, меню» и «Срок,
 * диалог». Пишутся обе стороны здесь, от двух `id` одного монтирования:
 * формула одна на обе — и на оба вида пункта, чья панель меню или диалог.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытой панели: панель всегда в документе, закрытие её
 * только прячет.
 */
export class TMenuPopupIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const item = ctx.getInstance<IMenuPopupItem>()

		if (!item) return

		const rowId = ctx.createId('row')
		const panelId = ctx.createId('panel')

		item.aria.add('id', rowId)
		item.aria.add('aria-controls', panelId)
		item.panelAria.add('id', panelId)
		item.panelAria.add('aria-labelledby', rowId)
	}
}
