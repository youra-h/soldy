import { TComponentView } from '../component-view'
import type { TComponentViewStates } from '../component-view'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { TEventSink } from '../../../common'
import { FRAME_LAYER_ATTRIBUTE } from './types'
import type { ILayer, ILayerProps, TLayerEvents } from './types'

/**
 * Слой поверх страницы — общая база того, что телепортируется и встаёт над
 * остальным: Frame и модального слоя — окна и выезжающей панели.
 *
 * Своего у слоя три вещи: куда его телепортировать (`target`), видимость —
 * по умолчанию скрыт, оверлей открывают, — и место в стеке. Как слой разложен
 * на экране, решает наследник: Frame — координатами (`x`/`y`), окно и
 * панель — местом, краем и размером, которые раскладывает тема.
 *
 * **Стек один на все слои.** Показанный слой получает z-index выше всех
 * выданных раньше — через статический счётчик {@link TLayer.nextZIndex}, общий
 * для Frame и окна, — и тот же номер в `data-layer` (`FRAME_LAYER_ATTRIBUTE`):
 * по нему плагины оверлея отличают слой, открытый позже, от открытого раньше.
 * Два счётчика дали бы двум слоям один номер: список Select, открытый из
 * окна, встал бы под окно, а нажатие в него закрыло бы окно. Слой, созданный
 * видимым, номер получает сразу: `show` для него не придёт, а на экране он
 * уже есть.
 *
 * @example
 * const layer = new TLayer()
 * layer.show() // получает z-index, становится visible
 * layer.hide() // скрывается, номер остаётся до следующего показа
 */
export default class TLayer<
	TProps extends ILayerProps = ILayerProps,
	TEvents extends TLayerEvents = TLayerEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
>
	extends TComponentView<TProps, TEvents, TStates>
	implements ILayer<TProps, TEvents, TStates>
{
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<ILayerProps, 'target'> = {
		...TComponentView.defaultValues,
		// Слой скрыт, пока его не открыли
		visible: false,
		target: 'body',
	}

	/**
	 * Базовый z-index всех слоёв. Можно переопределить статически — у
	 * `TLayer`: стек один, и наследники своей базы не держат.
	 */
	static baseZIndex: number = 1000

	/** Счётчик z-index (только инкремент), один на все слои. */
	private static _zIndexCounter: number = 0

	/**
	 * Получить следующий z-index — выше всех выданных.
	 * Вызывается автоматически при show(), но доступен и снаружи.
	 */
	static nextZIndex(): number {
		return TLayer.baseZIndex + ++TLayer._zIndexCounter
	}

	/** Сбросить счётчик (для тестов). */
	static resetZIndexCounter(): void {
		TLayer._zIndexCounter = 0
	}

	protected _zIndex: number = 0
	protected _target: string

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		const ctor = new.target as typeof TLayer

		super(props, options)

		this._target = props.target ?? ctor.defaultValues.target

		// Показ поднимает слой над всеми, кто показан раньше
		this.events.on('show', () => this._raise())

		// Созданный видимым уже на экране, а `show` для него не придёт. Без слоя
		// он стоял бы с `z-index: 0` под всеми, и нажатие в панель, открытую
		// поверх него, плагин оверлея счёл бы нажатием мимо
		if (this.visible) this._raise()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TLayerEvents> {
		return this.events
	}

	/** Новый z-index — выше всех выданных — и тот же номер в `data-layer`. */
	private _raise(): void {
		this._zIndex = TLayer.nextZIndex()
		this._dataset.add(FRAME_LAYER_ATTRIBUTE, this._zIndex)
		this._sink.emit('change:zIndex', this._zIndex)
	}

	get zIndex(): number {
		return this._zIndex
	}

	get target(): string {
		return this._target
	}
	set target(value: string) {
		if (this._target === value) return
		this._target = value
		this._sink.emit('change:target', value)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			target: this._target,
		}
	}
}
