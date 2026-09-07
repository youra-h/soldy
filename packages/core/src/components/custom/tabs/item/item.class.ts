import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload, TAriaAttributes } from '../../../../common'
import type { ITabsItem, ITabsItemProps, TTabsItemEvents, TTabsItemStates } from './types'

/**
 * Кастомная логика элемента таба (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ таба.
 * Generic TProps позволяет передавать расширенные Props (например, ITabsItemProps с active).
 */
export default class TTabsItem<
	TProps extends ITabsItemProps = ITabsItemProps,
	TEvents extends TTabsItemEvents<any> = TTabsItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TTabsItemStates>
	implements ITabsItem<TProps, TEvents>
{
	static override baseClass = 's-tabs-item'

	static defaultValues: Partial<ITabsItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		closable: undefined,
		closeLabel: 'Close',
		variant: 'normal',
		tag: 'button',
	}

	protected _closeLabel!: string

	constructor(
		props: Partial<TProps> = {},
		options: IComponentOptions<TTabsItemStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TTabsItem

		// Type assertion: TProps extends ITabsItemProps, поэтому props содержит text и closable
		const customProps = props as Partial<ITabsItemProps>

		this._closeLabel = customProps.closeLabel ?? ctor.defaultValues.closeLabel!

		// Инициализация state-объектов
		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._states.closable =
			options.states?.closable ??
			new TStateUnit<boolean | undefined>({
				initial: customProps.closable ?? ctor.defaultValues.closable,
			})

		// Подписка на изменения state-объектов
		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TTabsItemEvents>).emit('change:text', payload)
		})

		this._states.closable.events.on('change', (payload: TValuePayload<boolean | undefined>) => {
			this._classes.toggle(`--closable`, !!payload.newValue)
			;(this.events as TEvented<TTabsItemEvents>).emit('change:closable', payload.newValue)
		})

		this._classes.toggle(`--closable`, !!this._states.closable.value)

		// Только то, что таб знает о себе сам: он — таб.
		//
		// Связки здесь нет намеренно. `id` и `aria-controls` предполагают
		// панель, а о её существовании знает коллекция, не элемент; их пишет
		// в этот же набор item-адаптер расширения `content`. `aria-selected`
		// — тоже не отсюда: активность вычисляет TActivationExtension.
		this._aria.add('role', 'tab')

		this.events.on('change:disabled', () => {
			// Если таб стал disabled, убираем возможность закрывать его
			if (this.disabled) {
				this._states.closable.value = false
			} else {
				// Если таб стал enabled, восстанавливаем closable в исходное значение (или дефолтное)
				this._states.closable.value = customProps.closable ?? ctor.defaultValues.closable
			}
		})
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	get closable(): boolean | undefined {
		return this._states.closable.value
	}

	set closable(value: boolean | undefined) {
		if (this._states.closable.rawValue === value || this.disabled) return

		this._states.closable.value = value
	}

	/**
	 * Только то, что таб знает о себе сам: он — таб.
	 *
	 * Связки здесь нет намеренно. `id` и `aria-controls` предполагают панель,
	 * а о её существовании знает коллекция, не элемент; их отдаёт item-адаптер
	 * расширения `content` через фасад (`tab_aria`). `aria-selected` — тоже
	 * не отсюда: активность вычисляет `TActivationExtension` на лету.
	 */
	/**
	 * Слово для кнопки закрытия. Дефолт английский, как и остальные
	 * идентификаторы в библиотеке: язык интерфейса ядру неизвестен, а
	 * промолчать нельзя — кнопка останется без имени.
	 */
	get closeLabel(): string {
		return this._closeLabel
	}

	set closeLabel(value: string) {
		if (this._closeLabel === value) return

		this._closeLabel = value
		;(this.events as TEvented<TTabsItemEvents>).emit('change:closeLabel', value)
	}

	/**
	 * Имя кнопки закрытия — вместе с текстом таба: «Close Настройки».
	 *
	 * Без текста все кнопки закрытия в наборе называются одинаково, и по
	 * списку элементов скринридера («Close, кнопка» пять раз подряд) выбрать
	 * нужную невозможно. Это и есть та накопленная практика, ради которой
	 * имя вообще считается здесь, а не пишется в шаблоне.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает сам таб, а это —
	 * вложенная в него кнопка. Один элемент — один набор.
	 */
	get closeAria(): TAriaAttributes {
		const text = this.text.trim()

		return { 'aria-label': text ? `${this._closeLabel} ${text}` : this._closeLabel }
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			closable: this.closable,
			closeLabel: this._closeLabel,
		} as TProps
	}
}
