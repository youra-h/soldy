import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TAria, TChangeEvent } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type {
	IAccordionItem,
	IAccordionItemProps,
	TAccordionArrowPlacement,
	TAccordionItemEvents,
} from './types'

/**
 * Логика элемента Accordion (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ элемента.
 * Generic TProps позволяет передавать расширенные Props (например, IAccordionItemProps с selected).
 */
export default class TAccordionItem<
	TProps extends IAccordionItemProps = IAccordionItemProps,
	TEvents extends TAccordionItemEvents = TAccordionItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements IAccordionItem<TProps, TEvents>
{
	static override baseClass = 's-accordion-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IAccordionItemProps, 'text' | 'arrowPlacement'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		arrowPlacement: 'start',
		tag: 'div',
	}

	protected _arrowPlacement!: TAccordionArrowPlacement

	protected _text: string

	protected _contentAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TAccordionItem

		// Type assertion: TProps extends IAccordionItemProps, поэтому props содержит text и arrowPlacement
		const customProps = props as Partial<IAccordionItemProps>

		// Инициализация state-объектов
		this._text = customProps.text ?? ctor.defaultValues.text

		this._arrowPlacement = customProps.arrowPlacement ?? ctor.defaultValues.arrowPlacement

		this._contentAria = new TAria()

		this._contentAria.events.on('change', () =>
			this._sink.emit('change:contentAria', this._contentAria.toObject()),
		)

		// Секция — заголовок и раскрывающаяся панель-область (APG Accordion)
		this._contentAria.add('role', 'region')
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TAccordionItemEvents> {
		return this.events
	}

	/**
	 * `aria` секции стоит на заголовке `.s-accordion-item__header` — вложенном
	 * `<button>`, который раскрывает панель. Корень элемента только оборачивает
	 * заголовок и панель и держит `data-*` для темы.
	 *
	 * Поэтому ARIA-половину правила «нативный атрибут вместо ARIA-дубля»
	 * решает тег заголовка, а не `tag` корня: нативный `disabled` он получает
	 * от своего `TButton`, и `aria-disabled` рядом был бы дублем.
	 */
	protected override get _ariaTag(): string {
		return 'button'
	}

	/**
	 * ARIA раскрывающейся панели. Панель лежит внутри элемента и отдельно от
	 * него не существует — экземпляра у неё нет, поэтому набор — секции
	 * (AGENTS.md, «Часть или слот»). Роль пишет секция, `id` панели и ссылку
	 * на заголовок — `TAccordionItemIdsPlugin`. Об изменении набор сообщает
	 * `change:contentAria`.
	 */
	get contentAria(): TAria {
		return this._contentAria
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

	get arrowPlacement(): TAccordionArrowPlacement {
		return this._arrowPlacement
	}

	set arrowPlacement(value: TAccordionArrowPlacement) {
		if (this._arrowPlacement !== value) {
			this._arrowPlacement = value
			this._sink.emit('change:arrowPlacement', value)
		}
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			arrowPlacement: this._arrowPlacement,
		} as TProps
	}
}
