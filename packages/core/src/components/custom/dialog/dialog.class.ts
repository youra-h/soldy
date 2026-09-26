import { TModalLayer } from '../../base/modal-layer'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { TComponentViewStates } from '../../base/component-view'
import type { TAriaAttributes } from '../../../common'
import type { IDialog, IDialogProps, TDialogEvents, TDialogPlacement } from './types'

/**
 * Модальное окно.
 *
 * Паттерн APG — Dialog (Modal). Всё, что следует из модальности, — роль,
 * `aria-modal`, имя от заголовка, кнопка закрытия, запрос закрытия с
 * отменяемым `close:before`, `dismissible` и размер — у общей с выезжающей
 * панелью базы `TModalLayer`. Своего у окна три вещи: место на экране,
 * разворот и режим предупреждения.
 *
 * **Предупреждение** (`alert`) — вариант того же окна, а не отдельный
 * компонент: клавиатура и фокус у него те же. Меняется роль —
 * `alertdialog`, — и описанием окна становится тело (`aria-describedby`).
 *
 * **Место, размер и разворот — значения, раскладка — тема.** Место уходит
 * модификатором `--placement-<v>` (стоит всегда, и у центра), развёрнутость —
 * `data-maximized`, ширина, высота и отступ от краёв экрана — переменными
 * раскладки (`TDialogLayoutPlugin`). Координат и замеров у окна нет.
 */
export default class TDialog
	extends TModalLayer<IDialogProps, TDialogEvents, TComponentViewStates>
	implements IDialog
{
	static override baseClass = 's-dialog'

	static defaultValues: typeof TModalLayer.defaultValues &
		TDefaultValues<
			IDialogProps,
			'placement' | 'maximized' | 'maximizable' | 'maximizeLabel' | 'alert',
			'offset'
		> = {
		...TModalLayer.defaultValues,
		placement: 'center',
		// Не задан — отступ темы. Не `0`: ноль — это «вплотную к краям»
		offset: undefined,
		maximized: false,
		maximizable: false,
		maximizeLabel: 'Maximize',
		alert: false,
	}

	protected _placement!: TDialogPlacement
	protected _offset: number | string | undefined
	protected _maximized!: boolean
	protected _maximizable: boolean
	protected _maximizeLabel: string
	protected _alert!: boolean

	constructor(
		props: Partial<IDialogProps> = {},
		options: IComponentOptions<TComponentViewStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TDialog

		this._offset = props.offset ?? ctor.defaultValues.offset
		this._maximizable = props.maximizable ?? ctor.defaultValues.maximizable
		this._maximizeLabel = props.maximizeLabel ?? ctor.defaultValues.maximizeLabel

		this._applyAlert(props.alert ?? ctor.defaultValues.alert)
		this._applyPlacement(props.placement ?? ctor.defaultValues.placement)
		this._applyMaximized(props.maximized ?? ctor.defaultValues.maximized)
	}

	/** Развернуть окно или вернуть ему размер — действие кнопки разворота. */
	toggleMaximized(): void {
		this.maximized = !this._maximized
	}

	/** Где окно стоит на экране: по центру или у одной из сторон. */
	get placement(): TDialogPlacement {
		return this._placement
	}

	set placement(value: TDialogPlacement) {
		if (this._placement === value) return

		this._applyPlacement(value, this._placement)
		this.events.emit('change:placement', value)
	}

	/**
	 * Отступ окна от краёв экрана: число — px, строка — CSS-значение. Не задан
	 * — отступ темы, `0` — вплотную. Один на все стороны: у центра он
	 * действует со всех, у стороны — от её края, и со всех — как потолок
	 * размера. Стороны по отдельности правит подписчик `layout:offset:before`
	 * — событие раскладки, а не ядра: значение уходит теме переменными.
	 */
	get offset(): number | string | undefined {
		return this._offset
	}

	set offset(value: number | string | undefined) {
		if (this._offset === value) return

		this._offset = value
		this.events.emit('change:offset', value)
	}

	/**
	 * Развёрнуто ли окно на весь экран. Пишут и разработчик, и кнопка
	 * разворота: состояние одно, иначе кнопка разошлась бы с тем, что видно.
	 */
	get maximized(): boolean {
		return this._maximized
	}

	set maximized(value: boolean) {
		if (this._maximized === value) return

		this._applyMaximized(value)
		this.events.emit('change:maximized', value)
	}

	/** Показывать ли кнопку разворота. Развернуть окно можно и без неё — `maximized`. */
	get maximizable(): boolean {
		return this._maximizable
	}

	set maximizable(value: boolean) {
		if (this._maximizable === value) return

		this._maximizable = value
		this.events.emit('change:maximizable', value)
	}

	/**
	 * Имя кнопки разворота. Одно на оба состояния: кнопка — переключатель, и
	 * состояние она сообщает `aria-pressed`, а не сменой имени (APG, Button).
	 */
	get maximizeLabel(): string {
		return this._maximizeLabel
	}

	set maximizeLabel(value: string) {
		if (this._maximizeLabel === value) return

		this._maximizeLabel = value
		this.events.emit('change:maximizeLabel', value)
	}

	/** Окно — предупреждение: `role="alertdialog"`, описание — тело окна. */
	get alert(): boolean {
		return this._alert
	}

	set alert(value: boolean) {
		if (this._alert === value) return

		this._applyAlert(value)
		this.events.emit('change:alert', value)
	}

	/** Сторона тела: на него ссылается `aria-describedby` предупреждения. */
	get bodyAria(): TAriaAttributes {
		return { id: this._bodyId }
	}

	/** Имя кнопки разворота и её состояние: нажата — окно развёрнуто. */
	get maximizeAria(): TAriaAttributes {
		return {
			'aria-label': this._maximizeLabel,
			'aria-pressed': this._maximized ? 'true' : 'false',
		}
	}

	/** `id` тела — одна формула на обе стороны связки. */
	protected get _bodyId(): string {
		return `s-dialog-body-${this.idBase}`
	}

	protected _applyAlert(value: boolean): void {
		this._alert = value

		this._aria.add('role', value ? 'alertdialog' : 'dialog')
		// Описание — у предупреждения: его тело и есть то, о чём спрашивают.
		// У обычного окна тело — форма, и скринридер зачитал бы её целиком
		this._aria.add('aria-describedby', value ? this._bodyId : null)
	}

	protected _applyPlacement(newValue: TDialogPlacement, oldValue?: TDialogPlacement): void {
		this._classes.swap({
			prefix: '--placement-',
			oldValue,
			newValue,
		})

		this._placement = newValue
	}

	protected _applyMaximized(value: boolean): void {
		this._maximized = value

		// Тема по нему разворачивает окно, а место и размер перестают действовать
		this._dataset.add('maximized', value)
	}

	override getProps(): IDialogProps {
		return {
			...super.getProps(),
			placement: this._placement,
			offset: this._offset,
			maximized: this._maximized,
			maximizable: this._maximizable,
			maximizeLabel: this._maximizeLabel,
			alert: this._alert,
		}
	}
}
