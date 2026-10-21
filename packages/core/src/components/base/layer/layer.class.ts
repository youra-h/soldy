import { TComponentView } from '../component-view'
import type { TDefaultValues } from '../component'
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
 * **Стек один на все слои.** Показанный слой берёт место выше всех выданных
 * раньше — через статический счётчик {@link TLayer.nextZIndex}, общий для
 * Frame и окна. Два счётчика дали бы двум слоям одно место: список Select,
 * открытый из окна, встал бы под окно, а нажатие в него закрыло бы окно. Слой,
 * созданный видимым, место берёт сразу: `show` для него не придёт, а на
 * экране он уже есть.
 *
 * **Номер места — у слоя с узлом.** Снаружи место видно номером: `zIndex`, тот
 * же номер в `data-layer` (`FRAME_LAYER_ATTRIBUTE`) — по нему плагины оверлея
 * отличают слой, открытый позже, от открытого раньше, — и `change:zIndex`.
 * Номер открывается, когда у слоя есть узел (`ready`); без узла `zIndex` —
 * `0`, а атрибута нет. Причина — серверная разметка: счётчик один на процесс,
 * и у сервера он свой, поэтому номер слоя, открытого уже на сервере, у сервера
 * и браузера разошёлся бы, и гидратация не сошлась бы. На сервере узла нет, и
 * номера в разметке нет; браузер рисует ту же разметку, а номер приходит
 * кадром `ready`. Место при этом взято раньше — при создании, показе или
 * `raise()`, — поэтому слои, открытые сразу, встают в порядке создания, а не
 * привязки узлов: её порядок у каждого адаптера свой, и поповер, открытый в
 * окне, встал бы под окно. Приём тот же, что у `value` Slider: своё значение —
 * место в поле, итог — геттер `zIndex`, событие — о смене итога.
 *
 * **Открытость для темы — `data-open`**: проекция `visible` в набор, второй
 * записи состояния нет. По нему тема ведёт переход к закрытому виду и
 * обратно: слой гаснет и проявляется, панель у края уезжает и въезжает.
 * Своего появления и исчезания у ядра нет — ни «присутствия», ни хуков под
 * анимацию: закрытый слой спрятан `visible`, а переход до скрытия и после
 * показа держит CSS. Пишет атрибут сам слой, а не владелец панели: панель
 * телепортирована, и `data-open` корня владельца до неё не доходит, а
 * открытость панели — это видимость её слоя. Поэтому атрибут есть у панели
 * любого Frame без проводки в разметке.
 *
 * @example
 * const layer = new TLayer()
 * layer.show() // берёт место в стеке, становится visible; zIndex — 0, узла нет
 * layer.ready = true // узел подключён: zIndex — номер места, он же в data-layer
 * layer.hide() // скрывается, номер остаётся до следующего показа
 * layer.ready = false // узел снят: zIndex — 0, data-layer снят; место за слоем
 */
export default class TLayer<
	TProps extends ILayerProps = ILayerProps,
	TEvents extends TLayerEvents = TLayerEvents,
>
	extends TComponentView<TProps, TEvents>
	implements ILayer<TProps, TEvents>
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

	/**
	 * Место слоя в стеке — своё значение `zIndex`. `0` — места слой ещё не
	 * брал. Наружу уходит итог: номер места только у слоя с узлом.
	 */
	protected _zIndex: number = 0
	protected _target: string

	constructor(props: Partial<TProps> = {}) {
		const ctor = new.target as typeof TLayer

		super(props)

		this._target = props.target ?? ctor.defaultValues.target

		// Показ поднимает слой над всеми, кто показан раньше
		this.events.on('show', () => this.raise())

		// Созданный видимым уже на экране, а `show` для него не придёт. Без места
		// он и с узлом стоял бы с `z-index: 0` под всеми, и нажатие в панель,
		// открытую поверх него, плагин оверлея счёл бы нажатием мимо
		if (this.visible) this.raise()

		// Подключённый узел открывает номер места, снятый — прячет. `ready`
		// приходит только со сменой, поэтому итог до неё известен: до
		// подключения — `0`, до снятия — номер места
		this.events.on('ready', (ready) => this._zIndexChanged(ready ? 0 : this._zIndex))

		this._syncOpen()
		this.events.on('change:visible', () => this._syncOpen())
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TLayerEvents> {
		return this.events
	}

	/**
	 * Поднять слой над всеми выданными: новое место — выше всех. У слоя с
	 * узлом новый номер сразу в `zIndex` и `data-layer`, у слоя без узла — с
	 * его подключением.
	 *
	 * Показ зовёт его сам. Снаружи — тому, кто виден всегда и встаёт наверх
	 * по своему поводу: регион тостов поднимается на каждый новый тост и на
	 * F8, и «Сохранено» видно поверх окна, открытого раньше.
	 */
	raise(): void {
		const before = this.zIndex

		this._zIndex = TLayer.nextZIndex()
		this._zIndexChanged(before)
	}

	/**
	 * Итог `zIndex` мог смениться — номер в `data-layer` и `change:zIndex`,
	 * если сменился. Номер — в набор раньше события: по `change:zIndex` разметка
	 * перечитывает `backdropDataset` модального слоя, а тот берёт номер из
	 * набора.
	 */
	private _zIndexChanged(before: number): void {
		const after = this.zIndex

		if (after === before) return

		this._dataset.add(FRAME_LAYER_ATTRIBUTE, after === 0 ? null : after)
		this._sink.emit('change:zIndex', after)
	}

	/**
	 * Открытость — теме: по `data-open` она ведёт переход к закрытому виду, и
	 * переходу до скрытия есть к чему идти.
	 */
	private _syncOpen(): void {
		this._dataset.add('open', this.visible)
	}

	/**
	 * Номер слоя в общем стеке — место слоя, если у него есть узел (`ready`).
	 * Без узла — `0`: на сервере узла нет, и номер, взятый у счётчика процесса,
	 * не попадает в разметку, с которой браузер её сверяет.
	 */
	get zIndex(): number {
		return this.ready ? this._zIndex : 0
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
