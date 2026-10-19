import type { INumberInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { isAppleTouch } from '../../../utils'
import type { TNumberInputTouchPluginEvents } from './types'

/** Роль поля на сенсорных устройствах Apple: счётчик VoiceOver на iOS не фокусирует. */
const APPLE_TOUCH_ROLE = 'textbox'

/**
 * Клавиатура поля с минусом на сенсорных устройствах Apple: у цифровой и
 * десятичной клавиатуры iOS минуса нет.
 */
const SIGNED_INPUT_MODE = 'text'

/**
 * TNumberInputTouchPlugin — поле числа на сенсорных устройствах Apple.
 *
 * VoiceOver на iOS счётчик (`spinbutton`) не фокусирует — поле там
 * `textbox`, и значение звучит его текстом: роль из набора поля
 * (`inputSets`) снимает `aria-value*` ядра, как у частей поля даты. Минус на
 * цифровой и десятичной клавиатуре iOS не набрать, поэтому у поля, где он
 * разрешён (`signed`), клавиатура — текстовая; смена `min` пересчитывает её.
 *
 * Устройство плагин узнаёт после `ready`, у документа корня: сервер и прочие
 * устройства рисуют счётчик с клавиатурой ядра. Записанное в набор уходит
 * вместе с плагином — набор у поля, а поле переживает монтирование.
 */
export class TNumberInputTouchPlugin extends TBasePlugin<
	INumberInput,
	TNumberInputTouchPluginEvents
> {
	private _owner: INumberInput | null = null
	/** Сенсорное устройство Apple: роль — `textbox`, клавиатура с минусом — текстовая */
	private _appleTouch = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<INumberInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._appleTouch = isAppleTouch(element.ownerDocument.defaultView?.navigator)
			this._sync()
		})

		// Минус разрешает `min`: нет его или он меньше нуля
		this._listenTo(this._owner?.events, 'change:min', this._sync)
	}

	override destroy(): void {
		this._appleTouch = false
		this._sync()
		this._owner = null

		super.destroy()
	}

	private readonly _sync = (): void => {
		const owner = this._owner

		if (!owner) return

		const apple = this._appleTouch

		owner.inputSets.aria.add('role', apple ? APPLE_TOUCH_ROLE : null)
		owner.inputSets.attrs.add('inputmode', apple && owner.signed ? SIGNED_INPUT_MODE : null)
	}
}
