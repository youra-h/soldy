import { TLayer } from '../../base/layer'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { TStateUnit } from '../../../common'
import type { TValuePayload } from '../../../common'
import type { IFrame, IFrameProps, TFrameEvents, TFrameStates, TFramePosition } from './types'

/**
 * Headless-контейнер для всплывающего контента.
 *
 * Слой (`TLayer`) — телепорт, видимость и место в общем стеке z-index с
 * номером в `data-layer`. Сверху Frame держит свою раскладку: позицию
 * (x, y), размер (width, height) и способ позиционирования. Не имеет
 * привязки к DOM — только логика; стили из этих значений собирает
 * `TFrameLayoutPlugin`.
 *
 * @example
 * const frame = new TFrame({ x: 100, y: 200, width: 300, height: 'auto' })
 * frame.show() // получает z-index, становится visible
 * frame.hide() // скрывается
 */
export default class TFrame
	extends TLayer<IFrameProps, TFrameEvents, TFrameStates>
	implements IFrame
{
	static baseClass = 's-frame'

	static defaultValues: typeof TLayer.defaultValues &
		TDefaultValues<IFrameProps, 'x' | 'y' | 'width' | 'height' | 'position'> = {
		...TLayer.defaultValues,
		x: 0,
		y: 0,
		// Слой по умолчанию берёт размер по содержимому — число задаётся осознанно.
		width: 'auto',
		height: 'auto',
		position: 'fixed',
	}

	private _position: TFramePosition

	constructor(props: Partial<IFrameProps> = {}, options: IComponentOptions<TFrameStates> = {}) {
		const ctor = new.target as typeof TFrame

		super(props, options)

		const x = props.x ?? ctor.defaultValues.x
		const y = props.y ?? ctor.defaultValues.y
		const width = props.width ?? ctor.defaultValues.width
		const height = props.height ?? ctor.defaultValues.height

		this._position = props.position ?? ctor.defaultValues.position

		this._states.x = new TStateUnit<number>({ initial: x }) as TFrameStates['x']
		this._states.y = new TStateUnit<number>({ initial: y }) as TFrameStates['y']
		this._states.width = new TStateUnit<number | string>({
			initial: width,
		}) as TFrameStates['width']
		this._states.height = new TStateUnit<number | string>({
			initial: height,
		}) as TFrameStates['height']

		this._states.x.events.on('change', (payload: TValuePayload<number>) => {
			this.events.emit('change:x', payload.newValue)
		})
		this._states.y.events.on('change', (payload: TValuePayload<number>) => {
			this.events.emit('change:y', payload.newValue)
		})
		this._states.width.events.on('change', (payload: TValuePayload<number | string>) => {
			this.events.emit('change:width', payload.newValue)
		})
		this._states.height.events.on('change', (payload: TValuePayload<number | string>) => {
			this.events.emit('change:height', payload.newValue)
		})
	}

	get x(): number {
		return this._states.x.value
	}
	set x(value: number) {
		this._states.x.value = value
	}

	get y(): number {
		return this._states.y.value
	}
	set y(value: number) {
		this._states.y.value = value
	}

	get width(): number | string {
		return this._states.width.value
	}
	set width(value: number | string) {
		this._states.width.value = value
	}

	get height(): number | string {
		return this._states.height.value
	}
	set height(value: number | string) {
		this._states.height.value = value
	}

	get position(): TFramePosition {
		return this._position
	}
	set position(value: TFramePosition) {
		if (this._position === value) return
		this._position = value
		this.events.emit('change:position', value)
	}

	getProps(): IFrameProps {
		return {
			...super.getProps(),
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			position: this.position,
		}
	}
}
