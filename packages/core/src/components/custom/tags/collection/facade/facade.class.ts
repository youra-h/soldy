import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import { TAGS_EXTENSIONS } from '../factory'
import { createEngineTags } from '../create'
import { completeEngine } from '../../../../base/collection/create/internal'
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
 * базы, `mode` по умолчанию `none` задаёт `TAGS_EXTENSIONS`. Своё сверх базы —
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
		options: TCollectionFacadeOptions<TTagsCollectionFacadeEngine, ITags>,
	) {
		// Движок пришёл снаружи — дособрать до компонента; нет — собрать свой.
		// Здесь, а не в теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: options.engine
					? completeEngine(options.engine, TAGS_EXTENSIONS(), options.owner)
					: createEngineTags({ owner: options.owner }),
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

	/**
	 * Место кнопки «…» в ряду — номер первого не поместившегося тега. Тег
	 * несёт свой номер стилем, и без такого же номера кнопка встаёт не в
	 * конец ряда, а сразу за первым тегом.
	 */
	get moreOrder(): number {
		return this.extensions.overflow.moreOrder
	}
}
