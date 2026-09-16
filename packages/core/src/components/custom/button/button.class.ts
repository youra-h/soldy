import { TTextable } from '../../base/textable'
import type { IButton, IButtonProps, TButtonView, TButtonEvents, TButtonStates } from './types'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { NATIVE_BUTTON_TAGS } from '../../../common'

export default class TButton extends TTextable<IButtonProps, TButtonEvents> implements IButton {
	static override baseClass = 's-button'

	static defaultValues: typeof TTextable.defaultValues &
		TDefaultValues<IButtonProps, 'view' | 'presentational'> = {
		...TTextable.defaultValues,
		variant: 'normal',
		view: 'filled',
		presentational: false,
		tag: 'button',
	}

	protected _view!: TButtonView
	protected _presentational!: boolean

	constructor(props: Partial<IButtonProps> = {}, options: IComponentOptions<TButtonStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TButton

		this._applyView(props.view ?? ctor.defaultValues.view)

		this._presentational = props.presentational ?? ctor.defaultValues.presentational

		this.events.on('change:tag', () => this._syncButtonAria())
		this.events.on('change:disabled', () => this._syncButtonAria())
		this.events.on('change:presentational', () => {
			this._syncDisabled()
			this._syncButtonAria()
		})

		// `TControl` уже синхронизировал `aria-disabled` в своём конструкторе,
		// когда `presentational` ещё не был задан, — пересчёт после него.
		this._syncDisabled()
		this._syncButtonAria()
	}

	get view(): TButtonView {
		return this._view
	}

	protected _applyView(newValue: TButtonView, oldValue?: TButtonView) {
		this._classes.swap({
			prefix: '--a-',
			oldValue,
			newValue,
		})

		this._view = newValue
	}

	set view(value: TButtonView) {
		if (value && this._view !== value) {
			this._applyView(value, this._view)
			this.events.emit('change:view', value)
		}
	}

	/**
	 * Строка чужого элемента, а не самостоятельная кнопка.
	 *
	 * Составной элемент рисует свою строку этим же `Button`, но ARIA держит не
	 * всегда на нём. У `Select.Item` роль `option` и состояние стоят на корне
	 * опции, а вложенный `<Button tag="span">` без пропа объявил бы себя
	 * кнопкой (`role`, `tabindex`) и повторил бы `aria-disabled` корня.
	 * `presentational` выключает все три записи. `data-*` для темы и
	 * нативный `disabled` в `attrs` остаются: первое красит строку, второе не
	 * ARIA.
	 *
	 * Там, где `aria` элемента биндится на сам `Button` (Tabs, Accordion,
	 * ListBox, Tags), узел один, и проп не нужен.
	 */
	get presentational(): boolean {
		return this._presentational
	}

	set presentational(value: boolean) {
		if (this._presentational !== value) {
			this._presentational = value
			this.events.emit('change:presentational', value)
		}
	}

	protected override get _announcesState(): boolean {
		return !this._presentational
	}

	/**
	 * На нативной `<button>` роль и фокусируемость уже есть, добавлять их
	 * нельзя. На любом другом теге кнопка без `role`/`tabindex` для
	 * скринридера не кнопка, а с клавиатуры недостижима — тогда и `press`
	 * из TActionPlugin по Enter/Space никогда не сработает.
	 *
	 * У `presentational` кнопки нет ни того, ни другого на любом теге: она
	 * не кнопка, а строка элемента, который объявляет себя сам.
	 */
	protected _syncButtonAria(): void {
		const tag = typeof this.tag === 'string' ? this.tag.toLowerCase() : ''

		if (this._presentational || NATIVE_BUTTON_TAGS.has(tag)) {
			this._aria.remove('role')
			this._aria.remove('tabindex')

			return
		}

		this._aria.add('role', 'button')
		this._aria.add('tabindex', this.disabled ? null : '0')
	}

	getProps(): IButtonProps {
		return {
			...super.getProps(),
			view: this._view,
			presentational: this._presentational,
		}
	}
}
