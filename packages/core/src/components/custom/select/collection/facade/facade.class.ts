import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TSelectionFacadeProps } from '../../../../base/collection'
import { SelectFactory } from '../factory'
import type { TSelectCollectionExtensions, TSelectCollectionFacadeOptions } from '../types'
import type { ISelect } from '../../types'
import type { ISelectItem } from '../../item/types'
import type { TSelectExtension } from '../extensions'

/**
 * Фасад коллекции Select.
 *
 * Состав, режим и выбранное — из базы. Своё — два вычисленных набора для
 * разметки: текст выбранного и ARIA списка.
 */
export class TSelectCollectionFacade extends TSelectionCollectionFacade<
	ISelectItem,
	TSelectCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<ISelectItem> = {},
		options: TSelectCollectionFacadeOptions = {},
	) {
		super({}, { engine: options.engine ?? SelectFactory(options.owner as ISelect) })

		this.events.relay(this._select.events, ['change:valueText'])

		this.applyProps(props)
	}

	/**
	 * Текст выбранного — то, что поле показывает вместо `placeholder`.
	 *
	 * Проп фасада, а не поле ядра: текст складывается из опций, а о них знает
	 * коллекция. У `TValueControl` своего `text` нет вовсе — `TTextable`
	 * растёт из `TControl` соседней ветвью.
	 */
	get valueText(): string {
		return this._select.valueText
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
}
