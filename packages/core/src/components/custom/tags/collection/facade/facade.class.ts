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
	TTagsCollectionFacadeEvents,
} from '../types'
import type { ITagsItem } from '../../item/types'
import type { ITags } from '../../types'
import type { IPopover } from '../../../popover'

/**
 * Фасад коллекции Tags.
 *
 * Наследует `TSelectionCollectionFacade`, как ListBox: состав и выбор из
 * базы, `mode` по умолчанию `none` задаёт `TagsFactory`. Своё сверх базы —
 * деление показанного на ряд и панель (`overflow`): вид набора остаётся
 * свойством самого `TTags`, а вот кто где нарисован — членство в коллекции.
 */
export class TTagsCollectionFacade extends TSelectionCollectionFacade<
	ITagsItem,
	TTagsCollectionExtensions,
	TTagsCollectionFacadeEvents
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

		this.events.relayAll(this.extensions.overflow.events)

		this.applyProps(props)
	}

	/** Теги ряда. Вне `popover` — всё показанное. */
	get fitted(): ITagsItem[] {
		return this.extensions.overflow.fitted
	}

	/** Теги панели. Вне `popover` — пусто. */
	get overflowed(): ITagsItem[] {
		return this.extensions.overflow.overflowed
	}

	/**
	 * Инстанс панели с непоместившимися тегами — то, что `<Popover :ctrl>`
	 * берёт готовым. Создаёт его расширение, а не разметка: закрытие
	 * опустевшей панели тогда решается один раз в ядре.
	 */
	get panel(): IPopover | null {
		return this.extensions.overflow.panel
	}
}
