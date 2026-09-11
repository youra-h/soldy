import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionEngine, TSelectionFacadeProps } from '../../../../base/collection'
import { TagsFactory, TAGS_EXTENSIONS, TAGS_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type { TTagsCollectionExtensions, TTagsCollectionFacadeOptions } from '../types'
import type { ITags } from '../../types'
import type { ITagsItem } from '../../item/types'
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
		options: TTagsCollectionFacadeOptions = {},
	) {
		const createEngine =
			options.factory ??
			(TagsFactory as unknown as (
				owner: ITags,
			) => TCollectionEngine<ITagsItem, TTagsCollectionExtensions>)

		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Tags. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super({}, {
			engine: resolveEngine(
				options,
				TAGS_EXTENSIONS(),
				TAGS_OWNER_EXTENSIONS,
				'Tags',
				createEngine as never,
			) as TCollectionEngine<ITagsItem, TTagsCollectionExtensions>,
		})

		this.applyProps(props)
	}

	get view(): TTagsView {
		return this.extensions.tags.view
	}
}
