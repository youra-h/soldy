import { TInputControl } from '../input-control'
import type { TDefaultValues } from '../component'
import { TAria } from '../../../common'
import type { TEventSink } from '../../../common'
import type { IField, IFieldProps, TFieldEvents } from './types'

/**
 * Поле ввода — общая база текстового поля (`TInput`), поля даты
 * (`TDateInput`) и DatePicker (`TDatePicker`): кнопка очистки значения.
 *
 * Кнопка — часть поля, а не его владельца: Select рисует её не сам, а отдаёт
 * своему полю `clearable`, как `name` и `size`. Поэтому всё, что следует из
 * кнопки, живёт здесь один раз: признак `clearable` с модификатором
 * `--clearable`, набор кнопки (`clearAria`) и команда `clear`. Две копии в формах разошлись бы, как расходились фасады, пока у
 * них не было баз. Блок CSS называет форма, поэтому своего `baseClass` у базы
 * нет.
 *
 * **Очистка — два шага.** Сначала шаг формы (`_clearValue`): у Input — пустая
 * строка, у поля даты — пустые части, у DatePicker — пустые поля его режима,
 * у диапазона оба конца. Потом база шлёт `clear` — всегда, даже у
 * пустого поля: владелец поля очищает своё сам, и Select снимает выбор, хотя в
 * `multiple` его поле пусто и при выбранных тегах. Путь один и у встроенной
 * кнопки, и у своей кнопки в слоте `clear`.
 *
 * Проверок `readonly` и `disabled` у очистки нет. Выключенное поле выключает
 * кнопку, и нажать её нельзя, а `readonly` её не гасит: select-only Select и
 * есть `readonly`, а очистка там работает. Код зовёт `clear` когда угодно.
 *
 * Событие `clear` в дескриптор не публикуется: это поверхность инстанса, как
 * `choose` у ListBox.
 */
export default class TField<
	TValue = string,
	TProps extends IFieldProps<TValue> = IFieldProps<TValue>,
	TEvents extends TFieldEvents<TValue> = TFieldEvents<TValue>,
>
	extends TInputControl<TValue, TProps, TEvents>
	implements IField<TValue, TProps, TEvents>
{
	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<IFieldProps<any>, 'clearable'> = {
		...TInputControl.defaultValues,
		clearable: false,
	}

	protected _clearable!: boolean
	protected _clearAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TField

		this._applyClearable(props.clearable ?? ctor.defaultValues.clearable)

		this._clearAria = new TAria()
		this._clearAria.events.on('change', () =>
			this._sink.emit('change:clearAria', this._clearAria.toObject()),
		)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TFieldEvents<TValue>> {
		return this.events
	}

	get clearable(): boolean {
		return this._clearable
	}

	set clearable(value: boolean) {
		if (this._clearable === value) return

		this._applyClearable(value)
		this._sink.emit('change:clearable', value)
	}

	/**
	 * Набор кнопки очистки. Имя в нём — вместе с именем поля: «Clear Город».
	 *
	 * Без имени поля на форме с пятью полями в списке элементов скринридера
	 * будет пять одинаковых «Clear, кнопка», и выбрать нужную нельзя. Та же
	 * причина, по которой у таба имя кнопки закрытия собирается с его текстом.
	 * Имя пишет плагин имён формы (`TFieldNamesPlugin`, у DatePicker — его
	 * наследник) по шаблону локали — и на смену имени поля; об изменении набор
	 * сообщает `change:clearAria`.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает само поле, а это —
	 * соседняя кнопка. Один элемент — один набор.
	 */
	get clearAria(): TAria {
		return this._clearAria
	}

	/**
	 * Очистить поле: шаг формы, потом событие `clear`.
	 *
	 * Поле, привязанное к инстансу, а не метод прототипа: разметка отдаёт его в
	 * scope слота `clear` без инстанса, и своя кнопка зовёт его голой функцией.
	 * Метод потерял бы там `this`. Привязка здесь одна на все адаптеры —
	 * обёртку в шаблоне пришлось бы повторить в каждом.
	 */
	readonly clear = (): void => {
		this._clearValue()
		this._sink.emit('clear')
	}

	/**
	 * Шаг очистки формы — как пустеет её значение. База ни во что конкретное не
	 * рендерится и значения не знает, поэтому по умолчанию ничего не делает.
	 */
	protected _clearValue(): void {}

	protected _applyClearable(value: boolean): void {
		this._clearable = value
		this._classes.toggle('--clearable', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			clearable: this._clearable,
		}
	}
}
