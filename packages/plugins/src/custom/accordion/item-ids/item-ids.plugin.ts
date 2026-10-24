import type { IAccordionItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TIdPlugin } from '../../id'

/**
 * TAccordionItemIdsPlugin — связка «заголовок ↔ панель» секции Accordion в
 * документе.
 *
 * Обе стороны — в наборах секции. В `aria` (он стоит на заголовке) — `id`
 * заголовка и `aria-controls` на панель. В `contentAria` (он стоит на панели) —
 * `id` панели и `aria-labelledby` на заголовок. Формула одна, здесь.
 *
 * `id` заголовка, заданный приложением (`TIdPlugin` секции), главнее: он и
 * встаёт на заголовок, и на него ссылается панель. Сменили — плагин
 * переписывает обе стороны ссылки на заголовок, сняли — снова `id` от
 * монтирования. У панели `id` приложения нет, её `id` — формула.
 *
 * Без него — `id` от монтирования секции (`createId`), а не от экземпляра: он
 * нужен только документу, и на сервере и в браузере обязан совпасть. Секция
 * из данных рисуется с готовым экземпляром (`ctrl`), и его конструктор адаптер
 * не зовёт, а монтирование у неё своё. Пишется при установке, синхронно, —
 * связка есть уже в первой (и серверной) отрисовке.
 */
export class TAccordionItemIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const section = ctx.getInstance<IAccordionItem>()

		if (!section) return

		const idPlugin = ctx.get(TIdPlugin)
		const mountId = ctx.createId('header')
		const contentId = ctx.createId('content')

		/** Обе стороны ссылки на заголовок: его `id` и `aria-labelledby` панели. */
		const linkHeader = (): void => {
			const headerId = idPlugin?.id ?? mountId

			section.aria.add('id', headerId)
			section.contentAria.add('aria-labelledby', headerId)
		}

		section.contentAria.add('id', contentId)
		linkHeader()
		section.aria.add('aria-controls', contentId)

		idPlugin?.events.on('change:id', linkHeader)
	}
}
