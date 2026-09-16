import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { TagsFactory, TAGS_EXTENSIONS, TAGS_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TTagsCollection,
	TTagsCollectionExtensions,
	TTagsCollectionFacadeEngine,
} from '../types'
import type { ITagsItem } from '../../item/types'
import type { ITags } from '../../types'
import type { TTagsView } from '../../types'

/**
 * Фасад коллекции Tags.
 *
 * Наследует `TSelectionCollectionFacade`, как ListBox: состав и выбор из
 * базы, `mode` по умолчанию `none` задаёт `TagsFactory`. Своё сверх базы —
 * `view`, как у ListBox: читает готовое значение у `tags`-расширения.
 */
export class TTagsCollectionFacade extends TSelectionCollectionFacade<
	ITagsItem,
	TTagsCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<ITagsItem> = {},
		options: TCollectionFacadeOptions<TTagsCollectionFacadeEngine, ITags> & {
			/** Фабрика движка коллекции — переопределяется наследником. */
			factory?: (owner: ITags) => TTagsCollection
		} = {},
	) {
		const createEngine = options.factory ?? TagsFactory

		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Tags. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: resolveEngine(
					options,
					TAGS_EXTENSIONS(),
					TAGS_OWNER_EXTENSIONS,
					'Tags',
					createEngine,
				) as TCollectionEngine<ITagsItem, TTagsCollectionExtensions>,
			},
		)

		this.applyProps(props)
	}

	get view(): TTagsView {
		return this.extensions.tags.view
	}
}
