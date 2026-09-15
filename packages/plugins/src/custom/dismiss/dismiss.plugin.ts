import { isEventSource } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { IDismissPluginOptions, TDismissPluginEvents } from './types'

/**
 * TDismissPlugin — «нажали мимо».
 *
 * Общий для всего, что открывается поверх страницы: Select, Menu, Popover,
 * Tooltip. Сам ничего не закрывает — только сообщает событием `dismiss`.
 * Решение принимает владелец: у него может быть причина остаться открытым.
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
 * переходит только перед `click`, уже после `pointerup`. Мышь и перо остаются
 * на `pointerdown`.
 *
 * Как считается «мимо». Панель обычно телепортирована в `body`, то есть
 * лежит вне поддерева владельца — простой `contains()` по корню посчитал бы
 * нажатие внутри панели нажатием снаружи. Поэтому панель помечается
 * `data-owner="<uid владельца>"`, и плагин проверяет обе границы. Это чистый
 * DOM: работает одинаково во всех шести адаптерах и не требует проводки
 * между компонентами.
 */
export class TDismissPlugin extends TBasePlugin<any, TDismissPluginEvents> {
	/** Умолчания опций, объявленных пропами, — см. `TAnchorPlugin.defaultValues`. */
	static defaultValues: Required<Pick<IDismissPluginOptions, 'enabled'>> = {
		enabled: false,
	}

	private _element: HTMLElement | null = null
	private _owner: string | null = null
	private _instance: object | null = null
	private _property: string | null = 'open'
	private _enabled = TDismissPlugin.defaultValues.enabled
	private _listening = false
	/** `pointerId` касания мимо, которое ждёт своего `pointerup`. */
	private _touchId: number | null = null

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

		this._bindOpenState(options?.event ?? `change:${this._property}`)
	}

	/**
	 * Связывает слежение с открытостью владельца.
	 *
	 * Логика простая, но повторять её в шаблоне каждого адаптера нельзя:
	 * поменяешь в одном — забудешь в пяти остальных.
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

		this.events.on('dismiss', () => {
			Reflect.set(instance, property, false)
		})

		this.enabled = !!Reflect.get(instance, property)
	}

	/** Следит ли плагин за нажатиями. Владелец включает его на открытии. */
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
		return this._owner ? { 'data-owner': this._owner } : {}
	}

	override destroy(): void {
		this._enabled = false
		this._sync()

		this._element = null

		super.destroy()
	}

	/** Пришлось ли нажатие внутрь владельца или его панели. */
	private _isInside(target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false

		if (this._element?.contains(target)) return true

		return !!this._owner && !!target.closest(`[data-owner="${this._owner}"]`)
	}

	/** Мышь и перо решают на нажатии, касание — на отпускании (см. шапку). */
	private readonly _onPointerDown = (event: PointerEvent): void => {
		if (event.pointerType === 'touch') {
			this._startTouch(event)
			return
		}

		if (this._isInside(event.target)) return

		this.events.emit('dismiss', event)
	}

	/**
	 * Касание ничего не закрывает — только запоминается, если пришлось мимо.
	 * Ждём последнее опущенное касание: палец, лёгший внутрь, снимает ожидание
	 * прежнего, иначе его отпускание закрыло бы панель, с которой уже работают.
	 */
	private _startTouch(event: PointerEvent): void {
		this._touchId = this._isInside(event.target) ? null : event.pointerId
	}

	/** Касание мимо отпустили, не начав прокрутку, — это и есть нажатие мимо. */
	private readonly _onPointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this._touchId) return

		this._touchId = null
		this.events.emit('dismiss', event)
	}

	/** Браузер забрал касание под прокрутку или жест — закрывать нечего. */
	private readonly _onPointerCancel = (event: PointerEvent): void => {
		if (event.pointerId !== this._touchId) return

		this._touchId = null
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
		} else {
			doc.removeEventListener('pointerdown', this._onPointerDown, true)
			doc.removeEventListener('pointerup', this._onPointerUp, true)
			doc.removeEventListener('pointercancel', this._onPointerCancel, true)
			// Отпускание касания, начатого до снятия, к следующему открытию не относится
			this._touchId = null
		}

		this._listening = shouldListen
	}
}
