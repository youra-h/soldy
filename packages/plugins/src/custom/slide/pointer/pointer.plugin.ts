import type { ISlidable } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { fractionAt, slideDirection } from '../direction'
import { fieldOf, thumbsOf, trackOf } from '../parts'
import type { TSlidePointerGesture, TSlidePointerPluginEvents } from './types'

/**
 * TSlidePointerPlugin — указатель перетаскивания: нажатие, протяжка и
 * отпускание мыши, пальца и пера.
 *
 * Операции над DOM — здесь, значение — у владельца: плагин переводит точку
 * указателя в долю хода по коробке дорожки и зовёт команды `ISlidable`
 * (`grab`, `press`, `drag`, `release`). Какую ручку вести, куда её поставить и
 * когда слать `commit`, решает владелец. О ползунке плагин не знает — только
 * контракт, поэтому его возьмёт и следующий компонент с перетаскиванием.
 *
 * Слушает корень, а не дорожку: полоса ручек, отступы под ореол и подписи
 * меток — тоже цель для пальца, а долю плагин всё равно считает по коробке
 * дорожки. Нажатие на ручке начинает жест с неё (значение не прыгает), мимо
 * ручек — ставит туда ближайшую.
 *
 * Своих действий у нажатия нет (`preventDefault`): ни выделения текста, ни
 * своего фокуса браузера. Фокус получает поле той ручки, которую ведёт жест, —
 * так клавиши продолжают с того места, где отпустили указатель.
 *
 * `click`, которым кончается жест, тоже гасится. Внутри подписи `Label` он
 * запустил бы её действие — фокус на первое поле подписи, даже если тянули
 * вторую ручку. С захватом указателя этот `click` приходит в корень, где бы
 * его ни отпустили.
 */
export class TSlidePointerPlugin extends TBasePlugin<ISlidable, TSlidePointerPluginEvents> {
	private _owner: ISlidable | null = null
	private _root: Element | null = null
	private _gesture: TSlidePointerGesture | null = null
	/** Жест кончился отпусканием: следующий `click` корня — его, а не пользователя */
	private _swallowClick = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISlidable>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())
	}

	override destroy(): void {
		this._detach()
		this._owner = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root

		const target: IDomEventTarget = root

		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerUp)
		target.addEventListener('pointercancel', this._onPointerUp)
		target.addEventListener('lostpointercapture', this._onPointerUp)
		target.addEventListener('click', this._onClick)
	}

	private _detach(): void {
		this._end()

		const target: IDomEventTarget | null = this._root

		target?.removeEventListener('pointerdown', this._onPointerDown)
		target?.removeEventListener('pointermove', this._onPointerMove)
		target?.removeEventListener('pointerup', this._onPointerUp)
		target?.removeEventListener('pointercancel', this._onPointerUp)
		target?.removeEventListener('lostpointercapture', this._onPointerUp)
		target?.removeEventListener('click', this._onClick)

		this._root = null
		this._swallowClick = false
	}

	private readonly _onPointerDown = (event: PointerEvent): void => {
		const owner = this._owner
		const root = this._root

		// Основная кнопка; жест уже идёт — второй указатель его не перехватывает
		if (!owner || !root || this._gesture || event.button !== 0) return

		const track = trackOf(owner, root)

		if (!track) return

		const direction = slideDirection(owner, root)
		const fraction = fractionAt(direction, track.getBoundingClientRect(), event)
		const thumb = thumbsOf(owner, track).findIndex(
			(node) => event.target instanceof Node && node.contains(event.target),
		)
		const started = thumb >= 0 ? owner.grab(thumb, fraction) : owner.press(fraction)

		if (!started) return

		event.preventDefault()

		this._gesture = { pointer: event.pointerId, track, direction }
		this._swallowClick = false

		// Протяжка за пределами ползунка и отпускание где угодно приходят
		// корню. Среда без захвата указателя (jsdom) ведёт жест без него:
		// события там приходят туда, куда их отправили
		if ('setPointerCapture' in root) root.setPointerCapture(event.pointerId)

		this._focusActive()
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		this._owner?.drag(
			fractionAt(gesture.direction, gesture.track.getBoundingClientRect(), event),
		)

		// У ручек на одном значении ведомую выбирает первое движение
		this._focusActive()
	}

	private readonly _onPointerUp = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		// За отпусканием браузер пришлёт `click`; отнятый указатель — нет
		this._swallowClick = event.type === 'pointerup'

		this._end()
	}

	private readonly _onClick = (event: MouseEvent): void => {
		if (!this._swallowClick) return

		this._swallowClick = false
		event.preventDefault()
	}

	/** Закончить жест: отпустили, браузер отнял указатель или корень ушёл. */
	private _end(): void {
		if (!this._gesture) return

		this._gesture = null
		this._owner?.release()
	}

	/**
	 * Фокус — полю ведомой ручки. Без прокрутки: страница не должна прыгать к
	 * ручке, которую пользователь и так держит.
	 */
	private _focusActive(): void {
		const owner = this._owner
		const gesture = this._gesture
		const index = owner?.activeThumb

		if (!owner || !gesture || index === undefined) return

		const field = fieldOf(thumbsOf(owner, gesture.track)[index])

		if (field && field.ownerDocument.activeElement !== field)
			field.focus({ preventScroll: true })
	}
}
