import { TEntity } from '../entity'
import { TEvented } from '../../../common'
import type {
	IComponent,
	IComponentOptions,
	IComponentProps,
	TComponentEvents,
	TComponentStates,
} from './types'

/**
 * Headless-модель компонента.
 *
 * База для ВСЕХ компонентов, включая невизуальные (TDragAndDrop, фасады
 * коллекций). Даёт события и реестр состояний — но ничего про отображение.
 *
 * Видимость (rendered/visible/present, show/hide) и всё остальное, связанное
 * с DOM, живёт в TComponentView.
 */
export default class TComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends TComponentEvents = TComponentEvents,
	TStates extends TComponentStates = TComponentStates,
>
	extends TEntity<TProps>
	implements IComponent<TProps, TEvents, TStates>
{
	static defaultValues: Partial<IComponentProps> = {}

	protected _states = {} as TStates
	public readonly events: TEvented<TEvents>

	constructor(_props: Partial<TProps> = {}, _options: IComponentOptions<TStates> = {}) {
		super()

		this.events = new TEvented<TEvents>()
	}

	static create<T extends TComponent>(
		this: new (...args: any[]) => T,
		props?: Partial<T extends TComponent<infer P> ? P : IComponentProps>,
		options?: IComponentOptions<T extends TComponent<any, any, infer S> ? S : any>,
	): T {
		return new this(props ?? {}, options ?? {})
	}

	get states(): TStates {
		return this._states
	}
}
