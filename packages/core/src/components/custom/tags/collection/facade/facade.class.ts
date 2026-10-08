import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { tagsExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TTagsCollectionExtensions, TTagsCollectionFacadeEngine } from '../types'
import type { ITagsItem } from '../../item/types'
import type { ITags } from '../../types'

/**
 * Фасад коллекции Tags.
 *
 * Наследует `TSelectionCollectionFacade`, как ListBox: состав и выбор из
 * базы, `mode` по умолчанию `none` задаёт `tagsExtensions`. Своего сверх базы
 * нет: вид и раскладка ряда — свойства самого `TTags`, а не членство в
 * коллекции.
 */
export class TTagsCollectionFacade extends TSelectionCollectionFacade<
	ITagsItem,
	TTagsCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<ITagsItem> = {},
		options: TCollectionFacadeOptions<TTagsCollectionFacadeEngine, ITags> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Tags. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, tagsExtensions()) as TCollectionEngine<
					ITagsItem,
					TTagsCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.applyProps(props)
	}
}
