import { TComponentView } from '../../../base/component-view'
import type { TDefaultValues } from '../../../base/component'
import type { TEventSink } from '../../../../common'
import type { ITabsContent, ITabsContentProps, TTabsContentEvents } from './types'

/**
 * Панель таба (`TabsContent`) — собственные props и события, и ничего больше.
 *
 * О коллекции класс не знает: активность и связанный таб живут в
 * `TTabsContentCollectionFacade`, как `active`/`order` у элемента живут в
 * `TTabsItemCollectionFacade`. Смешивать эти слои нельзя — core отвечает за
 * props и events, коллекционная часть за членство в коллекции.
 *
 * Из ARIA панель пишет только то, что знает о себе сама: она — панель таба
 * (`role="tabpanel"`) и остановка Tab (`tabindex="0"`), как таб пишет
 * `role="tab"`. Связку с табом — `id` и `aria-labelledby` — пишет проводка,
 * когда панель нашла свой таб: `id` нужны документу, а не панели.
 *
 * Почему панель вообще стала компонентом, а не осталась слотом: раньше она
 * отдавалась динамическим слотом `panel:${value}`, а такое имя резолвит только
 * Vue. Плюс её адресует потребитель — размещает в разметке по `value` (см.
 * критерий в AGENTS.md).
 */
export class TTabsContent<
	TProps extends ITabsContentProps = ITabsContentProps,
	TEvents extends TTabsContentEvents = TTabsContentEvents,
>
	extends TComponentView<TProps, TEvents>
	implements ITabsContent<TProps, TEvents>
{
	static override baseClass = 's-tabs__panel'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<ITabsContentProps, 'value'> = {
		...TComponentView.defaultValues,
		value: '',
	}

	protected _value: string | number

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTabsContent

		this._value = props.value ?? ctor.defaultValues.value

		this._aria.add('role', 'tabpanel')
		// Панель — остановка Tab сразу за списком табов (APG): в ней может не
		// оказаться ни одного фокусируемого элемента
		this._aria.add('tabindex', '0')
	}

	get value(): string | number {
		return this._value
	}

	set value(value: string | number) {
		if (this._value === value) return

		this._value = value
		this._sink.emit('change:value', value)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTabsContentEvents> {
		return this.events
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			value: this._value,
		} as TProps
	}
}
