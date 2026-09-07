import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { IControl } from '@soldy/core'
import type { IActionPluginOptions, TActionPluginEvents } from './types'

/** Теги, где браузер сам превращает Enter/Space в click. */
const NATIVE_ACTIVATION = new Set(['button', 'input', 'select', 'textarea'])

/**
 * TActionPlugin — взаимодействие контрола с пользователем.
 *
 * Ядру DOM недоступен, поэтому слушатели живут здесь. Элемент плагин не
 * добывает сам, а берёт у TElementPlugin — тот же приём, что в
 * TListKeyboardPlugin: композиция плагинов, а не наследование.
 *
 * Делает три вещи:
 *
 * 1. Нормализует активацию. `press` приходит и на клик, и на Enter/Space,
 *    и не приходит на disabled — независимо от того, `<button>` под
 *    компонентом или `<div>`.
 *
 * 2. Связывает `focused` с настоящим фокусом. До этого плагина `focused` был
 *    булевым флагом, который никто не выставлял и который ничего не делал.
 *    Связь двусторонняя: DOM-фокус пишет в инстанс, запись в инстанс зовёт
 *    element.focus().
 *
 * 3. Пробрасывает сырой `click`. Нужен той стороне, у которой на руках только
 *    инстанс: в шаблоне DOM-события и так доступны через fallthrough
 *    (`<Button @click="...">`), а через ctrl — только отсюда.
 */
export class TActionPlugin extends TBasePlugin<any, TActionPluginEvents> {
	private _element: HTMLElement | null = null
	private _instance: IControl | null = null
	private _keys: readonly string[] = ['Enter', ' ']
	private _syncingFocus = false

	override install(ctx: IPluginContext, options?: IActionPluginOptions): void {
		super.install(ctx, options)

		this._instance = ctx.getInstance<IControl>()

		if (options?.keys) this._keys = options.keys

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._attach(element))
		elementPlugin?.events.on('removed', () => this._detach())

		this._instance?.events.on('change:focused', this._onFocusedChange)
	}

	override destroy(): void {
		this._detach()

		this._instance?.events.off('change:focused', this._onFocusedChange)
		this._instance = null

		super.destroy()
	}

	/** Корневой элемент контрола. Появляется только после монтирования. */
	get element(): HTMLElement | null {
		return this._element
	}

	/** Перевести фокус на контрол. */
	focus(): void {
		this._element?.focus()
	}

	blur(): void {
		this._element?.blur()
	}

	private _attach(element: HTMLElement): void {
		this._detach()

		this._element = element

		element.addEventListener('click', this._onClick)
		element.addEventListener('keydown', this._onKeyDown)
		element.addEventListener('focusin', this._onFocusIn)
		element.addEventListener('focusout', this._onFocusOut)

		// Инстанс мог быть создан с focused: true до появления элемента
		if (this._instance?.focused) this._onFocusedChange(true)
	}

	private _detach(): void {
		const element = this._element

		if (!element) return

		element.removeEventListener('click', this._onClick)
		element.removeEventListener('keydown', this._onKeyDown)
		element.removeEventListener('focusin', this._onFocusIn)
		element.removeEventListener('focusout', this._onFocusOut)

		this._element = null
	}

	private get _disabled(): boolean {
		return this._instance?.disabled === true
	}

	/**
	 * Сам ли браузер сделает click из Enter/Space.
	 * Для `<a href>` — только Enter, но Space на ссылке и не должен активировать,
	 * поэтому весь тег целиком отдаём нативному поведению.
	 */
	private get _nativeActivation(): boolean {
		const element = this._element

		if (!element) return false

		const tag = element.tagName.toLowerCase()

		return NATIVE_ACTIVATION.has(tag) || (tag === 'a' && element.hasAttribute('href'))
	}

	private readonly _onClick = (event: MouseEvent): void => {
		this.events.emit('click', event)

		// Нативная <button disabled> клик не отдаёт вовсе, а <div aria-disabled> —
		// отдаёт. Фильтр здесь уравнивает оба случая.
		if (this._disabled) return

		this.events.emit('press', event)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (!this._keys.includes(event.key)) return

		// Иначе на <button> press придёт дважды: от keydown и от порождённого click
		if (this._nativeActivation) return

		if (this._disabled) return

		// Space без этого прокручивает страницу
		event.preventDefault()

		this.events.emit('press', event)
	}

	private readonly _onFocusIn = (event: FocusEvent): void => {
		this.events.emit('focus', event)
		this._writeFocused(true)
	}

	private readonly _onFocusOut = (event: FocusEvent): void => {
		this.events.emit('blur', event)
		this._writeFocused(false)
	}

	/**
	 * Инстанс → DOM. Флаг `_syncingFocus` рвёт цикл: focus() вызовет focusin,
	 * тот запишет focused, тот снова придёт сюда.
	 */
	private readonly _onFocusedChange = (value: boolean): void => {
		if (this._syncingFocus) return

		const element = this._element

		if (!element) return

		const active = element.ownerDocument.activeElement
		const hasFocus = active === element || element.contains(active)

		if (value === hasFocus) return

		this._syncingFocus = true

		try {
			if (value) {
				element.focus()
			} else if (active instanceof HTMLElement) {
				active.blur()
			}
		} finally {
			this._syncingFocus = false
		}
	}

	private _writeFocused(value: boolean): void {
		if (!this._instance || this._instance.focused === value) return

		this._syncingFocus = true

		try {
			this._instance.focused = value
		} finally {
			this._syncingFocus = false
		}
	}
}
