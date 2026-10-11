import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import { isFocusableElement } from '../../utils'
import type { IDomEventTarget } from '../../utils'
import type { IControl } from '@soldy-ui/core'
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
 * 1. Нормализует активацию. `press` — клик, не пришедший на disabled, —
 *    независимо от того, `<button>` под компонентом или `<div>`. Из Enter и
 *    пробела на корне, где браузер клика не делает, клик делает плагин, как
 *    браузер у `<button>`: Enter — на keydown, пробел — на keyup. Поэтому на
 *    клавишу приходит и `click` потребителя, а отмена клика (`preventDefault`)
 *    одинакова для мыши и клавиатуры. Enter/Space нормализуются, только когда
 *    фокус на самом корне: вложенные поле, чекбокс или кнопка знают, что с
 *    ними делать, сами, а их клик всплывёт в корень и даст `press`, как клик
 *    мышью. Отмени корень их keydown — в Input не напечатается пробел,
 *    чекбокс не переключится, кнопка не нажмётся.
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
	private _element: Element | null = null
	private _instance: IControl | null = null
	private _keys: readonly string[] = ['Enter', ' ']
	private _syncingFocus = false
	/** Пробел нажат на корне: клик — когда его отпустят, как у `<button>`. */
	private _spaceDown = false

	override install(ctx: IPluginContext, options?: IActionPluginOptions): void {
		super.install(ctx, options)

		this._instance = ctx.getInstance<IControl>()

		if (options?.keys) this._keys = options.keys

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._attach(element))
		elementPlugin?.events.on('removed', () => this._detach())

		this._listenTo(this._instance?.events, 'change:focused', this._onFocusedChange)
	}

	override destroy(): void {
		this._detach()

		this._instance = null

		super.destroy()
	}

	/** Корневой элемент контрола. Появляется только после монтирования. */
	get element(): Element | null {
		return this._element
	}

	/**
	 * Перевести фокус на контрол.
	 *
	 * Узел плагину приходит как `Element`, поэтому фокусируемость проверяется
	 * гардом: у корня-`svg` фокус есть, а у произвольного `Element` — нет.
	 */
	focus(): void {
		const element = this._element

		if (isFocusableElement(element)) element.focus()
	}

	blur(): void {
		const element = this._element

		if (isFocusableElement(element)) element.blur()
	}

	private _attach(element: Element): void {
		this._detach()

		this._element = element

		const target: IDomEventTarget = element

		target.addEventListener('click', this._onClick)
		target.addEventListener('keydown', this._onKeyDown)
		target.addEventListener('keyup', this._onKeyUp)
		target.addEventListener('focusin', this._onFocusIn)
		target.addEventListener('focusout', this._onFocusOut)

		// Инстанс мог быть создан с focused: true до появления элемента
		if (this._instance?.focused) this._onFocusedChange(true)
	}

	private _detach(): void {
		const target: IDomEventTarget | null = this._element

		if (!target) return

		target.removeEventListener('click', this._onClick)
		target.removeEventListener('keydown', this._onKeyDown)
		target.removeEventListener('keyup', this._onKeyUp)
		target.removeEventListener('focusin', this._onFocusIn)
		target.removeEventListener('focusout', this._onFocusOut)

		this._element = null
		this._spaceDown = false
	}

	private get _disabled(): boolean {
		return this._instance?.disabled === true
	}

	/**
	 * Сам ли браузер сделает click из Enter/Space на корне.
	 * Для `<a href>` — только Enter, но Space на ссылке и не должен активировать,
	 * поэтому весь тег целиком отдаём нативному поведению.
	 *
	 * Смотрит на тег корня, а не цели события: клавиши из вложенных элементов
	 * до этой проверки не доходят — `_onKeyDown` нормализует только нажатия с
	 * фокусом на корне.
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

	/**
	 * Клавиша активации на корне, который браузер в клик не превращает.
	 *
	 * Клик, а не сразу `press`: так у `<button>`, и клавиша проходит тот же
	 * путь, что мышь, — `click` потребителя, его отмена, `press`. Пробел
	 * кликает, когда его отпустят, Enter — сразу.
	 *
	 * Нажатие для `<button>` — действие клавиши по умолчанию: его отменяет
	 * `preventDefault` любого обработчика на пути клавиши, и на предке тоже.
	 * Поэтому решение — в конце рассылки, а не здесь, на корне, где обработчики
	 * предков ещё не прошли: так клавиша, которую взял себе предок (Enter со
	 * строки ListBox выбирает подсвеченный элемент), строку не нажмёт. Конец
	 * рассылки — окно: дальше событие не всплывает. Клавишу, всплытие которой
	 * остановили, корень тоже не нажимает — её взял себе тот, кто остановил.
	 */
	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (!this._ownKey(event)) return

		const view = this._element?.ownerDocument.defaultView

		if (!view) return

		view.addEventListener(
			'keydown',
			(passed) => {
				if (passed !== event || event.defaultPrevented) return

				// Пробел без этого прокручивает страницу; действие браузера ещё впереди
				event.preventDefault()

				if (event.key === ' ') {
					this._spaceDown = true
				} else {
					this._click()
				}
			},
			{ once: true },
		)
	}

	private readonly _onKeyUp = (event: KeyboardEvent): void => {
		if (event.key !== ' ' || !this._spaceDown) return

		this._spaceDown = false

		if (this._ownKey(event)) this._click()
	}

	/** Клавиша активации — на самом корне не-нативного тега, не на disabled. */
	private _ownKey(event: KeyboardEvent): boolean {
		if (!this._keys.includes(event.key)) return false

		// Клавиша всплыла из вложенного элемента: он обработает её сам
		if (event.target !== this._element) return false

		// Иначе на <button> клик придёт дважды: наш и браузера
		if (this._nativeActivation) return false

		return !this._disabled
	}

	/** Клик по корню — тот, что браузер делает из клавиши у `<button>`. */
	private _click(): void {
		this._element?.dispatchEvent(
			new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
		)
	}

	private readonly _onFocusIn = (event: FocusEvent): void => {
		this.events.emit('focus', event)
		this._writeFocused(true)
	}

	private readonly _onFocusOut = (event: FocusEvent): void => {
		// Пробел, отпущенный после ухода фокуса, корень не нажимает
		if (event.target === this._element) this._spaceDown = false

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
				if (isFocusableElement(element)) element.focus()
			} else if (isFocusableElement(active)) {
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
