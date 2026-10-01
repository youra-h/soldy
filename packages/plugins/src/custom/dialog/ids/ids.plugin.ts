import type { IDialog } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TModalIdsPlugin } from '../../overlay/modal-ids'

/**
 * TDialogIdsPlugin — связки окна в документе: имя от заголовка, как у любого
 * модального слоя (`TModalIdsPlugin`), и описание предупреждения.
 *
 * `id` тела — в `bodyAria`, который разметка раскладывает на тело, всегда.
 * Ссылка на него `aria-describedby` — в `aria` окна, и только у
 * предупреждения (`alert`): его тело и есть то, о чём спрашивают. У обычного
 * окна тело — форма, и скринридер зачитал бы её целиком. Сменился режим
 * (`change:alert`) — ссылка ставится или снимается.
 */
export class TDialogIdsPlugin extends TModalIdsPlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const dialog = ctx.getInstance<IDialog>()

		if (!dialog) return

		const bodyId = ctx.createId('body')
		const describe = (alert: boolean): void => {
			dialog.aria.add('aria-describedby', alert ? bodyId : null)
		}

		dialog.bodyAria.add('id', bodyId)

		describe(dialog.alert)
		this._listenTo(dialog.events, 'change:alert', describe)
	}
}
