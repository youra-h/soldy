import { TEntity } from '../entity'
import { TEvented } from '../../../common'
import type { IComponent, IComponentProps, TComponentEvents, TDefaultValues } from './types'

/**
 * Headless-модель компонента.
 *
 * База для ВСЕХ компонентов, включая невизуальные (TDragAndDrop, фасады
 * коллекций). Даёт события — и ничего про отображение.
 *
 * Видимость (rendered/visible/present, show/hide) и всё остальное, связанное
 * с DOM, живёт в TComponentView.
 *
 * Констрейнт `TEvents` — закрытая карта `TComponentEvents`, а не открытый
 * `TAnyEvents`, как у `IComponent`. Где тип инстанса выводится из конструктора
 * (`ctor` дескриптора, `InstanceType<typeof …>`), TS ставит на место дженерика
 * констрейнт, а не дефолт, и открытый констрейнт вернул бы в карту инстанса
 * индексную сигнатуру. Наследники держат тот же приём: констрейнт равен дефолту.
 */
export default class TComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends TComponentEvents = TComponentEvents,
>
	extends TEntity<TProps>
	implements IComponent<TProps, TEvents>
{
	static defaultValues: TDefaultValues<IComponentProps> = {}

	public readonly events: TEvented<TEvents>

	constructor(_props: Partial<TProps> = {}) {
		super()

		this.events = new TEvented<TEvents>()
	}

	static create<T extends TComponent<IComponentProps, any>>(
		this: new (...args: any[]) => T,
		props?: Partial<T extends TComponent<infer P, any> ? P : IComponentProps>,
	): T {
		return new this(props ?? {})
	}
}
