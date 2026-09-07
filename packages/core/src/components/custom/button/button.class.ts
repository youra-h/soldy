import { TTextable } from '../../base/textable'
import type {
	IButton,
	IButtonProps,
	TButtonView,
	TButtonEvents,
	TButtonStates,
} from './types'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common/event/evented'
import { NATIVE_BUTTON_TAGS } from '../../../common'


export default class TButton extends TTextable<IButtonProps, TButtonEvents> implements IButton {
	static override baseClass = 's-button'

	static defaultValues: Partial<IButtonProps> = {
		...TTextable.defaultValues,
		variant: 'normal',
		view: 'filled',
		tag: 'button',
	}

	protected _view!: TButtonView

	constructor(
		props: Partial<IButtonProps> = {},
		options: IComponentOptions<TButtonStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TButton

		this._applyView(props.view ?? ctor.defaultValues.view!)

		this.events.on('change:tag', () => this._syncButtonAria())
		this.events.on('change:disabled', () => this._syncButtonAria())

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
			;(this.events as TEvented<TButtonEvents>).emit('change:view', value)
		}
	}

	/**
	 * На нативной `<button>` роль и фокусируемость уже есть, добавлять их
	 * нельзя. На любом другом теге кнопка без `role`/`tabindex` для
	 * скринридера не кнопка, а с клавиатуры недостижима — тогда и `press`
	 * из TActionPlugin по Enter/Space никогда не сработает.
	 */
	protected _syncButtonAria(): void {
		const tag = typeof this.tag === 'string' ? this.tag.toLowerCase() : ''

		if (NATIVE_BUTTON_TAGS.has(tag)) {
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
		}
	}
}
