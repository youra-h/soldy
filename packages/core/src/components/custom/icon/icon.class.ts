import { TComponentView } from '../../base/component-view'
import type { IIcon, IIconProps, TIconEvents, TIconStates } from './types'
import type { IComponentOptions } from '../../base/component'
import { TStateUnit, TEvented } from '../../../common'
import type { TValuePayload, TComponentSize, TAriaAttributes } from '../../../common'

export default class TIcon
	extends TComponentView<IIconProps, TIconEvents, TIconStates>
	implements IIcon
{
	static override baseClass = 's-icon'

	static defaultValues: Partial<IIconProps> = {
		...TComponentView.defaultValues,
		size: 'normal',
		tag: 'error',
	}

	protected _width: string | number | undefined
	protected _height: string | number | undefined

	constructor(
		props: Partial<IIconProps> = {},
		options: IComponentOptions<TIconStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TIcon

		this._states.size =
			options.states?.size ??
			new TStateUnit<TComponentSize>({
				initial: (props.size ?? ctor.defaultValues.size!) as TComponentSize,
			})

		this._states.size.events.on('change', (payload: TValuePayload<TComponentSize>) => {
			this._classes.swapClass({
				oldClass: `--size-${payload.oldValue}`,
				newClass: `--size-${payload.newValue}`,
			})
			;(this.events as TEvented<TIconEvents>).emit('change:size' as any, payload)
		})

		this._classes.add(`--size-${this._states.size.value}`, true)

		this._width = props.width
		this._height = props.height

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
			;(this.events as TEvented<TIconEvents>).emit('change:width', value)
		}
	}

	get height(): string | number | undefined {
		return this._height
	}

	set height(value: string | number | undefined) {
		if (this._height !== value) {
			this._height = value
			;(this.events as TEvented<TIconEvents>).emit('change:height', value)
		}
	}

	get size(): TComponentSize {
		return this._states.size.value
	}

	set size(value: TComponentSize) {
		if (value === this._states.size.value) return

		this._states.size.value = value
	}

	/**
	 * Получает экземпляр иконки.
	 * @param value Значение, по которому нужно получить иконку, если это уже экземпляр TIcon, он будет возвращен как есть, иначе будет создан новый экземпляр.
	 * @returns Экземпляр иконки.
	 */
	static getInstance(value: TIcon | object): TIcon {
		if (value instanceof TIcon) {
			return value
		}

		// Если value - объект, создаем новый экземпляр с его свойствами
		if (value && value instanceof Object && 'tag' in value) {
			return new TIcon(value as any)
		}

		// Иначе value - это объект с иконкой
		return new TIcon({ tag: value })
	}

	getProps(): IIconProps {
		return {
			...super.getProps(),
			size: this._states.size.value,
			width: this._width,
			height: this._height,
		}
	}
}
