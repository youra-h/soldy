import { TStateUnit } from '../../../common'
import type { TComponentSize, TComponentVariant, TValuePayload, TEventSink } from '../../../common'
import { TComponentView } from '../component-view'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IStylableProps, TStylableEvents, TStylableStates } from './types'

/**
 * Слой "stylable": унифицированные `size` и `variant`.
 *
 * Раньше эти свойства жили в `TControl`/`TControlInput`.
 * Здесь они вынесены в отдельный слой + state-units.
 */
export default class TStylable<
	TProps extends IStylableProps = IStylableProps,
	TEvents extends TStylableEvents = TStylableEvents,
	TStates extends TStylableStates = TStylableStates,
> extends TComponentView<TProps, TEvents, TStates> {
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IStylableProps, 'size' | 'variant'> = {
		...TComponentView.defaultValues,
		size: 'normal',
		variant: 'normal',
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TStylable

		this._states.size =
			options.states?.size ??
			new TStateUnit<TComponentSize>({
				initial: props.size ?? ctor.defaultValues.size,
			})

		this._states.size.events.on('change', (payload: TValuePayload<TComponentSize>) => {
			this._classes.swapClass({
				oldClass: `--size-${payload.oldValue}`,
				newClass: `--size-${payload.newValue}`,
			})
			this._sink.emit('change:size', payload)
		})

		this._classes.add(`--size-${this._states.size.value}`)

		this._states.variant =
			options.states?.variant ??
			new TStateUnit<TComponentVariant>({
				initial: props.variant ?? ctor.defaultValues.variant,
			})

		this._states.variant.events.on('change', (payload: TValuePayload<TComponentVariant>) => {
			this._classes.swapClass({
				oldClass: `--${payload.oldValue}`,
				newClass: `--${payload.newValue}`,
			})
			this._sink.emit('change:variant', payload)
		})

		this._classes.add(`--${this._states.variant.value}`)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TStylableEvents> {
		return this.events
	}

	get size(): TComponentSize {
		return this._states.size.value
	}

	set size(value: TComponentSize) {
		if (value === this._states.size.value) return

		this._states.size.value = value
	}

	get variant(): TComponentVariant {
		return this._states.variant.value
	}

	set variant(value: TComponentVariant) {
		if (value === this._states.variant.value) return

		this._states.variant.value = value
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			size: this.size,
			variant: this.variant,
		} as TProps
	}
}
