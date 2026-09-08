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
 * Как считается «мимо». Панель обычно телепортирована в `body`, то есть
 * лежит вне поддерева владельца — простой `contains()` по корню посчитал бы
 * нажатие внутри панели нажатием снаружи. Поэтому панель помечается
 * `data-owner="<uid владельца>"`, и плагин проверяет обе границы. Это чистый
 * DOM: работает одинаково во всех шести адаптерах и не требует проводки
 * между компонентами.
 */
export class TDismissPlugin extends TBasePlugin<any, TDismissPluginEvents> {
	private _element: HTMLElement | null = null
	private _owner: string | null = null
	private _instance: Record<string, any> | null = null
	private _property: string | null = 'open'
	private _enabled = false
	private _listening = false

	override install(ctx: IPluginContext, options?: IDismissPluginOptions): void {
		super.install(ctx, options)

		const instance = ctx.getInstance<Record<string, any>>()

		if (instance) {
			this._instance = instance
			this._owner = String(instance.uid)
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
		this._enabled = options?.enabled ?? false

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

		instance.events?.on(event, () => {
			this.enabled = !!instance[property]
		})

		this.events.on('dismiss', () => {
			instance[property] = false
		})

		this.enabled = !!instance[property]
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

	private readonly _onPointerDown = (event: PointerEvent): void => {
		if (this._isInside(event.target)) return

		this.events.emit('dismiss', event)
	}

	/** Слушатель на документе живёт, только пока он нужен. */
	private _sync(): void {
		const shouldListen = this._enabled && !!this._element

		if (shouldListen === this._listening) return

		const doc = this._element?.ownerDocument ?? globalThis.document

		if (!doc) return

		if (shouldListen) {
			doc.addEventListener('pointerdown', this._onPointerDown, true)
		} else {
			doc.removeEventListener('pointerdown', this._onPointerDown, true)
		}

		this._listening = shouldListen
	}
}
