import { TChangeEvent } from '../../../common'
import type { TComponentSize, TComponentVariant, TEventSink } from '../../../common'
import { TComponentView } from '../component-view'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IStylableProps, TStylableEvents } from './types'

/**
 * Слой "stylable": унифицированные `size` и `variant`.
 *
 * `size` — шкала библиотеки: её читает `shiftSize`. `variant` — значение темы
 * (`IComponentVariants`): по умолчанию его нет, и модификатора нет тоже.
 */
export default class TStylable<
	TProps extends IStylableProps = IStylableProps,
	TEvents extends TStylableEvents = TStylableEvents,
> extends TComponentView<TProps, TEvents> {
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IStylableProps, 'size', 'variant'> = {
		...TComponentView.defaultValues,
		size: 'normal',
		variant: undefined,
	}

	protected _size: TComponentSize
	protected _variant: TComponentVariant | undefined

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TStylable

		this._size = props.size ?? ctor.defaultValues.size
		this._variant = props.variant ?? ctor.defaultValues.variant

		this._classes.add(`--size-${this._size}`)
		this._classes.swap({ prefix: '--variant-', newValue: this._variant })
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TStylableEvents> {
		return this.events
	}

	get size(): TComponentSize {
		return this._size
	}

	set size(value: TComponentSize) {
		if (value === this._size) return

		const e = new TChangeEvent(value, this._size)

		this._sink.emit('change:size:before', e)

		if (e.defaultPrevented || e.value === this._size) return

		this._classes.swapClass({ oldClass: `--size-${e.oldValue}`, newClass: `--size-${e.value}` })
		this._size = e.value
		this._sink.emit('change:size', { newValue: e.value, oldValue: e.oldValue })
	}

	get variant(): TComponentVariant | undefined {
		return this._variant
	}

	/**
	 * `swap`, а не `swapClass` с шаблонной строкой: значения может не быть, и
	 * шаблон дал бы `--variant-undefined`.
	 */
	set variant(value: TComponentVariant | undefined) {
		if (value === this._variant) return

		const e = new TChangeEvent(value, this._variant)

		this._sink.emit('change:variant:before', e)

		if (e.defaultPrevented || e.value === this._variant) return

		this._classes.swap({ prefix: '--variant-', oldValue: e.oldValue, newValue: e.value })
		this._variant = e.value
		this._sink.emit('change:variant', { newValue: e.value, oldValue: e.oldValue })
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			size: this.size,
			variant: this.variant,
		} as TProps
	}
}
