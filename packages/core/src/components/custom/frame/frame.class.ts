import { TLayer } from '../../base/layer'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { IFrame, IFrameProps, TFrameEvents, TFramePosition } from './types'

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
export default class TFrame extends TLayer<IFrameProps, TFrameEvents> implements IFrame {
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
	protected _x: number
	protected _y: number
	protected _width: number | string
	protected _height: number | string

	constructor(props: Partial<IFrameProps> = {}, options: IComponentOptions = {}) {
		const ctor = new.target as typeof TFrame

		super(props, options)

		this._x = props.x ?? ctor.defaultValues.x
		this._y = props.y ?? ctor.defaultValues.y
		this._width = props.width ?? ctor.defaultValues.width
		this._height = props.height ?? ctor.defaultValues.height

		this._position = props.position ?? ctor.defaultValues.position
	}

	get x(): number {
		return this._x
	}
	set x(value: number) {
		if (this._x === value) return
		this._x = value
		this.events.emit('change:x', value)
	}

	get y(): number {
		return this._y
	}
	set y(value: number) {
		if (this._y === value) return
		this._y = value
		this.events.emit('change:y', value)
	}

	get width(): number | string {
		return this._width
	}
	set width(value: number | string) {
		if (this._width === value) return
		this._width = value
		this.events.emit('change:width', value)
	}

	get height(): number | string {
		return this._height
	}
	set height(value: number | string) {
		if (this._height === value) return
		this._height = value
		this.events.emit('change:height', value)
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
