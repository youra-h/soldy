import { TComponentView } from '../../../base/component-view'
import type { IComponentOptions } from '../../../base/component'
import { TEvented } from '../../../../common'
import type {
	ITabsContent,
	ITabsContentProps,
	TTabsContentEvents,
	TTabsContentStates,
} from './types'

/**
 * Панель таба (`TabsContent`) — собственные props и события, и ничего больше.
 *
 * О коллекции класс не знает: активность, связанный таб и ARIA-связка живут в
 * `TTabsContentCollectionFacade`, как `active`/`order` у элемента живут в
 * `TTabItemCollectionFacade`. Смешивать эти слои нельзя — core отвечает за
 * props и events, коллекционная часть за членство в коллекции.
 *
 * Почему панель вообще стала компонентом, а не осталась слотом: раньше она
 * отдавалась динамическим слотом `panel:${value}`, а такое имя резолвит только
 * Vue. Плюс ей нужен `id`, чтобы таб сослался на неё через `aria-controls` —
 * то есть у неё есть собственная идентичность (см. критерий в AGENTS.md).
 */
export class TTabsContent<
		TProps extends ITabsContentProps = ITabsContentProps,
		TEvents extends TTabsContentEvents = TTabsContentEvents,
		TStates extends TTabsContentStates = TTabsContentStates,
	>
	extends TComponentView<TProps, TEvents, TStates>
	implements ITabsContent<TProps, TEvents, TStates>
{
	static override baseClass = 's-tabs__panel'

	static defaultValues: Partial<ITabsContentProps> = {
		...TComponentView.defaultValues,
		value: '',
	}

	protected _value: string | number

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTabsContent

		this._value = props.value ?? (ctor.defaultValues.value as string | number)
	}

	get value(): string | number {
		return this._value
	}

	set value(value: string | number) {
		if (this._value === value) return

		this._value = value
		;(this.events as TEvented<TTabsContentEvents>).emit('change:value', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			value: this._value,
		} as TProps
	}
}
