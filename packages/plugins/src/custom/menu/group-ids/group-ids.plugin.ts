import type { IMenuGroup } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TMenuGroupIdsPlugin — имя группы меню от её подписи.
 *
 * `id` подписи — в её набор (`labelAria`), ссылка на него — `aria-labelledby`
 * группы, пока подпись не пуста: без подписи разметка её не рисует, и ссылка
 * указывала бы в пустоту. Пишется при установке, синхронно, и на смену
 * подписи — связка есть уже в первой (и серверной) отрисовке. `id` — от
 * монтирования (`createId`): он нужен только документу.
 *
 * Шина группы бывает долговечнее плагина — приложение передаёт свой `ctrl`,
 * — поэтому подписка через `_listenTo`.
 */
export class TMenuGroupIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const group = ctx.getInstance<IMenuGroup>()

		if (!group) return

		const labelId = ctx.createId('label')

		group.labelAria.add('id', labelId)

		const refer = (): void => {
			group.aria.add('aria-labelledby', group.label ? labelId : null)
		}

		refer()
		this._listenTo(group.events, 'change:label', refer)
	}
}
