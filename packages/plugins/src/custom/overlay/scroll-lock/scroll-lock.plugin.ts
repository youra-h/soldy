import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { bindOverlayOpen } from '../open-state'
import type { IOverlayOpenState } from '../types'
import { lockScroll, unlockScroll } from './lock'
import type { IScrollLockPluginOptions, TScrollLockPluginEvents } from './types'

/**
 * TScrollLockPlugin — пока владелец открыт, страница под ним не
 * прокручивается.
 *
 * Модальному окну и выезжающей панели прокрутка фона мешает: пользователь
 * тянет колесо, а уезжает то, с чем он сейчас не работает. Запирается это
 * стилем документа, поэтому живёт в плагине: ядру DOM недоступен, а
 * повторять связку «открыто ⇄ заперто» в шаблоне каждого из шести адаптеров
 * значило бы поменять в одном и забыть в пяти.
 *
 * Открытость плагин ведёт сам — по свойству владельца (`property`, по
 * умолчанию `open`), тем же способом, что `TDismissPlugin`. Вручную замок
 * ведут через `enabled` при `property: null`.
 *
 * Слоёв поверх страницы бывает несколько, и замок у документа один на всех
 * (см. `lock.ts`): два открытых слоя держат его вместе, закрытие одного
 * прокрутку не возвращает. Свой счёт плагин снимает и при размонтировании
 * корня, и в `destroy()` — иначе страница осталась бы запертой навсегда.
 *
 * Документ берётся у корня (`TElementPlugin`), а не из `globalThis`:
 * компонент живёт и в чужом документе — в `iframe`, в окне, открытом
 * `window.open`. Пока корня нет, запирать нечего и негде.
 *
 * Чего плагин не делает: прокрутку внутри самой панели он не трогает — она
 * идёт своим `overflow` в теме. Поведение iOS Safari, где `overflow: hidden`
 * прокрутку не держит, сюда пока не входит.
 */
export class TScrollLockPlugin extends TBasePlugin<any, TScrollLockPluginEvents> {
	/** Умолчания опций, объявленных пропами, — см. `TDismissPlugin.defaultValues`. */
	static defaultValues: Required<Pick<IScrollLockPluginOptions, 'enabled'>> = {
		enabled: false,
	}

	private _open: IOverlayOpenState | null = null
	private _element: Element | null = null
	private _enabled = TScrollLockPlugin.defaultValues.enabled
	/** Документ, у которого плагин держит замок; `null` — не держит. */
	private _locked: Document | null = null

	override install(ctx: IPluginContext, options?: IScrollLockPluginOptions): void {
		super.install(ctx, options)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._sync()
		})

		elementPlugin?.events.on('removed', () => {
			this._element = null
			this._sync()
		})

		this._enabled = options?.enabled ?? this._enabled

		this._open = bindOverlayOpen(ctx, options, (open) => {
			this.enabled = open
		})

		if (this._open) this.enabled = this._open.read()

		this._sync()
	}

	/**
	 * Заперта ли прокрутка. Владелец взводит это открытием; своё значение
	 * плагин держит и без корня — замок ляжет, как только корень объявят.
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

	override destroy(): void {
		this._enabled = false
		this._sync()

		this._element = null
		this._open = null

		super.destroy()
	}

	/** Замок лежит ровно тогда, когда владелец открыт и корень объявлен. */
	private _sync(): void {
		const doc = this._enabled ? (this._element?.ownerDocument ?? null) : null

		if (doc === this._locked) return

		if (this._locked) unlockScroll(this._locked)
		if (doc) lockScroll(doc)

		this._locked = doc
	}
}
