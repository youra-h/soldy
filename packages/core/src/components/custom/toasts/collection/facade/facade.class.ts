import { TBatchCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TCollectionFacadeProps,
} from '../../../../base/collection'
import { completeEngine } from '../../../../base/collection/create/internal'
import { toastsExtensions } from '../factory'
import type {
	TToastsCollectionExtensions,
	TToastsCollectionFacadeEngine,
	TToastsCollectionFacadeEvents,
} from '../types'
import type { IToastsItem } from '../../item/types'
import type { IToasts } from '../../types'

/**
 * Фасад коллекции Toasts.
 *
 * Состав — из базы с `batch`: выбора и активации у тостов нет, и база
 * повторяет состав расширений. Своего сверх неё нет — события очереди
 * (`item:close`) фасад отдаёт наружу `relayAll`, команды остаются у
 * расширения `toasts`.
 */
export class TToastsCollectionFacade extends TBatchCollectionFacade<
	IToastsItem,
	TToastsCollectionExtensions,
	TToastsCollectionFacadeEvents
> {
	constructor(
		props: TCollectionFacadeProps<IToastsItem> = {},
		options: TCollectionFacadeOptions<TToastsCollectionFacadeEngine, IToasts> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Toasts. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, toastsExtensions()) as TCollectionEngine<
					IToastsItem,
					TToastsCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.toasts.events)

		this.applyProps(props)
	}
}
