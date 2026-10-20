import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import { TCollectionElements } from '../collection'
import { isFocusableElement } from '../../utils'
import type { IDomEventTarget } from '../../utils'
import type { IControl } from '@soldy-ui/core'
import type { IActionPluginOptions, TActionPluginEvents, TFocusTarget } from './types'

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
 *    Связь двусторонняя: фокус на корне или внутри него пишет в инстанс, а
 *    запись в инстанс ставит фокус на узел фокуса компонента. Его называет
 *    правило дескриптора (`focusTarget`): у поля фокус держит вложенный
 *    `<input>`, у ListBox — узел списка, у Tabs — таб-остановка, а корень у
 *    них — коробка вокруг. Без правила, и когда оно узла не нашло, узел
 *    фокуса — корень. Фокус уже внутри корня запись не двигает: компонент и
 *    так в фокусе. Запись `false` снимает фокус с того узла внутри корня, на
 *    котором он стоит. Писатель фокуса один — этот плагин: своего обработчика
 *    `change:focused` у плагинов компонентов нет.
 *
 *    Узла правило не нашло, корень фокус не принял, а компонент — владелец
 *    коллекции (`TCollectionElements` в наборе): остановка в модели уже
 *    новая, а её узел ещё не нарисован — день нового месяца календаря,
 *    страница за окном пагинации, таб, добавленный в том же такте. Тогда
 *    запись ждёт узла: элемент вошёл в коллекцию или объявлен его узел —
 *    правило зовётся снова, и узел, который оно нашло, получает фокус.
 *    Ожидание одно; снимают его запись `false` и `blur()`, любой `focusin` в
 *    документе, снятие корня и `destroy()`. `focus()` идёт тем же путём, что
 *    запись `true`. `focused` назад не пишется ни после записи, после которой
 *    фокус не встал, ни после снятого ожидания.
 *
 * 3. Пробрасывает сырой `click`. Нужен той стороне, у которой на руках только
 *    инстанс: в шаблоне DOM-события и так доступны через fallthrough
 *    (`<Button @click="...">`), а через ctrl — только отсюда.
 */
export class TActionPlugin extends TBasePlugin<any, TActionPluginEvents> {
	private _element: Element | null = null
	private _instance: IControl | null = null
	/** Контекст набора: его получает правило узла фокуса. */
	private _ctx: IPluginContext | null = null
	private _keys: readonly string[] = ['Enter', ' ']
	/** Правило узла фокуса из опций дескриптора; нет — фокус держит корень. */
	private _focusTarget: TFocusTarget | null = null
	private _syncingFocus = false
	/** Снять ожидание узла фокуса (`_wait`); `null` — фокус узла не ждёт. */
	private _waiting: (() => void) | null = null
	/** Пробел нажат на корне: клик — когда его отпустят, как у `<button>`. */
	private _spaceDown = false

	override install(ctx: IPluginContext, options?: IActionPluginOptions): void {
		super.install(ctx, options)

		this._ctx = ctx
		this._instance = ctx.getInstance<IControl>()

		if (options?.keys) this._keys = options.keys

		this._focusTarget = options?.focusTarget ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._attach(element))
		elementPlugin?.events.on('removed', () => this._detach())

		this._listenTo(this._instance?.events, 'change:focused', this._onFocusedChange)
	}

	override destroy(): void {
		this._detach()

		this._instance = null
		this._ctx = null

		super.destroy()
	}

	/** Корневой элемент контрола. Появляется только после монтирования. */
	get element(): Element | null {
		return this._element
	}

	/**
	 * Перевести фокус на контрол — на его узел фокуса (`_moveFocus`): у поля
	 * это `<input>`, а не коробка вокруг. Путь тот же, что у записи
	 * `focused = true`, и узла, которого ещё нет, `focus()` ждёт так же.
	 */
	focus(): void {
		const element = this._element

		if (element) this._moveFocus(element)
	}

	/**
	 * Снять фокус с контрола — с того узла внутри корня, на котором он стоит,
	 * как запись `focused = false`: у поля фокус держит вложенный `<input>`, и
	 * `blur()` корня его бы не снял. Фокус, который ещё ждёт узла, снимается
	 * тоже: иначе узел, нарисованный позже, получил бы фокус после `blur()`.
	 */
	blur(): void {
		this._stopWaiting()

		const element = this._element
		const active = element ? this._activeWithin(element) : null

		if (isFocusableElement(active)) active.blur()
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
		// Узел в снятом корне не ждут: новый `ready` корня повторит запись
		this._stopWaiting()

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
	 *
	 * В фокусе ли компонент, считается по корню, как в обратную сторону
	 * (`focusin` и `focusout` корня): фокус внутри корня — на кнопке очистки
	 * поля или в поле шапки ListBox — `focused = true` не двигает. Ставит
	 * фокус запись на узел фокуса (`_moveFocus`), снимает — с узла внутри
	 * корня, на котором он стоит.
	 *
	 * Запись `false` снимает и ожидание узла — до проверки, есть ли что
	 * снимать: пока узла ждут, фокуса в корне нет.
	 */
	private readonly _onFocusedChange = (value: boolean): void => {
		if (!value) this._stopWaiting()

		if (this._syncingFocus) return

		const element = this._element

		if (!element) return

		const active = this._activeWithin(element)

		if (value === (active !== null)) return

		this._syncingFocus = true

		try {
			if (value) {
				this._moveFocus(element)
			} else if (isFocusableElement(active)) {
				active.blur()
			}
		} finally {
			this._syncingFocus = false
		}
	}

	/**
	 * Фокус — на узел фокуса компонента: что нашло правило дескриптора, иначе
	 * корень. Узла правило не нашло, а корень фокус не принял — ждать узла
	 * (`_wait`). Попытка заменяет прежнее ожидание: оно всегда одно.
	 *
	 * Правило зовётся на каждую запись, а не один раз на `ready`: узел фокуса
	 * бывает новым — у Tabs остановка переезжает с активацией.
	 *
	 * Узел плагину приходит как `Element`, поэтому фокусируемость проверяется
	 * гардом: у корня-`svg` фокус есть, а у произвольного `Element` — нет.
	 */
	private _moveFocus(root: Element): void {
		this._stopWaiting()

		const node = this._ruleNode(root)

		if (node) {
			if (isFocusableElement(node)) node.focus()

			return
		}

		if (isFocusableElement(root)) root.focus()

		if (this._activeWithin(root) === null) this._wait(root)
	}

	/** Узел, который нашло правило дескриптора; без правила и когда не нашло — `null`. */
	private _ruleNode(root: Element): Element | null {
		const rule = this._focusTarget
		const ctx = this._ctx

		return rule && ctx ? rule(root, ctx) : null
	}

	/**
	 * Ждать узла фокуса, которого правило не нашло: у владельца коллекции
	 * остановка в модели уже новая, а её узел ещё не нарисован — день нового
	 * месяца, страница за окном, таб, добавленный в том же такте. Узел приносит
	 * элемент коллекции, и ждёт его помощник реестра узлов
	 * (`TCollectionElements.waitFor`), взятого в момент записи, как его берут
	 * правила. Без правила и без коллекции ждать нечего: узел фокуса — корень,
	 * и он уже отказал.
	 *
	 * Пока ждём, слушаем `focusin` документа в фазе перехвата: фокус, пришедший
	 * куда угодно, ожидание снимает (`_onDocumentFocusIn`).
	 */
	private _wait(root: Element): void {
		const elements = this._focusTarget ? this._ctx?.get(TCollectionElements) : undefined

		if (!elements) return

		const doc = root.ownerDocument
		const stop = elements.waitFor(this._focusFound)

		doc.addEventListener('focusin', this._onDocumentFocusIn, true)

		this._waiting = () => {
			stop()
			doc.removeEventListener('focusin', this._onDocumentFocusIn, true)
		}
	}

	/**
	 * Проверка ожидания — на регистрацию элемента коллекции и на `ready` его
	 * узла: правило зовётся снова, и цель — его ответ сейчас, а не узел,
	 * запомненный при записи. Нашло — ожидание снимается до `focus()`: свой
	 * `focusin` слушатель документа иначе счёл бы чужим. Не нашло — ждать
	 * дальше.
	 */
	private readonly _focusFound = (): boolean => {
		const root = this._element
		const node = root ? this._ruleNode(root) : null

		if (!node) return false

		this._stopWaiting()

		if (isFocusableElement(node)) node.focus()

		return true
	}

	/**
	 * Фокус пришёл куда-то, пока узла ждали. В корень — компонент уже в
	 * фокусе; мимо него — пользователь ушёл туда сам, и узел, нарисованный
	 * позже, увёл бы фокус из поля, где уже печатают. Ожидание снимается,
	 * `focused` не трогается.
	 */
	private readonly _onDocumentFocusIn = (): void => {
		this._stopWaiting()
	}

	private _stopWaiting(): void {
		const stop = this._waiting

		this._waiting = null
		stop?.()
	}

	/** Узел под фокусом, если фокус на корне или внутри него; иначе `null`. */
	private _activeWithin(root: Element): Element | null {
		const active = root.ownerDocument.activeElement

		return active && root.contains(active) ? active : null
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
