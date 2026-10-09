import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TDrawnEntry } from '../../../../base/collection'

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
 * Состав, режим и выбранное — из базы. Своё — теги поля и что рисует список
 * панели (`drawn`, расширение `draw`): без окна все показанные опции, в окне
 * обёртки `Virtual` — видимые и распорки на месте пропущенных, как у ListBox.
 */
export class TSelectCollectionFacade extends TSelectionCollectionFacade<
	ISelectItem,
	TSelectCollectionExtensions,
	TSelectCollectionFacadeEvents
> {
	/**
	 * Своё умолчание у фасада одно — режим переполнения ряда тегов: снятый из
	 * разметки проп связка возвращает к нему. Остальные ключи приходят от баз.
	 */
	static override defaultValues: typeof TSelectionCollectionFacade.defaultValues &
		TDefaultValues<ISelectCollectionProps, 'tags_overflow'> = {
		...TSelectionCollectionFacade.defaultValues,
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

	protected override applyProps(props: TSelectCollectionFacadeProps): void {
		if (props.tags_overflow) this.tags_overflow = props.tags_overflow

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

	private get _tags(): TSelectTagsExtension<ISelect, ISelectItem> {
		return this.extensions.tags
	}
}
