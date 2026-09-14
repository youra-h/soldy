import { TStateUnit, NATIVE_DISABLED_TAGS } from '../../../common'
import type { TValuePayload, TEventSink } from '../../../common'
import type { IComponentOptions } from '../component'
import { TStylable } from '../stylable'
import type { IControlProps, TControlEvents, TControlStates } from './types'

/**
 * База для Ui-контролов: stylable (size/variant) + интерактивность (disabled/focused/click).
 *
 * Зачем отдельный слой:
 * - не все интерактивные элементы обязаны иметь size/variant
 * - но все form-controls (input элементы) и кнопки обычно обязаны
 */
export default class TControl<
	TProps extends IControlProps = IControlProps,
	TEvents extends TControlEvents = TControlEvents,
	TStates extends TControlStates = TControlStates,
> extends TStylable<TProps, TEvents, TStates> {
	static defaultValues: Partial<IControlProps> = {
		...TStylable.defaultValues,
		disabled: false,
		focused: false,
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TControl

		const disabled = props.disabled ?? (ctor.defaultValues.disabled as boolean)
		const focused = props.focused ?? (ctor.defaultValues.focused as boolean)

		this._states.disabled =
			options.states?.disabled ?? new TStateUnit<boolean>({ initial: disabled })

		this._states.disabled.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:disabled', payload.newValue)
		})

		this._states.focused =
			options.states?.focused ?? new TStateUnit<boolean>({ initial: focused })

		this._states.focused.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:focused', payload.newValue)
		})

		this.events.on('change:disabled', () => this._syncDisabled())
		this.events.on('change:tag', () => this._syncDisabled())

		this._syncDisabled()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TControlEvents> {
		return this.events
	}

	get disabled(): boolean {
		return this._states.disabled.value
	}
	set disabled(value: boolean) {
		if (this._states.disabled.value !== value) {
			this._states.disabled.value = value
		}
	}

	get focused(): boolean {
		return this._states.focused.value
	}
	set focused(value: boolean) {
		if (this._states.focused.value !== value) {
			this._states.focused.value = value
		}
	}

	/**
	 * У тегов с собственным `disabled` (`NATIVE_DISABLED_TAGS`) состояние
	 * передаётся нативным атрибутом — он и блокирует фокус, и исключает
	 * элемент из отправки формы, чего `aria-disabled` не умеет. У остальных
	 * тегов `aria-disabled` — единственный способ сообщить об этом
	 * скринридеру, а дублировать его нативным атрибутом было бы неверно: тега
	 * с таким атрибутом нет.
	 *
	 * Одна функция пишет обе половины, потому что решение об одной неотделимо
	 * от решения о другой — это один и тот же факт «есть ли у тега нативный
	 * `disabled`», просто в двух разных наборах.
	 *
	 * Зависит и от `disabled`, и от `tag`, поэтому пересчитывается на оба
	 * события. Раньше это был геттер и пересчёт получался сам; плата за общий
	 * набор — такие правила приходится проводить явно.
	 */
	protected _syncDisabled(): void {
		const nativeDisabled =
			typeof this.tag === 'string' && NATIVE_DISABLED_TAGS.has(this.tag.toLowerCase())

		// Непустая строка: '' React не поставит атрибут вовсе, а 'false' в DOM
		// всё равно блокирует элемент — value здесь не имеет значения, только
		// присутствие атрибута.
		this._attrs.add('disabled', this.disabled && nativeDisabled ? 'disabled' : null)
		this._aria.add('aria-disabled', this.disabled && !nativeDisabled ? 'true' : null)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			disabled: this.disabled,
			focused: this.focused,
		} as TProps
	}
}
