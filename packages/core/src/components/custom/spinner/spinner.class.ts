import { TStylable } from '../../base/stylable'
import type { TValuePayload } from '../../../common'
import type { TComponentSize } from '../../../common/types'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { ISpinner, ISpinnerProps, TSpinnerEvents } from './types'

export default class TSpinner extends TStylable<ISpinnerProps, TSpinnerEvents> implements ISpinner {
	static override baseClass = 's-spinner'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<ISpinnerProps, 'borderWidth'> = {
		...TStylable.defaultValues,
		tag: 'span',
		borderWidth: 'auto',
	}

	/**
	 * Толщина — как задана: `'auto'` или число. Итог отдаёт геттер: при
	 * `'auto'` — толщину по размеру.
	 */
	protected _borderWidth: number | 'auto'

	constructor(props: Partial<ISpinnerProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TSpinner

		this._borderWidth = props.borderWidth ?? ctor.defaultValues.borderWidth

		// `change:borderWidth` — смена итога: и от записи, и от размера при
		// `'auto'`. Прежний итог — по прежнему размеру
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			if (this._borderWidth !== 'auto') return

			this._borderWidthChanged(this.calculateBorderWidth(payload.oldValue))
		})

		// `role="status"` — вежливая живая область: `aria-live="polite"` и
		// `aria-atomic="true"` в ней уже подразумеваются, дублировать не надо.
		//
		// Имени по умолчанию нет намеренно: строка вроде «Загрузка» — язык
		// интерфейса, а его библиотека не знает. Без имени и без содержимого
		// спиннер молчит, и это верно: рядом с видимым «Сохраняем…» второе
		// объявление было бы дублем. Имя даёт TAriaPlugin.
		this._aria.add('role', 'status')
	}

	/** Итог: при `'auto'` — толщина по размеру (`calculateBorderWidth()`), иначе заданная. */
	get borderWidth(): number | 'auto' {
		return this._borderWidth === 'auto' ? this.calculateBorderWidth() : this._borderWidth
	}

	/**
	 * Пишет своё значение, сравнивая со своим, а не с итогом: число, равное
	 * автоматической толщине, заменяет `'auto'` и переживает смену размера.
	 */
	set borderWidth(value: number | 'auto') {
		if (value === this._borderWidth) return

		const before = this.borderWidth

		this._borderWidth = value
		this._borderWidthChanged(before)
	}

	/** Итог толщины мог смениться — `change:borderWidth`, если сменился. */
	private _borderWidthChanged(oldValue: number | 'auto'): void {
		if (this.borderWidth === oldValue) return

		this.events.emit('change:borderWidth', this.borderWidth)
	}

	/**
	 * Автоматически рассчитывает ширину бордера в зависимости от размера спиннера
	 * @return {number} Ширина бордера в пикселях
	 */
	calculateBorderWidth(size: TComponentSize = this.size): number {
		if (size === 'xl') return 2
		if (size === '2xl') return 2

		return 1
	}

	getProps(): ISpinnerProps {
		return {
			...super.getProps(),
			borderWidth: this._borderWidth,
		} as ISpinnerProps
	}
}
