import { TCollectionComponent } from '../../../base/collection'
import type {
	TCollectionFacadeProps,
	TSelectionMode,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import { SelectFactory } from './factory'
import type {
	TSelectCollectionExtensions,
	TSelectCollectionFacadeOptions,
} from './types'
import type { ISelect } from '../types'
import type { ISelectItem } from '../item/types'
import type { TSelectExtension } from './extensions'

/**
 * Фасад коллекции Select.
 *
 * Выставляет членство в коллекции как обычные свойства компонента: опции,
 * режим выбора, выбранное. Плюс два вычисленных набора для разметки —
 * текст выбранного и ARIA списка.
 */
export class TSelectCollectionFacade extends TCollectionComponent<
	ISelectItem,
	TSelectCollectionExtensions
> {
	constructor(
		props: TCollectionFacadeProps<ISelectItem> & { mode?: TSelectionMode } = {},
		options: TSelectCollectionFacadeOptions = {},
	) {
		super({}, { engine: options.engine ?? SelectFactory(options.owner as ISelect) })

		// `mode` до опций: он решает, сколько их можно выбрать
		if (props.mode) this.mode = props.mode

		if (props.items?.length) this.items = props.items
		if (props.trackBy) this.trackBy = props.trackBy

		this.events.relay(this._batch.events, ['items:added', 'items:removed', 'change:trackBy'])
		this.events.relay(this._selection.events, ['change:selection', 'change:mode'])
		this.events.relay(this._select.events, ['change:valueText'])
	}

	get items(): ReadonlyArray<ISelectItem> {
		return this._batch.items
	}

	set items(value: any) {
		this._batch.update(value)
	}

	get trackBy(): ((item: ISelectItem) => any) | undefined {
		return this._batch.trackBy
	}

	set trackBy(fn: ((item: ISelectItem) => any) | undefined) {
		this._batch.trackBy = fn
	}

	get mode(): TSelectionMode {
		return this._selection.mode
	}

	set mode(value: TSelectionMode) {
		this._selection.mode = value
	}

	get selected(): ISelectItem[] {
		return this._selection.selected
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
	 * же асимметрия, что у панели Collapse.
	 */
	get list_aria(): Record<string, string | null> {
		return {
			role: 'listbox',
			id: this._select.listId,
			'aria-multiselectable': this._selection.multiple ? 'true' : null,
		}
	}

	/** Снять выбор целиком — кнопка очистки поля. */
	clear(): void {
		this._select.clear()
	}

	private get _batch(): TBatchExtension<ISelectItem> {
		return this.extensions.batch
	}

	private get _selection(): TSelectionExtension<ISelectItem> {
		return this.extensions.selection
	}

	private get _select(): TSelectExtension<ISelect, ISelectItem> {
		return this.extensions.select
	}
}
