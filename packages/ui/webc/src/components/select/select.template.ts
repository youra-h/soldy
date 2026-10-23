/**
 * Шаблон Select — поле выбора из списка (Combobox, select-only или
 * `editable`), как у Vue: в корне поле и панель со списком.
 *
 * Корень — сам `<div is="so-select">`, рамка: классы, `attrs` и `dataset`
 * (`data-open` — стрелку тема разворачивает по нему) и скрытие раскладывает на
 * него база (`ElementBase`). ARIA на корне нет: набор комбобокса — у поля, а
 * свой набор Select шаблон кладёт на поле.
 *
 * - Поле — деталь Input `<div is="so-input" embedded="select.field">` с
 *   классом `so-select__field`, поле корня (`control`): статические атрибуты
 *   разметки Select база переносит на неё, а с неё при её построении — на
 *   `<input>`, и там `aria-label`, `id` и `data-*` потребителя называют
 *   комбобокс. Её `ctrl` — экземпляр поля, которым владеет Select
 *   (`ctrl.field`): текст, плейсхолдер и ARIA комбобокса принадлежат ему, и
 *   рядом с ним шаблон их не пишет. Отдаёт его первая отрисовка каждой связки
 *   — в построении инстанса ещё нет, а деталь собирается после Select.
 *   `disabled`, размер, `readonly`, `required`, имя, `id`, `clearable` и
 *   ошибку поле получает от Select через экземпляр. Свой набор `aria` Select —
 *   имя, ссылки поля формы, ошибку — шаблон кладёт на деталь
 *   (`ownerAttributes`), и у детали с полем он уходит на `<input>`, поверх
 *   набора комбобокса; атрибуты потребителя главнее обоих.
 * - Слоты поля. В его `leading` шаблон кладёт метку (`lendMark`): обёртка
 *   `.so-input__leading` стоит и в `single`, как у Vue, где Select отдаёт полю
 *   шаблон `#leading` всегда. Перед меткой — ряд тегов, пока выбор
 *   множественный: слот `tags` (выводит привязка) или деталь Tags
 *   `<div is="so-tags" embedded="select.tags">` с классом `so-select__tags`
 *   над экземпляром и коллекцией тегов, которые держит Select (`tags`,
 *   `tags_engine`), — оба до вставки. Сменился экземпляр — новая деталь,
 *   нет его — деталь снята. За меткой — слот `leading` Select. В `trailing`
 *   поля — обёртка стрелки `span.so-select__arrow` (класс на обёртке: по нему
 *   тема разворачивает стрелку, а `TSelectPointerPlugin` в `editable`
 *   открывает панель только по ней; иконка из слота `arrow-icon`
 *   поворачивается так же) со слотом `arrow-icon` или иконкой роли
 *   `arrowDown`, `<span is="so-icon" embedded="select.arrow">`, за ней — слот
 *   `trailing` Select. Кнопку очистки рисует поле, первой у конца: свою кнопку
 *   из слота `clear` Select отдаёт его слоту `clear`.
 * - Своё поле — слот `field` (данные берёт у элемента: `el.ctrl.field`): оно
 *   встаёт в корень на место встроенного, а деталь Input в корень не встаёт —
 *   её слоты и атрибуты разметки Select не выводятся, как у Vue, где они живут
 *   внутри встроенного поля.
 * - Панель — деталь Frame `<div is="so-frame" embedded="select.frame">` с
 *   классом `so-select__panel`: телепорт, слой, привязка к корню (`fixed`, в
 *   4 px от него) и пометка владельцем — нажатие в неё иначе считалось бы
 *   нажатием мимо. Неизменное шаблон пишет панели при построении, остальное —
 *   только когда сменилось: открытость — `visible` панели, а не `rendered`
 *   (опции входят в коллекцию при подключении, и закрытие не должно её
 *   вычищать), сторона и flip — `panelPlacement` и `panelFlip`, ширина по полю
 *   — `autoFitWidth`. `rendered` панели шаблон не пишет: до увезённой панели
 *   скрытие корня не доходит, и прячет её база Frame по признаку поддерева
 *   Select (`ElementBase`, «Поддерево»), как у Menu. Наборы панели —
 *   `panelDataset` (`data-swiping`) и `dismiss_ownerAttribute` — одним слоем
 *   владельца.
 * - В панели — свет детали (`lend`): полоса жеста `div.so-select__handle` под
 *   `aria-hidden`, пока жест включён (`handleRendered`), — первой, вне списка;
 *   затем список `div.so-select__list` с набором `listAria` (`role="listbox"`,
 *   `id`, `aria-multiselectable`). Остановки Tab у списка нет: фокус остаётся
 *   на поле, а подсвеченную опцию объявляет его `aria-activedescendant`.
 * - Опции — слот `default`: опции разметки `<div is="so-select-item">` и группы
 *   `<div is="so-select-group">` с опциями в них. Без опций разметки — то, что
 *   рисует коллекция, по секциям группировки (`drawnSections`), как у ListBox:
 *   группа с подписью, записи без группы прямо в списке и немой разделитель
 *   `div.so-select__separator` между соседними секциями, пока его просит
 *   Select (`groupSeparators`). Запись — опция с инстансом данных и копиями
 *   образцов `item-*` или, в окне обёртки `<so-virtual>`, распорка
 *   `div.so-select__filler` под `aria-hidden` со стилем записи. Одна петля на
 *   опции и распорки.
 * - `empty` — пока показанных опций нет, на их месте, внутри списка: пустой
 *   `listbox` для скринридера — тупик. Выводит его привязка (`showSlot`).
 * - `item`, `item-leading`, `item-trailing`, `item-indicator-icon` — образцы
 *   слотов опций из данных: scope у слотов Web Components нет, и копию одного
 *   образца получает каждая опция. Данные копия берёт у опции (`el.ctrl`).
 *
 * Опции и `empty` стоят в списке перед концом опций — узлом шаблона, пустым
 * комментарием: петля держит строки перед ним, и показанный снова `empty`
 * встаёт туда же, за опции.
 *
 * Выбора, фильтра, клавиатуры и закрытия в шаблоне нет: клик — плагин клика,
 * клавиши — клавиатуры, ввод — ввода, нажатие мимо — закрытия, жест — жеста;
 * выбор и отбор — коллекция и её расширения. Scope у слотов нет, как у всех
 * слотов Web Components: поле, теги и команду очистки содержимое слота берёт
 * у элемента — `el.ctrl.field`, `el.state.tags` и `el.state.tags_engine`,
 * `el.ctrl.field.clear()`.
 */

import type {
	ISelect,
	ISelectItem,
	ITags,
	TDrawnEntry,
	TDrawnSection,
	TSelectCollectionFacade,
} from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	TKeyedLoop,
	bind,
	createDetail,
	createItem,
	lend,
	lendBefore,
	lendMark,
	lendSamples,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TFrameElement, type TFrameElementProps } from '../frame'
import { TIconElement, type TIconElementProps } from '../icon'
import { TInputElement, type TInputElementProps } from '../input'
import { TTagsElement, type TTagsElementProps } from '../tags'
import { TSelectGroupElement, type TSelectGroupElementProps } from './group'
import { TSelectItemElement, type TSelectItemElementProps } from './item'
import type { TSelectOutputs } from './setup.component'

/**
 * Копии образцов в опции из данных: слот Select → слот опции, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const SELECT_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
	'item-indicator-icon': 'indicator-icon',
}

/** Контекст шаблона Select. */
type TSelectContext = ITemplateContext<ISelect, TSelectCollectionFacade, TSelectOutputs>

/** Запись того, что рисует список: опция на своём месте или распорка. */
type TSelectEntry = TDrawnEntry<ISelectItem>

/** Секция того, что рисует список: записи одной группы. */
type TSelectSection = TDrawnSection<ISelectItem>

/**
 * Строка списка: разделитель перед секцией, группа с её записями или запись
 * без группы. Ключи у видов не пересекаются: у записи — её ключ (число), у
 * группы — ключ секции, у разделителя — свой от ключа секции.
 */
type TSelectRow =
	| { readonly kind: 'separator'; readonly key: string }
	| { readonly kind: 'group'; readonly key: string; readonly section: TSelectSection }
	| TSelectEntry

/** Части Select — одни на всё время жизни элемента. */
type TSelectParts = {
	/** Поле — деталь Input над экземпляром поля Select. */
	readonly field: TInputElementProps
	/** Метка `leading` поля: перед ней встают теги. */
	readonly mark: Comment
	/** Стрелка — без слота `arrow-icon`. */
	readonly arrow: TIconElementProps | null
	readonly panel: TFrameElementProps
	readonly handle: HTMLElement
	readonly list: HTMLElement
	/** Петля строк списка — только у Select без опций разметки. */
	readonly rows: TKeyedLoop<TSelectRow, string | number, HTMLElement> | null
}

/** Ряд тегов поля: деталь Tags и экземпляр тегов, над которым она построена. */
type TFieldTags = {
	readonly node: TTagsElementProps
	readonly ctrl: ITags
}

const parts = new WeakMap<HTMLElement, TSelectParts>()

/** Ряд тегов поля каждого Select — пока выбор множественный и слота `tags` нет. */
const fieldTags = new WeakMap<HTMLElement, TFieldTags>()

/** Петля записей каждой группы из данных — внутри группы. */
const groupLoops = new WeakMap<HTMLElement, TKeyedLoop<TSelectEntry, number, HTMLElement>>()

function isInput(node: Element): node is TInputElementProps {
	return node instanceof TInputElement
}

function isFrame(node: Element): node is TFrameElementProps {
	return node instanceof TFrameElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

function isTags(node: Element): node is TTagsElementProps {
	return node instanceof TTagsElement
}

function isItem(node: Element): node is TSelectItemElementProps {
	return node instanceof TSelectItemElement
}

function isGroup(node: Element): node is TSelectGroupElementProps {
	return node instanceof TSelectGroupElement
}

/**
 * Строки списка по секциям: разделитель — перед всеми, кроме первой, пока
 * Select их просит (`separated`).
 */
function rowsOf(sections: ReadonlyArray<TSelectSection>, separated: boolean): TSelectRow[] {
	return sections.flatMap((section, index): TSelectRow[] => [
		...(separated && index > 0
			? [{ kind: 'separator' as const, key: `separator:${section.key}` }]
			: []),
		...(section.group
			? [{ kind: 'group' as const, key: section.key, section }]
			: section.entries),
	])
}

/** Узел записи: опция из данных — инстанс данных и копии образцов до вставки — или распорка. */
function drawnOf(ctx: TSelectContext, entry: TSelectEntry): HTMLElement {
	const { ownerDocument } = ctx.root

	if (entry.kind === 'filler') {
		const filler = ownerDocument.createElement('div')

		filler.className = 'so-select__filler'
		filler.setAttribute('aria-hidden', 'true')
		// Высота пропущенных и место в составе — из записи
		ownerStyles(filler, entry.style)

		return filler
	}

	const item = createItem(ownerDocument, 'div', 'so-select-item', isItem)

	item.ctrl = entry.item
	lendSamples(ctx, item, SELECT_ITEM_SLOTS)

	return item
}

/** Живой записи — её стиль: опция из данных всё берёт у своего инстанса. */
function updateDrawn(node: HTMLElement, entry: TSelectEntry): void {
	if (entry.kind === 'filler') ownerStyles(node, entry.style)
}

/**
 * Подпись и записи группы — по её секции. Записи — своей петлёй внутри
 * группы: в конце её корня, за подписью. Новая группа ещё не в документе, и
 * записи становятся её светом — база группы раскладывает их в слот по
 * умолчанию, когда группа собирается.
 */
function fillGroup(
	ctx: TSelectContext,
	group: TSelectGroupElementProps,
	section: TSelectSection,
): void {
	group.label = section.group?.label

	let loop = groupLoops.get(group)

	if (!loop) {
		loop = new TKeyedLoop(group, null, (entry: TSelectEntry) => entry.key)
		groupLoops.set(group, loop)
	}

	loop.draw(section.entries, (entry) => drawnOf(ctx, entry), updateDrawn)
}

/** Узел строки: разделитель, группа с записями или запись без группы. */
function rowOf(ctx: TSelectContext, row: TSelectRow): HTMLElement {
	if (row.kind === 'separator') {
		const separator = ctx.root.ownerDocument.createElement('div')

		separator.className = 'so-select__separator'
		separator.setAttribute('aria-hidden', 'true')

		return separator
	}

	if (row.kind === 'group') {
		const group = createItem(ctx.root.ownerDocument, 'div', 'so-select-group', isGroup)

		fillGroup(ctx, group, row.section)

		return group
	}

	return drawnOf(ctx, row)
}

/** Живой строке — её запись: группе — подпись и записи, распорке — стиль. */
function updateRow(ctx: TSelectContext, node: HTMLElement, row: TSelectRow): void {
	if (row.kind === 'separator') return

	if (row.kind === 'group') {
		if (isGroup(node)) fillGroup(ctx, node, row.section)

		return
	}

	updateDrawn(node, row)
}

/**
 * Ряд тегов поля — деталь Tags над экземпляром тегов: перед меткой `leading`
 * поля. Экземпляр сменился — прежняя деталь снята и встаёт новая, как ключ
 * ряда у React: Select заводит новый экземпляр на каждый переход в `multiple`,
 * а связка без движка снаружи — на каждое подключение. Экземпляра нет —
 * деталь снята.
 */
function drawTags(ctx: TSelectContext, own: TSelectParts): void {
	const tags = ctx.state.tags ?? null
	const drawn = fieldTags.get(ctx.root)

	if (drawn?.ctrl === tags) return

	drawn?.node.remove()
	fieldTags.delete(ctx.root)

	if (!tags) return

	const node = createDetail(
		ctx.root.ownerDocument,
		'div',
		{ is: 'so-tags', embedded: 'select.tags' },
		isTags,
	)

	node.className = 'so-select__tags'
	// Экземпляр и коллекция — до вставки: сборка тегов берёт их при подключении
	node.ctrl = tags
	node.engine = ctx.state.tags_engine ?? undefined
	lendBefore(own.mark, node)
	fieldTags.set(ctx.root, { node, ctrl: tags })
}

export const selectTemplate: ITemplate<ISelect, TSelectCollectionFacade, TSelectOutputs> = {
	create: (root, hasSlot) => {
		const { ownerDocument } = root
		const field = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-input', embedded: 'select.field' },
			isInput,
		)
		const box = ownerDocument.createElement('span')
		const panel = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-frame', embedded: 'select.frame' },
			isFrame,
		)
		const handle = ownerDocument.createElement('div')
		const list = ownerDocument.createElement('div')
		const end = ownerDocument.createComment('')

		field.className = 'so-select__field'
		box.className = 'so-select__arrow'
		panel.className = 'so-select__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 4
		handle.className = 'so-select__handle'
		handle.setAttribute('aria-hidden', 'true')
		list.className = 'so-select__list'
		list.appendChild(end)

		// Метка — в `leading` поля: его обёртка стоит и пустой, теги встают перед
		// ней, `leading` Select — за ней
		const mark = lendMark(field, 'leading')

		// Своя стрелка — только без слота `arrow-icon`: заданный слот заменяет её
		// целиком, а обёртка остаётся
		let arrow: TIconElementProps | null = null

		if (!hasSlot('arrow-icon')) {
			arrow = createDetail(
				ownerDocument,
				'span',
				{ is: 'so-icon', embedded: 'select.arrow' },
				isIcon,
			)
			arrow.icon = 'arrowDown'
			box.appendChild(arrow)
		}

		// Сначала стрелка и список в детали, потом детали в корень: они входят в
		// документ одной вставкой и собираются по одному разу. Своё поле — слот
		// `field`: встроенное в корень не встаёт
		lend(field, 'trailing', box)
		lend(panel, DEFAULT_SLOT, list)

		if (!hasSlot('field')) root.appendChild(field)

		root.appendChild(panel)

		// Опции разметки — сами опции Select: петли из данных при них нет
		const rows = hasSlot(DEFAULT_SLOT)
			? null
			: new TKeyedLoop<TSelectRow, string | number, HTMLElement>(list, end, (row) => row.key)

		parts.set(root, { field, mark, arrow, panel, handle, list, rows })

		return {
			// `clear` объявлен раньше `trailing`: в обёртке у конца поля он первый,
			// за ним — стрелка и `trailing`
			slots: {
				field: { mode: 'before', node: panel },
				tags: { mode: 'before', node: mark, slot: 'leading' },
				leading: { mode: 'append', node: field, slot: 'leading' },
				clear: { mode: 'append', node: field, slot: 'clear' },
				'arrow-icon': { mode: 'append', node: box },
				trailing: { mode: 'append', node: field, slot: 'trailing' },
				default: { mode: 'before', node: end },
				empty: { mode: 'before', node: end },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-indicator-icon': { mode: 'sample' },
			},
			control: field,
		}
	},

	bindings: [
		// Экземпляр поля — детали, на каждую полную отрисовку, то есть на каждое
		// подключение: пропсов у привязки нет. Деталь собирается после Select и
		// берёт его при подключении; Select, переставленный с другим `ctrl`,
		// отдаёт новый раньше, чем пересобирается его поле
		bind([], ({ root, ctrl }) => {
			const field = parts.get(root)?.field

			if (field && ctrl && field.ctrl !== ctrl.field) field.ctrl = ctrl.field
		}),

		// Свой набор Select — на деталь поля: у детали с полем он уходит на
		// `<input>`, поверх набора комбобокса
		bind('aria', ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field) ownerAttributes(field, state.aria)
		}),

		bind('size', ({ root, state }) => {
			const arrow = parts.get(root)?.arrow

			if (arrow && arrow.size !== state.size) arrow.size = state.size
		}),

		// Ряд тегов — пока выбор множественный: свой в слоте `tags` или деталь
		bind(['tags', 'tags_engine'], (ctx) => {
			const own = parts.get(ctx.root)

			ctx.showSlot('tags', (ctx.state.tags ?? null) !== null)

			if (own && !ctx.hasSlot('tags')) drawTags(ctx, own)
		}),

		// Пропсы панели — только сменившиеся
		bind(['open', 'panelPlacement', 'panelFlip', 'autoFitWidth'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (!panel) return

			const visible = state.open === true
			const flip = state.panelFlip === true
			const matchWidth = state.autoFitWidth === true

			if (panel.visible !== visible) panel.visible = visible
			if (panel.anchor_placement !== state.panelPlacement) {
				panel.anchor_placement = state.panelPlacement
			}
			if (panel.anchor_flip !== flip) panel.anchor_flip = flip
			if (panel.anchor_matchWidth !== matchWidth) panel.anchor_matchWidth = matchWidth
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelDataset', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) {
				ownerAttributes(panel, { ...state.panelDataset, ...state.dismiss_ownerAttribute })
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

		bind('listAria', ({ root, state }) => {
			const list = parts.get(root)?.list

			if (list) ownerAttributes(list, state.listAria)
		}),

		bind(['drawnSections', 'groupSeparators'], (ctx) => {
			parts.get(ctx.root)?.rows?.draw(
				rowsOf(ctx.state.drawnSections ?? [], ctx.state.groupSeparators === true),
				(row) => rowOf(ctx, row),
				(node, row) => updateRow(ctx, node, row),
			)
		}),

		bind('shown', ({ state, showSlot }) => {
			showSlot('empty', (state.shown ?? []).length === 0)
		}),
	],
}
