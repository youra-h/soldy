import { TStylable } from '../../base/stylable'
import { TStateUnit } from '../../../common'
import type { TValuePayload } from '../../../common'
import type { TComponentSize } from '../../../common/types'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { ISpinner, ISpinnerProps, TSpinnerEvents, TSpinnerStates } from './types'

export default class TSpinner extends TStylable<ISpinnerProps, TSpinnerEvents> implements ISpinner {
	static override baseClass = 's-spinner'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<ISpinnerProps, 'borderWidth'> = {
		...TStylable.defaultValues,
		tag: 'span',
		borderWidth: 'auto',
	}

	/**
	 * Толщина: своё значение — как задано (`'auto'` или число), итог —
	 * число: при `'auto'` его считает резольвер по размеру.
	 */
	protected readonly _borderWidth: TStateUnit<number | 'auto'>

	constructor(
		props: Partial<ISpinnerProps> = {},
		options: IComponentOptions<TSpinnerStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TSpinner

		this._borderWidth = new TStateUnit<number | 'auto'>({
			initial: props.borderWidth ?? ctor.defaultValues.borderWidth,
			resolver: (own) => (own === 'auto' ? this.calculateBorderWidth() : own),
		})

		// `change:borderWidth` — смена итога, как у любой единицы с резольвером:
		// и от записи, и от размера при `'auto'`. Прежний итог — по прежнему размеру
		this._borderWidth.events.on('change', (payload: TValuePayload<number | 'auto'>) =>
			this.events.emit('change:borderWidth', payload.newValue),
		)
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			const own = this._borderWidth.rawValue

			this._borderWidth.notify(
				own === 'auto' ? this.calculateBorderWidth(payload.oldValue) : own,
			)
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
		return this._borderWidth.value
	}

	/**
	 * Пишет своё значение, сравнивая со своим, а не с итогом: число, равное
	 * автоматической толщине, заменяет `'auto'` и переживает смену размера.
	 */
	set borderWidth(value: number | 'auto') {
		this._borderWidth.value = value
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
			borderWidth: this._borderWidth.rawValue,
		} as ISpinnerProps
	}
}
