import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { DEFAULT_TRANSLATIONS, TChangeEvent } from '../../../../common'
import type { TAriaAttributes, TEventSink, TTranslations } from '../../../../common'
import type { ITabsItem, ITabsItemProps, TTabsItemEvents } from './types'

/**
 * Кастомная логика элемента таба (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ таба.
 * Generic TProps позволяет передавать расширенные Props (например, ITabsItemProps с active).
 */
export default class TTabsItem<
	TProps extends ITabsItemProps = ITabsItemProps,
	TEvents extends TTabsItemEvents<any> = TTabsItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements ITabsItem<TProps, TEvents>
{
	static override baseClass = 's-tabs-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<ITabsItemProps, 'text', 'closable'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		closable: undefined,
		tag: 'div',
	}

	protected _translations: TTranslations = DEFAULT_TRANSLATIONS

	protected _text: string
	protected _closable: boolean | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTabsItem

		// Type assertion: TProps extends ITabsItemProps, поэтому props содержит text и closable
		const customProps = props as Partial<ITabsItemProps>

		this._text = customProps.text ?? ctor.defaultValues.text

		this._closable = customProps.closable ?? ctor.defaultValues.closable

		this._classes.toggle(`--closable`, !!this._closable)

		// Только то, что таб знает о себе сам: он — таб.
		//
		// Связки здесь нет намеренно: `id` и `aria-controls` нужны документу,
		// их пишет в этот же набор плагин таба `TTabsItemIdsPlugin`.
		// `aria-selected` — тоже не отсюда: его пишет TTabsExtension по
		// событию активации.
		this._aria.add('role', 'tab')
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTabsItemEvents> {
		return this.events
	}

	/**
	 * `aria` таба стоит на вложенном `<button>`: корень элемента — обёртка,
	 * которая держит `data-*` для темы, а табом со своей ролью и связкой с
	 * панелью является кнопка внутри.
	 *
	 * Поэтому ARIA-половину правила «нативный атрибут вместо ARIA-дубля»
	 * решает тег этой кнопки, а не `tag` корня: нативный `disabled` она
	 * получает от своего `TButton`, и `aria-disabled` рядом был бы дублем.
	 */
	protected override get _ariaTag(): string {
		return 'button'
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (value === this._text) return

		const e = new TChangeEvent(value, this._text)

		this._sink.emit('change:text:before', e)

		if (e.defaultPrevented || e.value === this._text) return

		this._text = e.value
		this._sink.emit('change:text', { newValue: e.value, oldValue: e.oldValue })
	}

	/**
	 * Своё значение таба, `undefined` — наследовать от владельца.
	 *
	 * `disabled` его не трогает: правило «выключенный таб не закрывается»
	 * выводит item-адаптер (`TTabsItemExtension.closable`). Раньше оно было
	 * подпиской на `change:disabled`, которая переписывала это значение, — и
	 * у таба, выключенного со старта, не срабатывала вовсе: события нет.
	 */
	get closable(): boolean | undefined {
		return this._closable
	}

	set closable(value: boolean | undefined) {
		if (value === this._closable) return

		const e = new TChangeEvent(value, this._closable)

		this._sink.emit('change:closable:before', e)

		if (e.defaultPrevented || e.value === this._closable) return

		this._closable = e.value
		this._classes.toggle(`--closable`, !!e.value)
		this._sink.emit('change:closable', e.value)
	}

	/**
	 * Словарь строк библиотеки: таб читает из него имя кнопки закрытия. Та же
	 * ссылка — ничего не меняет.
	 */
	get translations(): TTranslations {
		return this._translations
	}

	set translations(value: TTranslations) {
		if (this._translations === value) return

		this._translations = value
		this._sink.emit('change:translations', value)
	}

	/**
	 * Имя кнопки закрытия — вместе с текстом таба: «Close Настройки».
	 *
	 * Без текста все кнопки закрытия в наборе называются одинаково, и по
	 * списку элементов скринридера («Close, кнопка» пять раз подряд) выбрать
	 * нужную невозможно. Это и есть та накопленная практика, ради которой
	 * имя вообще считается здесь, а не пишется в шаблоне. Как имя складывается
	 * с текстом, решает строка словаря (раздел `tabs`): порядок слов у каждого
	 * языка свой.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает сам таб, а это —
	 * кнопка рядом с ним. Один элемент — один набор.
	 *
	 * `tabindex="-1"`: кнопка не остановка Tab. По паттерну APG Tabs весь
	 * список — одна остановка, а закрывает таб с клавиатуры `Delete` на самом
	 * табе (`TTabsKeyboardPlugin`). Мышью кнопка нажимается как раньше.
	 */
	get closeAria(): TAriaAttributes {
		return {
			'aria-label': this._translations.tabs.close(this.text.trim()),
			tabindex: '-1',
		}
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			closable: this.closable,
		} as TProps
	}
}
