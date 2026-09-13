import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TSelectionFacadeProps } from '../../../../base/collection'
import { SelectFactory, SELECT_EXTENSIONS, SELECT_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TSelectCollection,
	TSelectCollectionExtensions,
	TSelectCollectionFacadeOptions,
} from '../types'
import type { ISelect } from '../../types'
import type { ISelectItem } from '../../item/types'
import type { TSelectExtension, TSelectTagsExtension } from '../extensions'
import type { ITags, TTagsCollection } from '../../../tags'

/**
 * Фасад коллекции Select.
 *
 * Состав, режим и выбранное — из базы. Своё — вычисленный набор для
 * разметки: ARIA списка.
 */
export class TSelectCollectionFacade extends TSelectionCollectionFacade<
	ISelectItem,
	TSelectCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<ISelectItem> = {},
		options: TSelectCollectionFacadeOptions = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Select. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super({}, {
			engine: resolveEngine(
				options,
				SELECT_EXTENSIONS(),
				SELECT_OWNER_EXTENSIONS,
				'Select',
				SelectFactory,
			) as TSelectCollection,
		})

		this.events.relay(this._tags.events, ['change:tags'])

		this.applyProps(props)
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

	/** Снять выбор целиком — кнопка очистки поля. */
	clear(): void {
		this._select.clear()
	}

	private get _select(): TSelectExtension<ISelect, ISelectItem> {
		return this.extensions.select
	}

	private get _tags(): TSelectTagsExtension<ISelect, ISelectItem> {
		return this.extensions.tags
	}
}
