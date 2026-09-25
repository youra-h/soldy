import { TSelectionCollectionFacade } from '../../../../base/collection'

import { SelectFactory, SELECT_EXTENSIONS, SELECT_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TSelectCollection,
	TSelectCollectionExtensions,
	TSelectCollectionFacadeOptions,
} from '../types'
import type { TSelectCollectionFacadeEvents } from '../types'
import type { ISelect } from '../../types'
import type { ISelectItem } from '../../item/types'
import type { TSelectExtension, TSelectTagsExtension } from '../extensions'
import type { ITags, TTagsCollection, TTagsOverflow } from '../../../tags'
import type { ISelectCollectionProps, TSelectCollectionFacadeProps } from '../types'
import type { TDefaultValues } from '../../../../base/component'

/**
 * Фасад коллекции Select.
 *
 * Состав, режим и выбранное — из базы. Своё — вычисленный набор для
 * разметки: ARIA списка.
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
		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Select. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: resolveEngine(
					options,
					SELECT_EXTENSIONS(),
					SELECT_OWNER_EXTENSIONS,
					'Select',
					SelectFactory,
				) as TSelectCollection,
			},
		)

		this.events.relayAll(this._tags.events)

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
	 * ARIA списка: роль, `id` и множественность.
	 *
	 * Проп, а не набор: список — это разметка внутри шаблона Select, своего
	 * компонента у него нет, значит нет и `aria`, в который можно писать. Та
	 * же асимметрия, что у панели Accordion.
	 */
	get list_aria(): Record<string, string | null> {
		return {
			role: 'listbox',
			id: this._select.listId,
			'aria-multiselectable': this.extensions.selection.multiple ? 'true' : null,
		}
	}

	/**
	 * Снять выбор целиком — кнопка очистки поля.
	 *
	 * Поле, привязанное к инстансу, а не метод прототипа: разметка отдаёт его
	 * в scope слота `clear` без инстанса, и своя кнопка зовёт его голой
	 * функцией. Метод потерял бы там `this`. Привязка здесь одна на все
	 * адаптеры — обёртку в шаблоне пришлось бы повторить в каждом.
	 */
	readonly clear = (): void => this._select.clear()

	private get _select(): TSelectExtension<ISelect, ISelectItem> {
		return this.extensions.select
	}

	private get _tags(): TSelectTagsExtension<ISelect, ISelectItem> {
		return this.extensions.tags
	}
}
