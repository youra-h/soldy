import type { IMenu } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TMenuIdsPlugin — связка «кнопка ↔ меню» в документе (APG Menu Button).
 *
 * Обе стороны ссылаются друг на друга: у триггера — `id` и `aria-controls`
 * на панель (`triggerAria`), у панели — `id` и `aria-labelledby` на триггер
 * (`aria` меню, его разметка раскладывает на панель). Имя меню — текст
 * кнопки: скринридер объявляет «Действия, меню». Пишутся обе стороны здесь,
 * от двух `id` одного монтирования: формула одна на обе.
 *
 * Связка — у кнопки (`openOn: 'press'`). Контекстное меню вызывают над
 * областью, а она не кнопка: у неё ни `id` триггера, ни ссылки на панель, а
 * у панели — ссылки на имя, которого нет. Остаётся `id` панели — он её
 * собственный. Режим меняется на лету — связка ставится и снимается вместе
 * с ним, как подпись группы у `TMenuGroupIdsPlugin`.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытого меню: панель всегда в документе, закрытие её
 * только прячет.
 *
 * Шина меню бывает долговечнее плагина — приложение передаёт свой `ctrl`, —
 * поэтому подписка через `_listenTo`.
 */
export class TMenuIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const menu = ctx.getInstance<IMenu>()

		if (!menu) return

		const triggerId = ctx.createId('trigger')
		const panelId = ctx.createId('panel')

		menu.aria.add('id', panelId)

		const link = (): void => {
			const button = menu.openOn === 'press'

			menu.triggerAria.add('id', button ? triggerId : null)
			menu.triggerAria.add('aria-controls', button ? panelId : null)
			menu.aria.add('aria-labelledby', button ? triggerId : null)
		}

		link()
		this._listenTo(menu.events, 'change:openOn', link)
	}
}
