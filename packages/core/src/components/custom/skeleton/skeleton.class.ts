import { TStateUnit } from '../../../common'
import type { TComponentVariant, TValuePayload } from '../../../common'
import { TComponentView } from '../../base/component-view'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type {
	ISkeleton,
	ISkeletonProps,
	TSkeletonAnimation,
	TSkeletonEvents,
	TSkeletonShape,
	TSkeletonStates,
} from './types'

export default class TSkeleton
	extends TComponentView<ISkeletonProps, TSkeletonEvents, TSkeletonStates>
	implements ISkeleton
{
	static override baseClass = 's-skeleton'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<ISkeletonProps, 'width' | 'height', 'shape' | 'animation' | 'variant'> = {
		...TComponentView.defaultValues,
		shape: undefined,
		animation: undefined,
		variant: undefined,
		width: 'auto',
		height: 'auto',
	}

	protected _shape: TSkeletonShape | undefined
	protected _animation: TSkeletonAnimation | undefined
	protected _width: number | string
	protected _height: number | string

	constructor(
		props: Partial<ISkeletonProps> = {},
		options: IComponentOptions<TSkeletonStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TSkeleton

		this._shape = props.shape ?? ctor.defaultValues.shape
		this._animation = props.animation ?? ctor.defaultValues.animation
		this._width = props.width ?? ctor.defaultValues.width
		this._height = props.height ?? ctor.defaultValues.height

		// Форма, анимация и вариант — значения темы: модификатор с префиксом,
		// а без значения его нет вовсе (`swap` пропускает пустое).
		this._classes.swap({ prefix: '--shape-', newValue: this._shape })
		this._classes.swap({ prefix: '--animation-', newValue: this._animation })

		this._states.variant =
			options.states?.variant ??
			new TStateUnit<TComponentVariant | undefined>({
				initial: props.variant ?? ctor.defaultValues.variant,
			})

		this._states.variant.events.on(
			'change',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				this._classes.swap({
					prefix: '--variant-',
					oldValue: payload.oldValue,
					newValue: payload.newValue,
				})
				this.events.emit('change:variant', payload)
			},
		)

		this._classes.swap({ prefix: '--variant-', newValue: this._states.variant.value })

		// Пока показана заглушка, область помечена `aria-busy`: скринридер
		// знает, что содержимое ещё меняется, и не зачитывает промежуточное.
		//
		// Сама заглушка скрывается через `aria-hidden` в разметке, а не здесь:
		// она отдельный элемент внутри, а этот набор — про корень. Скрывать
		// корень нельзя, в нём лежит слот с настоящим содержимым.
		this.events.on('change:present', () => this._syncBusyAria())

		this._syncBusyAria()
	}

	protected _syncBusyAria(): void {
		this._aria.add('aria-busy', this.present ? 'true' : null)
	}

	get variant(): TComponentVariant | undefined {
		return this._states.variant.value
	}

	set variant(value: TComponentVariant | undefined) {
		if (value === this._states.variant.value) return

		this._states.variant.value = value
	}

	get shape(): TSkeletonShape | undefined {
		return this._shape
	}

	set shape(value: TSkeletonShape | undefined) {
		if (value === this._shape) return

		this._classes.swap({ prefix: '--shape-', oldValue: this._shape, newValue: value })
		this._shape = value
		this.events.emit('change:shape', value)
	}

	get animation(): TSkeletonAnimation | undefined {
		return this._animation
	}

	set animation(value: TSkeletonAnimation | undefined) {
		if (value === this._animation) return

		this._classes.swap({ prefix: '--animation-', oldValue: this._animation, newValue: value })
		this._animation = value
		this.events.emit('change:animation', value)
	}

	get width(): number | string {
		return this._width
	}

	set width(value: number | string) {
		if (value === this._width) return

		this._width = value
		this.events.emit('change:width', value)
	}

	get height(): number | string {
		return this._height
	}

	set height(value: number | string) {
		if (value === this._height) return

		this._height = value
		this.events.emit('change:height', value)
	}

	getProps(): ISkeletonProps {
		return {
			...super.getProps(),
			variant: this._states.variant.value,
			shape: this._shape,
			animation: this._animation,
			width: this._width,
			height: this._height,
		} as ISkeletonProps
	}
}
