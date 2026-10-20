import { TGroupCollectionFacade } from '../../../../base/collection'
import type { TDrawnEntry, TDrawnSection } from '../../../../base/collection'

import { selectExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	TSelectCollection,
	TSelectCollectionExtensions,
	TSelectCollectionFacadeOptions,
} from '../types'
import type { TSelectCollectionFacadeEvents } from '../types'
import type { ISelect } from '../../types'
import type { ISelectItem } from '../../item/types'
import type { TSelectTagsExtension } from '../extensions'
import type { ITags, TTagsCollection, TTagsOverflow } from '../../../tags'
import type { ISelectCollectionProps, TSelectCollectionFacadeProps } from '../types'
import type { TDefaultValues } from '../../../../base/component'

/**
 * Фасад коллекции Select.
 *
 * Состав, режим, выбранное и группировка — из базы (`TGroupCollectionFacade`).
 * Своё — теги поля и что рисует список панели (расширение `draw`): без окна
 * все показанные опции, в окне обёртки `Virtual` — видимые и распорки на месте
 * пропущенных, как у ListBox, а по секциям группировки — `drawnSections`,
 * отсюда рисует разметка.
 */
export class TSelectCollectionFacade extends TGroupCollectionFacade<
	ISelectItem,
	TSelectCollectionExtensions,
	TSelectCollectionFacadeEvents
> {
	/**
	 * Своё умолчание у фасада одно — режим переполнения ряда тегов: снятый из
	 * разметки проп связка возвращает к нему. Остальные ключи приходят от баз.
	 */
	static override defaultValues: typeof TGroupCollectionFacade.defaultValues &
		TDefaultValues<ISelectCollectionProps, 'tags_overflow'> = {
		...TGroupCollectionFacade.defaultValues,
		tags_overflow: 'wrap',
	}

	constructor(
		props: TSelectCollectionFacadeProps = {},
		options: TSelectCollectionFacadeOptions = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Select. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, selectExtensions()) as TSelectCollection,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this._tags.events)
		this.events.relayAll(this.extensions.draw.events)

		this.applyProps(props)
	}

	/**
	 * Режим переполнения, равный умолчанию, не применяется: умолчание декларации
	 * фреймворк ставит и незаданному пропу, а движок снаружи свой режим не
	 * теряет.
	 */
	protected override applyProps(props: TSelectCollectionFacadeProps): void {
		const overflow = props.tags_overflow

		if (overflow && overflow !== TSelectCollectionFacade.defaultValues.tags_overflow) {
			this.tags_overflow = overflow
		}

		super.applyProps(props)
	}

	/**
	 * Инстанс тегов — только в `multiple`, иначе `null`. Связка «опция ⇄ тег»
	 * целиком в `TSelectTagsExtension`, фасад лишь читает готовый результат.
	 */
	get tags(): ITags | null {
		return this._tags.tags
	}

	/** Коллекция инстанса тегов — то, что `<Tags :engine="...">` берёт готовым. */
	get tags_engine(): TTagsCollection | null {
		return this._tags.engine
	}

	/**
	 * Что делать с тегами, которым не хватило строки поля: переносить,
	 * прокручивать или убирать хвост в панель. Хранит значение расширение —
	 * инстанс тегов живёт только в `multiple`, а выбор потребителя остаётся.
	 */
	get tags_overflow(): TTagsOverflow {
		return this._tags.overflow
	}

	set tags_overflow(value: TTagsOverflow) {
		this._tags.overflow = value
	}

	/**
	 * Что рисует список панели по порядку: опции на своих местах и, в окне,
	 * распорки на месте пропущенных. Без окна — все показанные опции
	 */
	get drawn(): ReadonlyArray<TDrawnEntry<ISelectItem>> {
		return this.extensions.draw.drawn
	}

	/**
	 * Что рисует список панели, по секциям группировки: группа с подписью или
	 * опции без группы, между соседними секциями — разделитель, если его
	 * просит Select (`groupSeparators`). Без групп секция одна — все записи
	 * `drawn`
	 */
	get drawnSections(): ReadonlyArray<TDrawnSection<ISelectItem>> {
		return this.extensions.draw.drawnSections
	}

	private get _tags(): TSelectTagsExtension<ISelect, ISelectItem> {
		return this.extensions.tags
	}
}
