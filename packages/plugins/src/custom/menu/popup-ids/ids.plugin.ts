import type { IMenuPopupItem, IMenuPopupItemProps, TMenuPopupItemEvents } from '@soldy-ui/core'
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
 * диалог». Пишутся обе стороны здесь: формула одна на обе — и на оба вида
 * пункта, чья панель меню или диалог.
 *
 * **Свой `id` пункта главнее** (`id` — вход пункта, значение потребителя): он
 * и встаёт на строку, и на него ссылается панель. Атрибутом мимо набора `id`
 * на строку не попадает — адаптеры отдают его входу, — поэтому на строке он
 * один. Сменили — плагин переписывает обе стороны ссылки на строку, сняли —
 * снова `id` от монтирования. `id` панели своего входа не имеет и остаётся
 * формулой.
 *
 * Без своего — `id` от монтирования (`createId`), а не от экземпляра: он нужен
 * только документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытой панели: панель всегда в документе, закрытие её
 * только прячет.
 *
 * Шина пункта бывает долговечнее плагина — приложение передаёт свой `ctrl`, а
 * подменю из данных переживает своё монтирование, — поэтому подписка через
 * `_listenTo`. Карта событий пункта названа точно: у интерфейса пункта она по
 * умолчанию стёрта (`any`).
 */
export class TMenuPopupIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const item = ctx.getInstance<IMenuPopupItem<IMenuPopupItemProps, TMenuPopupItemEvents>>()

		if (!item) return

		const mountId = ctx.createId('row')
		const panelId = ctx.createId('panel')

		/** Обе стороны ссылки на строку: её `id` и `aria-labelledby` панели. */
		const linkRow = (): void => {
			const rowId = item.id ?? mountId

			item.aria.add('id', rowId)
			item.panelAria.add('aria-labelledby', rowId)
		}

		item.panelAria.add('id', panelId)
		linkRow()
		item.aria.add('aria-controls', panelId)

		this._listenTo(item.events, 'change:id', linkRow)
	}
}
