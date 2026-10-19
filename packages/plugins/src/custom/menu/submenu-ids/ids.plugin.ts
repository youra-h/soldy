import type { IMenuSubmenu } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TMenuSubmenuIdsPlugin — связка «пункт ↔ подменю» в документе (APG Menu).
 *
 * Обе стороны ссылаются друг на друга: у строки пункта — `id` и
 * `aria-controls` на панель (`aria` пункта, его разметка раскладывает на
 * строку), у панели — `id` и `aria-labelledby` на строку (`panelAria`). Имя
 * подменю — текст пункта: скринридер объявляет «Поделиться, меню». Пишутся
 * обе стороны здесь, от двух `id` одного монтирования: формула одна на обе.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытого подменю: панель всегда в документе, закрытие её
 * только прячет.
 */
export class TMenuSubmenuIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const submenu = ctx.getInstance<IMenuSubmenu>()

		if (!submenu) return

		const rowId = ctx.createId('row')
		const panelId = ctx.createId('panel')

		submenu.aria.add('id', rowId)
		submenu.aria.add('aria-controls', panelId)
		submenu.panelAria.add('id', panelId)
		submenu.panelAria.add('aria-labelledby', rowId)
	}
}
