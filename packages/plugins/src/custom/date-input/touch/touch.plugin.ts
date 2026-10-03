import type { IDateInput, TDatePart } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import {
	formatPartsOf,
	rowOf,
	rowSelection,
	segmentOf,
	segmentsOf,
	touchedSegments,
} from '../parts'
import type { TDateInputTouchPluginEvents } from './types'

/**
 * Режим по указателю нажатия: палец и перо делают части редактируемыми, мышь —
 * нет. Нажатие без указателя (`pointerType` пуст у нажатия, которое браузер
 * собрал сам) режим не меняет.
 */
const POINTER_MODES: ReadonlyMap<string, boolean> = new Map([
	['touch', true],
	['pen', true],
	['mouse', false],
])

/**
 * Атрибуты редактируемой части: экранная клавиатура цифр, без проверки
 * орфографии и автозамены — подсказки клавиатуры шли бы композицией.
 */
const EDITABLE_ATTRS: Readonly<Record<string, string>> = {
	contenteditable: 'true',
	inputmode: 'numeric',
	spellcheck: 'false',
	autocorrect: 'off',
}

/** Роль части на сенсорных устройствах Apple: счётчик VoiceOver на iOS не фокусирует. */
const APPLE_TOUCH_ROLE = 'textbox'

/**
 * Правки композиции в Safari: по её окончании браузер убирает её текст и
 * вставляет итог. Гасятся без набора — набранное в композиции ядро получает на
 * `compositionend`, одним путём во всех браузерах.
 */
const COMPOSITION_EDITS: ReadonlySet<string> = new Set([
	'deleteCompositionText',
	'insertFromComposition',
])

/**
 * TDateInputTouchPlugin — сенсорный режим поля даты: на касание части
 * редактируемые, и дату вводят с экранной клавиатуры.
 *
 * На компьютере части нередактируемые — так дату целиком выделяет протяжка
 * мышью. Но экранная клавиатура открывается только над редактируемым узлом.
 * Поэтому **режим выбирает нажатие**, а не устройство: палец и перо
 * (`pointerType`) делают части редактируемыми (`contenteditable`,
 * `inputmode="numeric"`), мышь — снова нет. На ноутбуке с сенсорным экраном
 * мышь сохраняет протяжку, а палец получает клавиатуру. Режим меняется на
 * `pointerdown`, раньше фокуса: фокус браузер переводит после конца касания, а
 * нажатие мышью начинает протяжку уже по нередактируемым частям. Атрибуты
 * идут значениями в наборы частей (`segmentSets`), разметку рисует фреймворк;
 * сервер рисует части нередактируемыми.
 *
 * **Текст части пишет ядро.** Правка браузера (`beforeinput`) гасится и
 * становится командой: вставка — знаки по одному, как клавиши (`typeKey`;
 * по выделению — вместо задетых частей), стирание назад — цифра
 * (`eraseDigit`), другое удаление — часть или задетые выделением части. Чего
 * отменить нельзя — композиции (IME, клавиатуры Android) — браузер пишет в
 * часть сам; по `compositionend` набранное уходит ядру, а часть получает текст
 * ядра обратно. Так же — после правки, которую браузер всё же сделал мимо
 * отмены (SwiftKey стирает и после погашенного Backspace).
 *
 * **Сенсорные устройства Apple.** VoiceOver на iOS счётчик (`spinbutton`) не
 * фокусирует — роль частей там `textbox`; а групп не объявляет — имя поля
 * входит в имя каждой части: ссылкой на себя и на подпись поля
 * (`aria-labelledby`), у поля, названного строкой, — строкой («день, Дата
 * рождения»). Устройство плагин узнаёт после `ready`, у документа корня, и
 * сервер рисует счётчики.
 *
 * Клавиши, которые экранная клавиатура шлёт как клавиши (`keydown` с цифрой),
 * исполняет плагин клавиатуры, и правки за ними браузер не делает: клавиша
 * погашена.
 */
export class TDateInputTouchPlugin extends TBasePlugin<IDateInput, TDateInputTouchPluginEvents> {
	private _owner: IDateInput | null = null
	private _root: Element | null = null
	/** Последнее нажатие на поле — пальцем или пером: части редактируемые */
	private _touch = false
	/** Сенсорное устройство Apple: роль частей — `textbox`, имя поля — в имени части */
	private _appleTouch = false
	/** Идёт композиция: её текст в части вернёт `compositionend` */
	private _composing = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IDateInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		// Выключенное поле и поле только для чтения не редактируются и на касание
		this._listenTo(this._owner?.events, 'change:disabled', this._syncEditable)
		this._listenTo(this._owner?.events, 'change:readonly', this._syncEditable)

		// Имя части на устройствах Apple — из имени поля и имени части в локали
		this._listenTo(this._owner?.events, 'change:aria', this._syncAppleTouch)
		this._listenTo(this._owner?.events, 'change:locale', this._syncAppleTouch)
	}

	/**
	 * Записанное в наборы частей уходит вместе с плагином: наборы — у поля, а
	 * поле переживает монтирование.
	 */
	override destroy(): void {
		this._bind(null)
		this._touch = false
		this._appleTouch = false
		this._syncEditable()
		this._syncAppleTouch()
		this._owner = null

		super.destroy()
	}

	/** Части редактируемые: нажатие пальцем или пером, и поле можно править. */
	private get _editable(): boolean {
		const owner = this._owner

		return this._touch && owner !== null && !owner.disabled && !owner.readonly
	}

	/** Корень сменился — слушатели переезжают; устройство — у документа корня. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('pointerdown', this._onPointerDown)
		previous?.removeEventListener('beforeinput', this._onBeforeInput)
		previous?.removeEventListener('input', this._onInput)
		previous?.removeEventListener('compositionstart', this._onCompositionStart)
		previous?.removeEventListener('compositionend', this._onCompositionEnd)

		this._root = root
		this._composing = false

		const target: IDomEventTarget | null = root

		target?.addEventListener('pointerdown', this._onPointerDown)
		target?.addEventListener('beforeinput', this._onBeforeInput)
		target?.addEventListener('input', this._onInput)
		target?.addEventListener('compositionstart', this._onCompositionStart)
		target?.addEventListener('compositionend', this._onCompositionEnd)

		if (!root) return

		// Документ — у корня, а не `globalThis`: поле живёт и в iframe
		this._appleTouch = isAppleTouch(root.ownerDocument.defaultView?.navigator)
		this._syncAppleTouch()
	}

	/** Нажатие на поле выбирает режим: палец и перо — части редактируемые, мышь — нет. */
	private readonly _onPointerDown = (event: PointerEvent): void => {
		const touch = POINTER_MODES.get(event.pointerType)

		if (touch === undefined || touch === this._touch) return

		this._touch = touch
		this._syncEditable()
	}

	/**
	 * Правка браузера в части гасится и становится командой ядра. Правка
	 * приходит только туда, где можно править, — в части, которые плагин сделал
	 * редактируемыми.
	 */
	private readonly _onBeforeInput = (event: InputEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.defaultPrevented || !this._editable) return

		const node = segmentOf(owner, root, event.target)

		// Правка ряда, ставшего редактируемым ради контекстного меню, — плагина
		// указателя
		if (!node) return

		// Композицию не погасить: её текст часть показывает, пока она идёт, а
		// набранное в ней ядро получит на `compositionend`
		if (event.inputType === 'insertCompositionText') return

		event.preventDefault()

		if (COMPOSITION_EDITS.has(event.inputType)) return

		this._edit(owner, root, node.part, event.inputType, event.data)
	}

	/**
	 * Правка части — команда ядра. Вставка — знаки по одному, как клавиши, а
	 * если выделение задело части — вместо них. Удаление назад — цифра (с пустой
	 * части ядро уводит фокус на предыдущую), другое удаление — часть; задетые
	 * выделением части — целиком.
	 */
	private _edit(
		owner: IDateInput,
		root: Element,
		part: TDatePart,
		inputType: string,
		data: string | null,
	): void {
		owner.focusSegment(part)

		const row = rowOf(owner, root)
		const range = row ? rowSelection(row) : null
		const touched = range ? touchedSegments(segmentsOf(owner, root), range) : []

		if (inputType.startsWith('delete')) {
			if (touched.length > 0) owner.clearSegments(touched)
			else if (inputType === 'deleteContentBackward') owner.eraseDigit()
			else owner.clearSegment()
		} else if (data) {
			typeText(owner, touched, data)
		}

		// Выделение исполнено — остаётся каретка: часть под фокусом
		// редактируемая, и снятое выделение увело бы из неё ввод клавиатуры
		if (touched.length > 0) root.ownerDocument.getSelection()?.collapseToEnd()
	}

	/**
	 * Браузер поправил текст части мимо отмены — клавиатура не уважает
	 * погашенный `beforeinput`, — и часть получает текст ядра обратно. Пока
	 * идёт композиция, её текст часть показывает: его вернёт `compositionend`.
	 */
	private readonly _onInput = (event: Event): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || this._composing) return

		const node = segmentOf(owner, root, event.target)

		if (node) restoreText(owner, node.part, node.element)
	}

	private readonly _onCompositionStart = (): void => {
		this._composing = true
	}

	/**
	 * Композиция кончилась: набранное — в ядро знаками, как клавиши, а часть
	 * получает текст ядра обратно. Текст композиции браузер писал в часть мимо
	 * фреймворка, и тот его не перерисует, если текст ядра не сменился: набрали
	 * не цифры.
	 */
	private readonly _onCompositionEnd = (event: CompositionEvent): void => {
		this._composing = false

		const owner = this._owner
		const root = this._root

		if (!owner || !root) return

		const node = segmentOf(owner, root, event.target)

		if (!node) return

		owner.focusSegment(node.part)
		typeText(owner, [], event.data)
		restoreText(owner, node.part, node.element)
	}

	/** Атрибуты редактируемости — в наборы частей: части редактируемы на касание. */
	private readonly _syncEditable = (): void => {
		const owner = this._owner

		if (!owner) return

		const editable = this._editable

		for (const { type } of formatPartsOf(owner)) {
			const { attrs } = owner.segmentSets(type)

			for (const [name, value] of Object.entries(EDITABLE_ATTRS)) {
				attrs.add(name, editable ? value : null)
			}
		}
	}

	/**
	 * Роль и имя частей на сенсорных устройствах Apple: `textbox` и имя поля в
	 * имени части. Подпись поля по `id` — ссылкой: часть называет себя (её
	 * `aria-label` — имя части) и подпись. Имя поля строкой — строкой, после
	 * имени части. Без своего `id` части сослаться на себя нельзя, и имя
	 * остаётся её собственным. На остальных устройствах набор пуст.
	 */
	private readonly _syncAppleTouch = (): void => {
		const owner = this._owner

		if (!owner) return

		const apple = this._appleTouch
		const labelledBy = apple ? owner.aria.get('aria-labelledby') : undefined
		const label = apple && !labelledBy ? owner.aria.get('aria-label') : undefined

		for (const { type, name } of formatPartsOf(owner)) {
			const { aria } = owner.segmentSets(type)
			const id = aria.get('id')

			aria.add('role', apple ? APPLE_TOUCH_ROLE : null)
			aria.add('aria-labelledby', labelledBy && id ? `${id} ${labelledBy}` : null)
			aria.add('aria-label', label ? `${name}, ${label}` : null)
		}
	}
}

/**
 * Знаки текста — в ядро по одному, как клавиши: первый — вместо задетых
 * выделением частей, если они есть. Часть, набранная до конца, переводит фокус
 * ядра, и следующие знаки идут в следующую часть.
 */
function typeText(owner: IDateInput, touched: readonly TDatePart[], text: string): void {
	const [first, ...rest] = [...text]

	if (first === undefined) return

	if (touched.length > 0) owner.replaceSegments(touched, first)
	else owner.typeKey(first)

	for (const key of rest) owner.typeKey(key)
}

/**
 * Вернуть части текст ядра. Текстовый узел, если он один, остаётся тем же —
 * ссылка на него бывает у фреймворка; иначе содержимое заменяется целиком.
 */
function restoreText(owner: IDateInput, part: TDatePart, element: Element): void {
	const text = formatPartsOf(owner).find((segment) => segment.type === part)?.text

	if (text === undefined) return

	const [first, ...rest] = element.childNodes

	if (first?.nodeType === Node.TEXT_NODE && rest.length === 0) {
		if (first.nodeValue !== text) first.nodeValue = text

		return
	}

	element.textContent = text
}

/**
 * Сенсорное устройство Apple — iPhone, iPod или iPad. iPadOS называет себя
 * `MacIntel`, как Mac, и отличает его сенсорный экран: у Mac точек касания нет.
 */
function isAppleTouch(navigator: Navigator | undefined): boolean {
	if (!navigator) return false

	const { platform, maxTouchPoints } = navigator

	return /^(iPhone|iPod|iPad)/.test(platform) || (/^Mac/.test(platform) && maxTouchPoints > 1)
}
