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
	/** Ссылка окна на тело — по режиму; `null` — окна нет. */
	private _describe: (() => void) | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const dialog = ctx.getInstance<IDialog>()

		if (!dialog) return

		const bodyId = ctx.createId('body')
		const describe = (): void => {
			dialog.aria.add('aria-describedby', dialog.alert ? bodyId : null)
		}

		dialog.bodyAria.add('id', bodyId)

		this._describe = describe

		describe()
		this._listenTo(dialog.events, 'change:alert', describe)
	}

	/** Режим, сменившийся до принятия, подписка не застала — перечитать. */
	override attach(): void {
		super.attach()

		this._describe?.()
	}

	override destroy(): void {
		this._describe = null

		super.destroy()
	}
}
