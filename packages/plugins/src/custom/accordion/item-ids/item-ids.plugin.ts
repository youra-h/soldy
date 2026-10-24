import type { IAccordionItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TAccordionItemIdsPlugin — связка «заголовок ↔ панель» секции Accordion в
 * документе.
 *
 * Обе стороны — в наборах секции. В `aria` (он стоит на заголовке) — `id`
 * заголовка и `aria-controls` на панель. В `contentAria` (он стоит на панели) —
 * `id` панели и `aria-labelledby` на заголовок. Формула одна, здесь.
 *
 * **Свой `id` секции главнее** (`id` — вход секции, значение потребителя): он
 * и встаёт на заголовок, и на него ссылается панель. Атрибутом мимо набора
 * `id` на заголовок не попадает — адаптеры отдают его входу, — поэтому на
 * заголовке он один. Сменили — плагин переписывает обе стороны ссылки на
 * заголовок, сняли — снова `id` от монтирования. `id` панели своего входа не
 * имеет и остаётся формулой.
 *
 * Без своего — `id` от монтирования секции (`createId`), а не от экземпляра:
 * он нужен только документу, и на сервере и в браузере обязан совпасть.
 * Секция из данных рисуется с готовым экземпляром (`ctrl`), и его конструктор
 * адаптер не зовёт, а монтирование у неё своё. Пишется при установке,
 * синхронно, — связка есть уже в первой (и серверной) отрисовке.
 *
 * Шина секции бывает долговечнее плагина — приложение передаёт свой `ctrl`, а
 * секция из данных переживает своё монтирование, — поэтому подписка через
 * `_listenTo`.
 */
export class TAccordionItemIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const section = ctx.getInstance<IAccordionItem>()

		if (!section) return

		const mountId = ctx.createId('header')
		const contentId = ctx.createId('content')

		/** Обе стороны ссылки на заголовок: его `id` и `aria-labelledby` панели. */
		const linkHeader = (): void => {
			const headerId = section.id ?? mountId

			section.aria.add('id', headerId)
			section.contentAria.add('aria-labelledby', headerId)
		}

		section.contentAria.add('id', contentId)
		linkHeader()
		section.aria.add('aria-controls', contentId)

		this._listenTo(section.events, 'change:id', linkHeader)
	}
}
