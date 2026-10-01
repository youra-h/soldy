import { TComponentView } from '../../base/component-view'
import type { IIcon, IIconProps, TIconEvents } from './types'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { TChangeEvent } from '../../../common'
import type { TComponentSize } from '../../../common'

/**
 * Отличает объект props иконки (`{ tag, size, ... }`) от сырого значения тега:
 * `tag` сам может быть объектом (рендер-функция, VNode-подобное значение), поэтому
 * различаем по наличию ключа `tag`, а не по `typeof`.
 */
function isIconProps(value: object | string): value is IIconProps {
	return typeof value === 'object' && value !== null && 'tag' in value
}

export default class TIcon extends TComponentView<IIconProps, TIconEvents> implements IIcon {
	static override baseClass = 's-icon'

	/**
	 * `width` и `height` объявлены ключами без значения: незаданный размер даёт
	 * `size`, и снятый из разметки проп обязан вернуть иконку к нему, а не
	 * оставить прежний (см. AGENTS.md, «Умолчание пропа — в декларации»).
	 */
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IIconProps, 'size', 'width' | 'height'> = {
		...TComponentView.defaultValues,
		size: 'normal',
		tag: 'error',
		width: undefined,
		height: undefined,
	}

	protected _size: TComponentSize
	protected _width: string | number | undefined
	protected _height: string | number | undefined

	constructor(props: Partial<IIconProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TIcon

		this._size = props.size ?? ctor.defaultValues.size

		this._classes.add(`--size-${this._size}`, true)

		this._width = props.width ?? ctor.defaultValues.width
		this._height = props.height ?? ctor.defaultValues.height

		// Иконка декоративна: она стоит рядом с текстом и дублирует его —
		// «стрелка Развернуть» вместо «Развернуть».
		//
		// Обратный случай решает TAriaPlugin: получив имя, он снимает этот
		// атрибут и ставит `role="img"` (роль передана ему в IconDescriptor).
		// Ядро о плагинах не знает, поэтому условия «есть ли имя» тут нет.
		this._aria.add('aria-hidden', 'true')
	}

	get width(): string | number | undefined {
		return this._width
	}

	set width(value: string | number | undefined) {
		if (this._width !== value) {
			this._width = value
			this.events.emit('change:width', value)
		}
	}

	get height(): string | number | undefined {
		return this._height
	}

	set height(value: string | number | undefined) {
		if (this._height !== value) {
			this._height = value
			this.events.emit('change:height', value)
		}
	}

	get size(): TComponentSize {
		return this._size
	}

	set size(value: TComponentSize) {
		if (value === this._size) return

		const e = new TChangeEvent(value, this._size)

		this.events.emit('change:size:before', e)

		if (e.defaultPrevented || e.value === this._size) return

		this._size = e.value
		this._classes.swapClass({ oldClass: `--size-${e.oldValue}`, newClass: `--size-${e.value}` })
		this.events.emit('change:size', { newValue: e.value, oldValue: e.oldValue })
	}

	/**
	 * Получает экземпляр иконки.
	 * @param value Значение, по которому нужно получить иконку: готовый экземпляр TIcon
	 * возвращается как есть, объект props иконки (распознаётся по ключу `tag`) идёт в
	 * конструктор целиком, иначе value считается сырым значением тега (`props.tag`).
	 * @returns Экземпляр иконки.
	 */
	static getInstance(value: TIcon | IIconProps | NonNullable<IIconProps['tag']>): TIcon {
		if (value instanceof TIcon) {
			return value
		}

		if (isIconProps(value)) {
			return new TIcon(value)
		}

		return new TIcon({ tag: value })
	}

	getProps(): IIconProps {
		return {
			...super.getProps(),
			size: this._size,
			width: this._width,
			height: this._height,
		}
	}
}
