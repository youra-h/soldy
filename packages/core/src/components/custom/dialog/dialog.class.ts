import { TLayer, TCloseEvent, FRAME_LAYER_ATTRIBUTE } from '../../base/layer'
import type { TCloseReason } from '../../base/layer'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { TComponentViewStates } from '../../base/component-view'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'
import type { IDialog, IDialogProps, TDialogEvents, TDialogPlacement } from './types'

/**
 * Модальное окно.
 *
 * Паттерн APG — Dialog (Modal). Окно — слой (`TLayer`) целиком: корень и есть
 * панель, телепортированная в `body`, с номером слоя и открытостью в
 * `visible`. Панель объявляет себя `role="dialog"` и `aria-modal="true"`, имя
 * ей даёт заголовок (`aria-labelledby`). Фокус, замкнутый Tab и Escape — у
 * `TModalFocusPlugin`, нажатие мимо — у `TDismissPlugin`, немой для
 * скринридера фон — у `THideOutsidePlugin`, запертая прокрутка — у
 * `TScrollLockPlugin`: здесь только состояние и то, что из него следует для
 * разметки.
 *
 * **Имя — заголовок.** Слот `title` рисуется всегда, и `aria-labelledby`
 * ссылается на него: формула `id` одна на обе стороны связки, и сторону
 * заголовка ядро отдаёт выходом `titleAria` — у разметки без экземпляра
 * набора нет. `TAriaPlugin` окну не ставится: он пишет те же ключи и снял бы
 * связку при установке.
 *
 * **Предупреждение** (`alert`) — вариант того же окна, а не отдельный
 * компонент: клавиатура и фокус у него те же. Меняется роль —
 * `alertdialog`, — и описанием окна становится тело (`aria-describedby`).
 *
 * **Закрытие пользователем — запрос** (`requestClose`) с причиной: кнопка
 * закрытия, нажатие мимо или Escape. Запрос проходит через отменяемое
 * `close:before`, а при `dismissible: false` нажатие мимо и Escape
 * отклоняются без события — окно закрывается только кнопкой. Запись
 * `visible` из кода и `v-model` запросом не считаются: родитель, который
 * открытость пишет сам, с окном не разойдётся. Поэтому не `hide:before` —
 * его шлёт и программное скрытие.
 *
 * **Место, размер и разворот — значения, раскладка — тема.** Место уходит
 * модификатором `--placement-<v>` (стоит всегда, и у центра), развёрнутость —
 * `data-maximized`, ширина и высота — переменными раскладки
 * (`TDialogLayoutPlugin`). Координат и замеров у окна нет.
 */
export default class TDialog
	extends TLayer<IDialogProps, TDialogEvents, TComponentViewStates>
	implements IDialog
{
	static override baseClass = 's-dialog'

	static defaultValues: typeof TLayer.defaultValues &
		TDefaultValues<
			IDialogProps,
			| 'placement'
			| 'maximized'
			| 'maximizable'
			| 'closable'
			| 'closeLabel'
			| 'maximizeLabel'
			| 'dismissible'
			| 'alert',
			'width' | 'height'
		> = {
		...TLayer.defaultValues,
		// Не `'auto'`, как у Frame: размер по умолчанию выбирает тема, а
		// `auto` растянул бы окно по экрану
		width: undefined,
		height: undefined,
		placement: 'center',
		maximized: false,
		maximizable: false,
		closable: true,
		closeLabel: 'Close',
		maximizeLabel: 'Maximize',
		dismissible: true,
		alert: false,
	}

	protected _width: number | string | undefined
	protected _height: number | string | undefined
	protected _placement!: TDialogPlacement
	protected _maximized!: boolean
	protected _maximizable: boolean
	protected _closable: boolean
	protected _closeLabel: string
	protected _maximizeLabel: string
	protected _dismissible: boolean
	protected _alert!: boolean

	constructor(
		props: Partial<IDialogProps> = {},
		options: IComponentOptions<TComponentViewStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TDialog

		this._width = props.width ?? ctor.defaultValues.width
		this._height = props.height ?? ctor.defaultValues.height
		this._maximizable = props.maximizable ?? ctor.defaultValues.maximizable
		this._closable = props.closable ?? ctor.defaultValues.closable
		this._closeLabel = props.closeLabel ?? ctor.defaultValues.closeLabel
		this._maximizeLabel = props.maximizeLabel ?? ctor.defaultValues.maximizeLabel
		this._dismissible = props.dismissible ?? ctor.defaultValues.dismissible

		// Окно модально: скринридер вне его не читает. Это значение, а не
		// операция — фон на самих узлах прячет `THideOutsidePlugin`
		this._aria.add('aria-modal', 'true')
		// Имя — заголовок. Ссылка стоит всегда: заголовок рисуется всегда
		this._aria.add('aria-labelledby', this._titleId)

		this._applyAlert(props.alert ?? ctor.defaultValues.alert)
		this._applyPlacement(props.placement ?? ctor.defaultValues.placement)
		this._applyMaximized(props.maximized ?? ctor.defaultValues.maximized)
	}

	/**
	 * Пользователь закрывает окно: кнопкой закрытия, нажатием мимо или
	 * Escape. Нажатие мимо и Escape при `dismissible: false` отклоняются без
	 * события; остальное проходит через отменяемое `close:before`.
	 *
	 * Зовут его кнопка закрытия и плагины слоя. Код, которому нужно просто
	 * закрыть окно, пишет `visible = false`: запросом это не считается.
	 */
	requestClose(reason: TCloseReason): void {
		// Закрывать нечего
		if (!this.visible) return

		// Окно закрывается только кнопкой: нажатие мимо и Escape — не повод
		if (!this._dismissible && reason !== 'button') return

		const event = new TCloseEvent(reason)

		this.events.emit('close:before', event)

		if (event.defaultPrevented) return

		this.hide()
	}

	/** Развернуть окно или вернуть ему размер — действие кнопки разворота. */
	toggleMaximized(): void {
		this.maximized = !this._maximized
	}

	/**
	 * Ширина окна: число — px, строка — CSS-значение. Не задана — ширину даёт
	 * тема. Значение уходит теме переменной, а не инлайном: развёрнутое окно
	 * и потолок по экрану тема держит сама.
	 */
	get width(): number | string | undefined {
		return this._width
	}

	set width(value: number | string | undefined) {
		if (this._width === value) return

		this._width = value
		this.events.emit('change:width', value)
	}

	/** Высота окна: число — px, строка — CSS-значение. Не задана — по содержимому. */
	get height(): number | string | undefined {
		return this._height
	}

	set height(value: number | string | undefined) {
		if (this._height === value) return

		this._height = value
		this.events.emit('change:height', value)
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
	 * Показывать ли кнопку закрытия. Без неё окно закрывают нажатие мимо,
	 * Escape (пока `dismissible`) и код.
	 */
	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable === value) return

		this._closable = value
		this.events.emit('change:closable', value)
	}

	/**
	 * Имя кнопки закрытия. Дефолт английский: язык интерфейса ядру неизвестен,
	 * а оставить кнопку без имени нельзя.
	 */
	get closeLabel(): string {
		return this._closeLabel
	}

	set closeLabel(value: string) {
		if (this._closeLabel === value) return

		this._closeLabel = value
		this.events.emit('change:closeLabel', value)
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

	/**
	 * Закрывают ли окно нажатие мимо и Escape. Выключено — окно закрывается
	 * только кнопкой закрытия и кодом. Закрыть окно только Escape — отменить
	 * `close:before` с причиной `outside`.
	 */
	get dismissible(): boolean {
		return this._dismissible
	}

	set dismissible(value: boolean) {
		if (this._dismissible === value) return

		this._dismissible = value
		this.events.emit('change:dismissible', value)
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

	/**
	 * Сторона заголовка в связке с окном. Отдельный набор, а не часть `aria`:
	 * `aria` описывает панель, а это — вложенный элемент без экземпляра
	 * (AGENTS.md, «Часть или слот»).
	 */
	get titleAria(): TAriaAttributes {
		return { id: this._titleId }
	}

	/** Сторона тела: на него ссылается `aria-describedby` предупреждения. */
	get bodyAria(): TAriaAttributes {
		return { id: this._bodyId }
	}

	/** Имя кнопки закрытия — соседней с содержимым, а не самой панели. */
	get closeAria(): TAriaAttributes {
		return { 'aria-label': this._closeLabel }
	}

	/** Имя кнопки разворота и её состояние: нажата — окно развёрнуто. */
	get maximizeAria(): TAriaAttributes {
		return {
			'aria-label': this._maximizeLabel,
			'aria-pressed': this._maximized ? 'true' : 'false',
		}
	}

	/**
	 * `data-*` подложки — тот же номер слоя, что у окна.
	 *
	 * Подложка — сосед панели в телепорте, и нажатие по ней для плагинов слоя
	 * — нажатие мимо окна. Но окно бывает открыто поверх окна, и для нижнего
	 * подложка верхнего — нажатие в слой выше своего, то есть внутри: без
	 * номера нажатие по подложке верхнего окна закрыло бы оба. Пометки
	 * владельцем (`data-owner`) у подложки нет: для своего окна она — мимо.
	 */
	get backdropDataset(): TDatasetAttributes {
		const layer = this._dataset.get(FRAME_LAYER_ATTRIBUTE)

		return layer === undefined ? {} : { [FRAME_LAYER_ATTRIBUTE]: layer }
	}

	/** `id` заголовка — одна формула на обе стороны связки. */
	protected get _titleId(): string {
		return `s-dialog-title-${this.uid}`
	}

	/** `id` тела — одна формула на обе стороны связки. */
	protected get _bodyId(): string {
		return `s-dialog-body-${this.uid}`
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
			width: this._width,
			height: this._height,
			placement: this._placement,
			maximized: this._maximized,
			maximizable: this._maximizable,
			closable: this._closable,
			closeLabel: this._closeLabel,
			maximizeLabel: this._maximizeLabel,
			dismissible: this._dismissible,
			alert: this._alert,
		}
	}
}
