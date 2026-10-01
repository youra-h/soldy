import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { tagsExtensions } from '../factory'
import { withOwnerIds, completeEngine } from '../../../../base/collection/create/internal'
import type {
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
 * базы, `mode` по умолчанию `none` задаёт `tagsExtensions`. Своё сверх базы —
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
		options: TCollectionFacadeOptions<TTagsCollectionFacadeEngine, ITags> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Tags. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: withOwnerIds(
					completeEngine(options.engine, tagsExtensions()),
					options.owner,
				) as TCollectionEngine<ITagsItem, TTagsCollectionExtensions>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

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

	/**
	 * Место кнопки «…» в ряду — номер первого не поместившегося тега. Тег
	 * несёт свой номер стилем, и без такого же номера кнопка встаёт не в
	 * конец ряда, а сразу за первым тегом.
	 */
	get moreOrder(): number {
		return this.extensions.overflow.moreOrder
	}
}
