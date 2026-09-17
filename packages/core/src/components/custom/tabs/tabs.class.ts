import { TControl } from '../../base/control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type {
	ITabs,
	ITabsProps,
	TTabsEvents,
	TTabsStates,
	TTabsOrientation,
	TTabsAlignment,
	TTabsPosition,
	TTabsView,
} from './types'

/**
 * Компонент табов (TTabs).
 * Управляет коллекцией табов на базе TCollectionEngine с расширениями (Plain, Batch, Selection).
 */
export class TTabs extends TControl<ITabsProps, TTabsEvents, TTabsStates> implements ITabs {
	static override baseClass = 's-tabs'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<ITabsProps, 'orientation' | 'alignment' | 'position' | 'closable', 'view'> =
		{
			...TControl.defaultValues,
			orientation: 'horizontal',
			alignment: 'start',
			position: 'start',
			view: undefined,
			closable: false,
		}

	protected _orientation!: TTabsOrientation
	protected _alignment!: TTabsAlignment
	protected _position!: TTabsPosition
	protected _view: TTabsView | undefined
	protected _closable!: boolean

	constructor(props: Partial<ITabsProps> = {}, options: IComponentOptions<TTabsStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTabs

		// Набор `aria` владельца — это список табов: разметка биндит его на
		// `.s-tabs__list`, а не на корень, где рядом со списком лежат панели.
		// Туда же доходят имя из `aria_label` и `aria-disabled`.
		this._aria.add('role', 'tablist')

		this._applyOrientation(props.orientation ?? ctor.defaultValues.orientation)
		this._applyAlignment(props.alignment ?? ctor.defaultValues.alignment)
		this._applyPosition(props.position ?? ctor.defaultValues.position)
		this._applyView(props.view ?? ctor.defaultValues.view)

		this._closable = props.closable ?? ctor.defaultValues.closable
	}

	get orientation(): TTabsOrientation {
		return this._orientation
	}

	set orientation(value: TTabsOrientation) {
		if (this._orientation !== value) {
			this._applyOrientation(value, this._orientation)
			this.events.emit('change:orientation', value)
		}
	}

	protected _applyOrientation(newValue: TTabsOrientation, oldValue?: TTabsOrientation) {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		// Не для вида: по ориентации скринридер объявляет, какими стрелками
		// ходить по списку, — у вертикального это ↑/↓ (`TTabsKeyboardPlugin`)
		this._aria.add('aria-orientation', newValue)
		this._orientation = newValue
	}

	/**
	 * `aria` стоит на списке табов — вложенном `div`, а не на корне. Поэтому
	 * ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает тег
	 * списка, а не `tag`: своего `disabled` у `div` нет, и выключенный список
	 * сообщает о себе `aria-disabled` при любом теге корня.
	 */
	protected override get _ariaTag(): string {
		return 'div'
	}

	get alignment(): TTabsAlignment {
		return this._alignment
	}

	set alignment(value: TTabsAlignment) {
		if (this._alignment !== value) {
			this._applyAlignment(value, this._alignment)
			this.events.emit('change:alignment', value)
		}
	}

	protected _applyAlignment(newValue: TTabsAlignment, oldValue?: TTabsAlignment) {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: newValue !== 'start' ? `--${newValue}` : '',
		})
		this._alignment = newValue
	}

	get position(): TTabsPosition {
		return this._position
	}

	set position(value: TTabsPosition) {
		if (this._position !== value) {
			this._applyPosition(value, this._position)
			this.events.emit('change:position', value)
		}
	}

	protected _applyPosition(newValue: TTabsPosition, oldValue?: TTabsPosition) {
		this._classes.remove(`--position-${oldValue}`)
		if (this._orientation === 'vertical' && newValue !== 'start') {
			this._classes.add(`--position-${newValue}`)
		}
		this._position = newValue
	}

	get view(): TTabsView | undefined {
		return this._view
	}

	set view(value: TTabsView | undefined) {
		if (this._view !== value) {
			this._applyView(value, this._view)
			this.events.emit('change:view', value)
		}
	}

	/**
	 * Модификатор вида — с префиксом: без него вид темы `vertical` совпал бы с
	 * модификатором ориентации. `swap` пропускает пустое значение.
	 */
	protected _applyView(newValue: TTabsView | undefined, oldValue?: TTabsView) {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
		})
		this._view = newValue
	}

	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable !== value) {
			this._closable = value
			this.events.emit('change:closable', value)
		}
	}

	override getProps(): ITabsProps {
		return {
			...super.getProps(),
			orientation: this._orientation,
			alignment: this._alignment,
			position: this._position,
			view: this._view,
			closable: this._closable,
		}
	}
}
