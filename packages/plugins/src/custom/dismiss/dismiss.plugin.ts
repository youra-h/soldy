import { isEventSource } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { isAboveLayer } from '../../utils'
import { TElementPlugin } from '../element'
import type { IDismissPluginOptions, TDismissPendingPress, TDismissPluginEvents } from './types'

/** Атрибут, которым панель помечается владельцем (`ownerAttribute`). */
const OWNER_ATTRIBUTE = 'data-owner'

/**
 * TDismissPlugin — «нажали мимо».
 *
 * Общий для всего, что открывается поверх страницы: Select, Menu, Popover,
 * Tooltip. Сообщает событием `dismiss`, а владельца, чью открытость ведёт
 * (`property`), закрывает уже после этого — подписчики застают его открытым и
 * знают причину закрытия. Без привязки (`property: null`) только сообщает.
 *
 * Почему `pointerdown`, а не `click`. Клик приходит после отпускания кнопки,
 * и до него успевает произойти смена фокуса — панель закрывается уже после
 * того, как фокус ушёл, и порядок событий для скринридера ломается.
 *
 * Касание пальцем решается на `pointerup`. На тач-устройстве с того же
 * `pointerdown` начинается прокрутка страницы, и панель закрывалась бы, едва
 * пользователь начал листать. Поэтому касание мимо только запоминает свой
 * `pointerId`, а `dismiss` шлёт `pointerup` того же касания. Порог сдвига не
 * нужен: забрав касание под прокрутку, браузер шлёт `pointercancel`, и
 * `pointerup` не приходит. `click` не годится и здесь — `pointerType` в нём
 * есть не у всех браузеров. Порядку фокуса это не вредит: на касании фокус
 * переходит только перед `click`, уже после `pointerup`. Мышь остаётся на
 * `pointerdown`.
 *
 * Перо решается первым из двух событий: `pointerup` того же `pointerId` или
 * совместимым `mousedown`. По `pointerType` стилус на сенсорном экране (Apple
 * Pencil, S Pen, перо Windows-планшета) не отличить от пера графического
 * планшета, а ведут они себя по-разному. Решать перо на `pointerdown`, как
 * мышь, нельзя: стилус листает страницу, как палец. Ждать `pointerup`, как у
 * касания, тоже нельзя: перо планшета ведёт себя как мышь — `mousedown`, а с
 * ним и смена фокуса, идёт сразу за `pointerdown`, и панель закрылась бы уже
 * после ухода фокуса. Поэтому устройство не угадываем, а решаем по порядку
 * событий, который задаёт браузер. На планшете первым приходит `mousedown`, и
 * панель закрывается до смены фокуса. Стилусу на экране совместимые события
 * мыши приходят только после отпускания: решает `pointerup`, а прокрутка
 * (`pointercancel`) снимает ожидание и ничего не закрывает. Исключение одно:
 * страница отменила `pointerdown`. Совместимых событий тогда нет, и перо
 * решает `pointerup` и на планшете.
 *
 * Как считается «мимо». Панель обычно телепортирована в `body`, то есть
 * лежит вне поддерева владельца — простой `contains()` по корню посчитал бы
 * нажатие внутри панели нажатием снаружи. Поэтому панель помечается
 * `data-owner="<uid владельца>"`, и плагин проверяет обе границы. Это чистый
 * DOM: работает одинаково во всех шести адаптерах и не требует проводки
 * между компонентами.
 *
 * Третья граница — слои. Список Select в поповере, поповер в поповере — это
 * тоже панели в `body`, соседи панели владельца, а не её потомки. Нажатие в
 * них — нажатие внутри: слой открыт поверх панели владельца, из неё. Порядок
 * слоёв ведёт `TFrame` (`data-layer`, номер растёт с каждым показом), и
 * нажатие в панель, чей слой выше слоя своей, мимо не считается. Слой ниже
 * или узел без слоя — мимо: так закрывается вложенный слой нажатием во
 * внешний.
 *
 * С `focusOutside` то же правило решает и уход фокуса: `focusin` мимо
 * владельца, его панели и слоёв выше даёт `dismiss`.
 */
export class TDismissPlugin extends TBasePlugin<any, TDismissPluginEvents> {
	/** Умолчания опций, объявленных пропами, — см. `TAnchorPlugin.defaultValues`. */
	static defaultValues: Required<Pick<IDismissPluginOptions, 'enabled'>> = {
		enabled: false,
	}

	private _element: Element | null = null
	private _owner: string | null = null
	private _instance: object | null = null
	private _property: string | null = 'open'
	/** Ведёт ли плагин открытость владельца: тогда `dismiss` его и закрывает. */
	private _bound = false
	private _enabled = TDismissPlugin.defaultValues.enabled
	private _focusOutside = false
	private _listening = false
	/** Нажатие мимо, которое ждёт решения, — касание или перо (см. `_onPointerDown`). */
	private _pending: TDismissPendingPress | null = null

	override install(ctx: IPluginContext, options?: IDismissPluginOptions): void {
		super.install(ctx, options)

		const instance = ctx.getInstance<object>()

		if (instance) {
			this._instance = instance
			this._owner = String(Reflect.get(instance, 'uid'))
		}

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			this._sync()
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element = null
			this._sync()
		})

		this._property = options?.property === undefined ? this._property : options.property
		this._enabled = options?.enabled ?? this._enabled
		this._focusOutside = options?.focusOutside ?? this._focusOutside

		this._bindOpenState(options?.event ?? `change:${this._property}`)
	}

	/**
	 * Связывает слежение с открытостью владельца.
	 *
	 * Логика простая, но повторять её в шаблоне каждого адаптера нельзя:
	 * поменяешь в одном — забудешь в пяти остальных.
	 *
	 * Закрывает владельца `_dismiss`, после подписчиков `dismiss`, а не первый
	 * подписчик: иначе остальные узнавали бы о нажатии мимо уже закрытыми и не
	 * отличали бы его от закрытия по другой причине.
	 */
	private _bindOpenState(event: string): void {
		const instance = this._instance
		const property = this._property

		if (!instance || !property || !(property in instance)) return

		const events: unknown = Reflect.get(instance, 'events')

		if (isEventSource(events)) {
			events.on(event, () => {
				this.enabled = !!Reflect.get(instance, property)
			})
		}

		this._bound = true
		this.enabled = !!Reflect.get(instance, property)
	}

	/** Сообщает о нажатии или фокусе мимо, потом закрывает владельца. */
	private _dismiss(event: MouseEvent | FocusEvent): void {
		this.events.emit('dismiss', event)

		if (this._bound && this._instance && this._property) {
			Reflect.set(this._instance, this._property, false)
		}
	}

	/**
	 * Следит ли плагин за нажатиями (с `focusOutside` — и за фокусом).
	 * Владелец включает его на открытии.
	 */
	get enabled(): boolean {
		return this._enabled
	}

	set enabled(value: boolean) {
		if (this._enabled === value) return

		this._enabled = value
		this._sync()
		this.events.emit('change:enabled', value)
	}

	/**
	 * Атрибут для панели владельца. Разметка раскладывает его спредом на
	 * телепортированный узел, иначе нажатие внутри панели будет считаться
	 * нажатием мимо.
	 */
	get ownerAttribute(): Record<string, string> {
		return this._owner ? { [OWNER_ATTRIBUTE]: this._owner } : {}
	}

	/**
	 * Панель владельца — узел с его `ownerAttribute` в документе корня. `null`,
	 * пока корень не объявлен или панели в документе нет.
	 *
	 * Панель телепортирована, и ссылки на неё у плагинов нет: разметка отдаёт
	 * им только корень. Поэтому её находят по той же пометке, по которой
	 * плагин отличает нажатие в неё. Нужна и соседям по набору: плагин фокуса
	 * Popover уводит фокус в панель и слушает на ней клавиши.
	 */
	findPanel(): Element | null {
		if (!this._owner) return null

		return (
			this._element?.ownerDocument.querySelector(`[${OWNER_ATTRIBUTE}="${this._owner}"]`) ??
			null
		)
	}

	override destroy(): void {
		this._enabled = false
		this._sync()

		this._element = null

		super.destroy()
	}

	/**
	 * Пришлось ли нажатие или фокус внутрь владельца, его панели или слоя выше
	 * неё — панели, открытой поверх своей (см. шапку). Правило слоёв общее с
	 * `THideOutsidePlugin`, поэтому живёт в утилитах (`isAboveLayer`).
	 */
	private _isInside(target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false

		if (this._element?.contains(target)) return true

		if (this._owner && target.closest(`[${OWNER_ATTRIBUTE}="${this._owner}"]`)) return true

		return isAboveLayer(target, this.findPanel())
	}

	/**
	 * Мышь решает на нажатии, касание и перо ждут (см. шапку).
	 *
	 * Ожидание одно — для последнего опущенного нажатия, поэтому любое нажатие
	 * (мышью, пальцем или пером, внутрь или мимо) сначала снимает прежнее.
	 * Иначе панель, с которой уже работают, закрыло бы отпускание пальца,
	 * лёгшего мимо раньше, или `mousedown` мыши, нажатой внутрь, пока перо
	 * лежит мимо: он засчитался бы за перо.
	 */
	private readonly _onPointerDown = (event: PointerEvent): void => {
		this._pending = null

		if (event.pointerType === 'touch') {
			this._startTouch(event)
			return
		}

		if (event.pointerType === 'pen') {
			this._startPen(event)
			return
		}

		if (this._isInside(event.target)) return

		this._dismiss(event)
	}

	/** Касание ничего не закрывает — только запоминается, если пришлось мимо. */
	private _startTouch(event: PointerEvent): void {
		if (this._isInside(event.target)) return

		this._pending = { pointerId: event.pointerId, pointerType: 'touch' }
	}

	/**
	 * Перо тоже только запоминается, если пришлось мимо. Решит его то, что
	 * придёт первым: `pointerup` (стилус на экране) или совместимый `mousedown`
	 * (перо графического планшета).
	 */
	private _startPen(event: PointerEvent): void {
		if (this._isInside(event.target)) return

		this._pending = { pointerId: event.pointerId, pointerType: 'pen' }
	}

	/**
	 * Касание или перо мимо отпустили, не начав прокрутку, — это и есть нажатие
	 * мимо. Перо, которое уже решил его `mousedown`, ожидания не оставляет, и
	 * отпускание его не повторяет.
	 */
	private readonly _onPointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this._pending?.pointerId) return

		this._pending = null
		this._dismiss(event)
	}

	/** Браузер забрал касание или перо под прокрутку или жест — закрывать нечего. */
	private readonly _onPointerCancel = (event: PointerEvent): void => {
		if (event.pointerId !== this._pending?.pointerId) return

		this._pending = null
	}

	/**
	 * Совместимый `mousedown` решает перо, если пришёл раньше его `pointerup`:
	 * так ведёт себя перо планшета, и панель закрывается до смены фокуса.
	 *
	 * Касание он не решает: прослойки, которые шлют `mousedown` на
	 * `touchstart`, вернули бы закрытие в начале прокрутки. Мышь к нему уже
	 * решена своим `pointerdown` и ожидания не оставляет. Переносить её сюда
	 * нельзя: страница, отменившая `pointerdown` (так делают drag-библиотеки),
	 * совместимого `mousedown` не получает.
	 */
	private readonly _onMouseDown = (event: MouseEvent): void => {
		if (this._pending?.pointerType !== 'pen') return

		this._pending = null
		this._dismiss(event)
	}

	/**
	 * Фокус ушёл мимо — с `focusOutside`. Слушатель на документе, в фазе
	 * перехвата, как у нажатий: `focusin` всплывает, и остановить его до
	 * документа содержимое не может.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		if (this._isInside(event.target)) return

		this._dismiss(event)
	}

	/** Слушатели на документе живут, только пока они нужны. */
	private _sync(): void {
		const shouldListen = this._enabled && !!this._element

		if (shouldListen === this._listening) return

		const doc = this._element?.ownerDocument ?? globalThis.document

		if (!doc) return

		if (shouldListen) {
			doc.addEventListener('pointerdown', this._onPointerDown, true)
			doc.addEventListener('pointerup', this._onPointerUp, true)
			doc.addEventListener('pointercancel', this._onPointerCancel, true)
			doc.addEventListener('mousedown', this._onMouseDown, true)

			if (this._focusOutside) doc.addEventListener('focusin', this._onFocusIn, true)
		} else {
			doc.removeEventListener('pointerdown', this._onPointerDown, true)
			doc.removeEventListener('pointerup', this._onPointerUp, true)
			doc.removeEventListener('pointercancel', this._onPointerCancel, true)
			doc.removeEventListener('mousedown', this._onMouseDown, true)
			doc.removeEventListener('focusin', this._onFocusIn, true)
			// Нажатие, начатое до снятия, к следующему открытию не относится
			this._pending = null
		}

		this._listening = shouldListen
	}
}
