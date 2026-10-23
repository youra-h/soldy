/**
 * Шаблон DatePicker — поле даты и календарь в панели, как у Vue.
 *
 * Корень — сам `<div is="so-date-picker">`, якорь панели: классы (`--single`,
 * `--range`, `--clearable`), `attrs`, набор корня `rootAria` и `dataset`
 * (`data-open`, `data-disabled`) и скрытие раскладывает на него база
 * (`ElementBase`), `id` корня — привязка, как `:id="id"` у Vue. В корне стоит
 * разметка одного режима — по `mode`, — перед местом режима (пустой
 * комментарий), а за ним — панель.
 *
 * - Одна дата. Поле — деталь DateInput
 *   `<div is="so-date-input" embedded="date-picker.field">` с классом
 *   `so-date-picker__field` над полем одной даты DatePicker (`ctrl.field`).
 *   Поле — группа частей, поэтому имя DatePicker (`aria_label`,
 *   `aria_labelledBy`, `aria_describedBy`) уходит ему пропсами, а набор
 *   `aria` DatePicker — со ссылками поля формы и ошибкой — ложится на него
 *   слоем владельца, поверх его собственного (`ownerAttributes`). Кнопки
 *   очистки и календаря — в его слотах `clear` и `trailing`, в этом порядке:
 *   шаблон кладёт в оба метку (`lendMark`), и кнопки встают перед ней — до
 *   сборки поля в его свет, после — в обёртку у его конца (`lendBefore`).
 * - Диапазон: поле начала (`date-picker.start`), тире под `aria-hidden`, поле
 *   конца (`date-picker.end`) и кнопки — после поля конца, а не в его слоте:
 *   они работают со всем периодом. Имена концов — выходы плагина имён
 *   (`names_start`, `names_end`), пропом `aria_label` полей.
 * - Смена режима переставляет кнопки и вынимает разметку прежнего режима:
 *   поля — экземпляры DatePicker на всю жизнь, и детали над ними остаются за
 *   шаблоном, а вернувшись, собираются над теми же экземплярами.
 * - Кнопка очистки — DatePicker'а, одна на значение: по `clearable`,
 *   `<button is="so-button" embedded="date-picker.clear" type="button">` с
 *   иконкой роли `close`, размером DatePicker, выключена вместе с ним,
 *   `readonly` её не гасит; имя — набор `clearAria`, очищает команда
 *   DatePicker `clear` — у диапазона оба конца — по нативному клику, гася его
 *   всплытие. Своя кнопка — слот `clear` DatePicker'а на том же месте: свет
 *   элемента, команду она берёт у него (`el.ctrl.clear()`).
 * - Кнопка календаря — `date-picker.trigger` с классом
 *   `so-date-picker__trigger`: связка с панелью и имя — набор `triggerAria`,
 *   вид «нажат» — `triggerDataset`, одним слоем владельца; выключена, когда
 *   открыть нельзя (`openable`). Нажатие ловит плагин открытия на корне.
 *   Значок — слот `trigger-icon` в её слоте по умолчанию или иконка роли
 *   `calendar` без своего размера — по кеглю кнопки.
 * - Панель — деталь Frame `<div is="so-frame" embedded="date-picker.frame"
 *   tabindex="-1">` с классом `so-date-picker__panel`: телепорт, слой,
 *   привязка к корню (`fixed`, в 4 px от него) — неизменное шаблон пишет при
 *   построении. Открытость — `visible` панели, а не `rendered`: закрытая
 *   панель прячется, а не размонтируется. `rendered` панели шаблон не пишет:
 *   до увезённой панели скрытие корня не доходит, и прячет её база Frame по
 *   признаку поддерева DatePicker (`ElementBase`, «Поддерево»), как у Select.
 *   Наборы панели — `panelAria` (`role="dialog"`, `aria-modal`, имя, `id`),
 *   `panelDataset` (`data-swiping`) и пометка владельцем
 *   `dismiss_ownerAttribute` — одним слоем владельца.
 * - В панели — свет детали: полоса жеста `div.so-date-picker__handle` под
 *   `aria-hidden`, пока жест включён (`handleRendered`), — первой; обёртка
 *   содержимого `div.so-date-picker__content` — она прокручивается, а не
 *   панель; в ней — календарь, деталь Calendar
 *   `<div is="so-calendar" embedded="date-picker.calendar">` над календарём и
 *   движком DatePicker. Содержимое дня — образец `item` DatePicker'а, отданный
 *   календарю образцом под тем же именем (`lendTemplates`).
 * - Подвал — только при `confirmable`: «Отмена» (`date-picker.cancel`) и «OK»
 *   (`date-picker.confirm`) в слоте `footer` календаря, «Отмена» первой. Текст
 *   — строки локали, выходы плагина имён; «OK» выключена посреди диапазона
 *   (`confirmDisabled`). «Отмена» закрывает панель, «OK» — `confirm()`.
 *   Подвал у календаря Web Components — свет к построению: смена
 *   `confirmable` строит календарь панели заново, над теми же календарём и
 *   движком.
 *
 * Обработчиков открытия и закрытия, кроме кнопок подвала, у шаблона нет:
 * кнопка календаря и Alt+↓ — плагин открытия, нажатие мимо — закрытия, фокус,
 * Tab и Escape — плагин фокуса, жест — жеста. Scope у слотов нет, как у всех
 * слотов Web Components: значение и команды содержимое слота берёт у элемента
 * (`el.ctrl`), день — у элемента дня.
 */

import type { IDatePicker } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	lendBefore,
	lendMark,
	lendTemplates,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { clearButton, removeClearButton } from '../common/clear'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TCalendarElement, type TCalendarElementProps } from '../calendar'
import { TDateInputElement, type TDateInputElementProps } from '../date-input'
import { TFrameElement, type TFrameElementProps } from '../frame'
import { TIconElement } from '../icon'
import type { TDatePickerOutputs } from './setup.component'

/**
 * Образец DatePicker — образцом календаря под тем же именем: календарь
 * копирует его в каждый день (`setup/__tests__/item-slots.spec.ts`: день уже
 * в scope слота календаря). Копия уходит календарю `<template>`
 * (`lendTemplates`): в самом календаре она не оживает.
 */
export const DATE_PICKER_CALENDAR_SLOTS: TItemSlots = {
	item: 'item',
}

/** Контекст шаблона DatePicker. */
type TDatePickerContext = ITemplateContext<IDatePicker, unknown, TDatePickerOutputs>

/** Части DatePicker — одни на всё время жизни элемента. */
type TDatePickerParts = {
	/** Поле одной даты. */
	readonly field: TDateInputElementProps
	/** Метка слота `clear` поля: перед ней встаёт кнопка очистки. */
	readonly clearMark: Comment
	/** Метка слота `trailing` поля: перед ней встаёт кнопка календаря. */
	readonly trailingMark: Comment
	/** Поле начала диапазона. */
	readonly start: TDateInputElementProps
	readonly dash: HTMLElement
	/** Поле конца диапазона. */
	readonly end: TDateInputElementProps
	readonly trigger: TButtonElementProps
	/** Место разметки режима в корне: поля и кнопки встают перед ним. */
	readonly place: Comment
	readonly panel: TFrameElementProps
	readonly handle: HTMLElement
	/** Обёртка содержимого панели — в ней календарь. */
	readonly content: HTMLElement
}

/** Подвал подтверждения: «Отмена» и «OK». */
type TFooter = {
	readonly cancel: TButtonElementProps
	readonly confirm: TButtonElementProps
}

/** Календарь панели — и с подвалом ли он построен. */
type TPanelCalendar = {
	readonly node: TCalendarElementProps
	readonly confirmable: boolean
}

const parts = new WeakMap<HTMLElement, TDatePickerParts>()

/** Кнопки подвала каждого DatePicker — строятся с первым `confirmable`. */
const footers = new WeakMap<HTMLElement, TFooter>()

/** Календарь панели каждого DatePicker. */
const calendars = new WeakMap<HTMLElement, TPanelCalendar>()

/**
 * Узлы — перед `ref` в `parent`, по порядку. Узел, который уже стоит на своём
 * месте, не двигается: перенос элемента soldy — его отключение и подключение.
 */
function placeBefore(parent: Node, nodes: readonly Node[], ref: Node): void {
	let next = ref

	for (let index = nodes.length - 1; index >= 0; index -= 1) {
		const node = nodes[index]

		if (!node) continue

		if (node.parentNode !== parent || node.nextSibling !== next) parent.insertBefore(node, next)

		next = node
	}
}

/**
 * Узлы — перед меткой слота поля, по порядку: до сборки поля — в его свет, после
 * — в его слот (`lendBefore`). Стоят на месте — не двигаются.
 */
function lendAllBefore(mark: Comment, nodes: readonly Node[]): void {
	if (nodes.every((node, index) => node.nextSibling === (nodes[index + 1] ?? mark))) return

	for (const node of nodes) lendBefore(mark, node)
}

/**
 * Кнопка очистки на своём месте: своя — слот `clear`, встроенная — по
 * `clearable`, без него её нет.
 */
function clearNodes(ctx: TDatePickerContext): readonly Node[] {
	if (ctx.hasSlot('clear')) return ctx.slotted('clear')

	if (ctx.state.clearable !== true) {
		removeClearButton(ctx.root)

		return []
	}

	return [clearButton(ctx, 'date-picker')]
}

/**
 * Кнопки подвала — детали разметки DatePicker. «Отмена» закрывает панель, а
 * черновик сбрасывает само закрытие, «OK» принимает выбор (`confirm()`) —
 * команды того инстанса, что живёт сейчас. Куда вернуть фокус, решает плагин
 * фокуса.
 */
function footerOf(ctx: TDatePickerContext): TFooter {
	const known = footers.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const cancel = createDetail(ownerDocument, TButtonElement, {
		embedded: 'date-picker.cancel',
		attributes: { type: 'button' },
	})
	const confirm = createDetail(ownerDocument, TButtonElement, {
		embedded: 'date-picker.confirm',
		attributes: { type: 'button' },
	})

	cancel.className = 'so-date-picker__cancel'
	confirm.className = 'so-date-picker__confirm'

	cancel.addEventListener('click', () => {
		const picker = ctx.ctrl

		if (picker) picker.open = false
	})
	confirm.addEventListener('click', () => {
		ctx.ctrl?.confirm()
	})

	const footer = { cancel, confirm }

	footers.set(ctx.root, footer)

	return footer
}

/** Пропсы кнопок подвала — только сменившиеся: `disabled` кнопки нативный. */
function syncFooter(ctx: TDatePickerContext, { cancel, confirm }: TFooter): void {
	const { state } = ctx
	const disabled = state.confirmDisabled === true

	if (cancel.size !== state.size) cancel.size = state.size
	if (cancel.text !== state.names_cancel) cancel.text = state.names_cancel
	if (confirm.size !== state.size) confirm.size = state.size
	if (confirm.disabled !== disabled) confirm.disabled = disabled
	if (confirm.text !== state.names_confirm) confirm.text = state.names_confirm
}

/**
 * Календарь панели — деталь над календарём и движком DatePicker, до вставки:
 * сборка календаря берёт их при подключении. Образец `item` — образцом
 * календаря, подвал — при `confirmable`, в его слоте `footer`.
 */
function calendarOf(ctx: TDatePickerContext, confirmable: boolean): TCalendarElementProps {
	const calendar = createDetail(ctx.root.ownerDocument, TCalendarElement, {
		embedded: 'date-picker.calendar',
	})

	calendar.className = 'so-date-picker__calendar'

	if (ctx.ctrl) {
		calendar.ctrl = ctx.ctrl.calendar
		calendar.engine = ctx.ctrl.engine
	}

	lendTemplates(ctx, calendar, DATE_PICKER_CALENDAR_SLOTS)

	if (confirmable) {
		const footer = footerOf(ctx)

		syncFooter(ctx, footer)
		lend(calendar, 'footer', footer.cancel)
		lend(calendar, 'footer', footer.confirm)
	}

	return calendar
}

/** Поле DatePicker — деталь DateInput с именем места и классом. */
function fieldOf(owner: Document, embedded: string, className: string): TDateInputElementProps {
	const field = createDetail(owner, TDateInputElement, { embedded })

	field.className = className

	return field
}

export const datePickerTemplate: ITemplate<IDatePicker, unknown, TDatePickerOutputs> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const field = fieldOf(ownerDocument, 'date-picker.field', 'so-date-picker__field')
		const start = fieldOf(ownerDocument, 'date-picker.start', 'so-date-picker__start')
		const end = fieldOf(ownerDocument, 'date-picker.end', 'so-date-picker__end')
		const dash = ownerDocument.createElement('span')
		const trigger = createDetail(ownerDocument, TButtonElement, {
			embedded: 'date-picker.trigger',
			attributes: { type: 'button' },
		})
		const place = ownerDocument.createComment('')
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'date-picker.frame',
			attributes: { tabindex: '-1' },
		})
		const handle = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')

		// Метки — в слоты `clear` и `trailing` поля: обёртка у его конца стоит
		// всегда, кнопки встают перед метками
		const clearMark = lendMark(field, 'clear')
		const trailingMark = lendMark(field, 'trailing')

		dash.className = 'so-date-picker__dash'
		dash.setAttribute('aria-hidden', 'true')
		dash.textContent = '–'
		trigger.className = 'so-date-picker__trigger'
		panel.className = 'so-date-picker__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 4
		handle.className = 'so-date-picker__handle'
		handle.setAttribute('aria-hidden', 'true')
		content.className = 'so-date-picker__content'

		// Своя иконка кнопки календаря — только без слота `trigger-icon`: заданный
		// слот заменяет её целиком
		if (!hasSlot('trigger-icon')) {
			const icon = createDetail(ownerDocument, TIconElement, {
				embedded: 'date-picker.trigger-icon',
			})

			icon.icon = 'calendar'
			lend(trigger, DEFAULT_SLOT, icon)
		}

		// Сначала содержимое в панель, потом панель в корень: она входит в
		// документ одной вставкой и собирается один раз. Разметку режима
		// ставит первая отрисовка — перед местом режима
		lend(panel, DEFAULT_SLOT, content)
		root.append(place, panel)
		parts.set(root, {
			field,
			clearMark,
			trailingMark,
			start,
			dash,
			end,
			trigger,
			place,
			panel,
			handle,
			content,
		})

		return {
			// Своя кнопка очистки встаёт на место режима первой отрисовкой; значок —
			// в слот по умолчанию кнопки календаря; содержимое дня — образец
			slots: {
				clear: { mode: 'before', node: place },
				'trigger-icon': { mode: 'append', node: trigger, slot: DEFAULT_SLOT },
				item: { mode: 'sample' },
			},
		}
	},

	bindings: [
		// Экземпляры полей и календаря — деталям, на каждую полную отрисовку, то
		// есть на каждое подключение: пропсов у привязки нет. Детали собираются
		// после DatePicker и берут их при подключении; DatePicker, переставленный
		// с другим `ctrl`, отдаёт новые раньше, чем пересобираются его детали
		bind([], ({ root, ctrl }) => {
			const own = parts.get(root)

			if (!own || !ctrl) return

			if (own.field.ctrl !== ctrl.field) own.field.ctrl = ctrl.field
			if (own.start.ctrl !== ctrl.start) own.start.ctrl = ctrl.start
			if (own.end.ctrl !== ctrl.end) own.end.ctrl = ctrl.end

			const calendar = calendars.get(root)?.node

			if (calendar && calendar.ctrl !== ctrl.calendar) {
				calendar.ctrl = ctrl.calendar
				calendar.engine = ctrl.engine
			}
		}),

		// `id` корня — `id` DatePicker, как `:id="id"` у Vue: атрибут разметки —
		// его вход, а записанный инстансу из кода доходит до узла здесь
		bind('id', ({ root, state }) => {
			if (state.id === undefined) {
				if (root.hasAttribute('id')) root.removeAttribute('id')
			} else if (root.id !== state.id) {
				root.id = state.id
			}
		}),

		// Разметка режима — перед местом режима; кнопки — на месте режима
		bind(['mode', 'clearable'], (ctx) => {
			const own = parts.get(ctx.root)

			if (!own) return

			const clear = clearNodes(ctx)

			if (ctx.state.mode === 'range') {
				own.field.remove()
				placeBefore(
					ctx.root,
					[own.start, own.dash, own.end, ...clear, own.trigger],
					own.place,
				)

				return
			}

			own.start.remove()
			own.dash.remove()
			own.end.remove()
			lendAllBefore(own.clearMark, clear)
			lendAllBefore(own.trailingMark, [own.trigger])
			placeBefore(ctx.root, [own.field], own.place)
		}),

		bind(['clearable', 'size', 'disabled', 'clearAria'], (ctx) => {
			// Своя кнопка — слот `clear`: заменяет встроенную целиком
			if (!ctx.hasSlot('clear') && ctx.state.clearable === true)
				clearButton(ctx, 'date-picker')
		}),

		// Кнопка календаря: связка и вид «нажат» — одним слоем владельца
		bind(['size', 'openable', 'triggerAria', 'triggerDataset'], ({ root, state }) => {
			const trigger = parts.get(root)?.trigger

			if (!trigger) return

			const disabled = state.openable !== true

			if (trigger.size !== state.size) trigger.size = state.size
			if (trigger.disabled !== disabled) trigger.disabled = disabled

			ownerAttributes(trigger, { ...state.triggerAria, ...state.triggerDataset })
		}),

		// Имя DatePicker и его набор — полю одной даты (см. шапку)
		bind(['aria', 'aria_label', 'aria_labelledBy', 'aria_describedBy'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (!field) return

			ownerAttributes(field, state.aria)

			if (field.aria_label !== state.aria_label) field.aria_label = state.aria_label
			if (field.aria_labelledBy !== state.aria_labelledBy) {
				field.aria_labelledBy = state.aria_labelledBy
			}
			if (field.aria_describedBy !== state.aria_describedBy) {
				field.aria_describedBy = state.aria_describedBy
			}
		}),

		// Имена концов диапазона — полям концов
		bind(['names_start', 'names_end'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			if (own.start.aria_label !== state.names_start) own.start.aria_label = state.names_start
			if (own.end.aria_label !== state.names_end) own.end.aria_label = state.names_end
		}),

		// Пропсы панели — только сменившиеся
		bind('open', ({ root, state }) => {
			const panel = parts.get(root)?.panel
			const visible = state.open === true

			if (panel && panel.visible !== visible) panel.visible = visible
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelAria', 'panelDataset', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) {
				ownerAttributes(panel, {
					...state.panelAria,
					...state.panelDataset,
					...state.dismiss_ownerAttribute,
				})
			}
		}),

		// Полоса жеста — первой в панели, пока жест включён
		bind('handleRendered', ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { panel, handle } = own

			if (state.handleRendered !== true) {
				handle.remove()
			} else if (handle.parentNode !== panel) {
				lend(panel, DEFAULT_SLOT, handle, 'start')
			}
		}),

		// Календарь панели — с подвалом при `confirmable`: подвал у календаря —
		// свет к построению, и смена `confirmable` строит календарь заново
		bind('confirmable', (ctx) => {
			const own = parts.get(ctx.root)

			if (!own || !ctx.ctrl) return

			const confirmable = ctx.state.confirmable === true
			const drawn = calendars.get(ctx.root)

			if (drawn?.confirmable === confirmable) return

			const calendar = calendarOf(ctx, confirmable)

			if (drawn) own.content.replaceChild(calendar, drawn.node)
			else own.content.appendChild(calendar)

			calendars.set(ctx.root, { node: calendar, confirmable })
		}),

		// Кнопки подвала: текст — строки локали, «OK» гаснет посреди диапазона
		bind(['size', 'confirmDisabled', 'names_cancel', 'names_confirm'], (ctx) => {
			const footer = footers.get(ctx.root)

			if (footer) syncFooter(ctx, footer)
		}),
	],
}
