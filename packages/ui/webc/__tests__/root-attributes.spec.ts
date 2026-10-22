/**
 * Корень — элемент потребителя, и то, что пишет на него ядро, раскладывает
 * база (`SoldyElement`, `root-attributes.ts`) — одним правилом у всех
 * компонентов.
 *
 * Атрибуты, классы и стиль потребителя стоят на элементе рядом с наборами,
 * классами и стилем ядра. Порядка, в котором можно положить одно поверх
 * другого, у базы нет, поэтому чьё значение, она узнаёт по памяти: своё пишет
 * и снимает, чужое не трогает. Так атрибут потребителя перекрывает набор ядра,
 * `style.width` потребителя — размер от плагина раскладки, а свойство, которое
 * плагин записал в узел сам, мимо разметки, переживает смену раскладки,
 * видимости и стиля потребителя.
 *
 * Стиль корня — слоями снизу вверх: выход плагина раскладки (`layout_styles`),
 * поверх него стиль-выход компонента (`fractionStyle` у ProgressSpinner).
 * Плагина раскладки у кольца нет, поэтому порядок слоёв проверяется на самой
 * раскладке стиля (`stylesOf`, `applyStyles`), как в React, Solid и Angular.
 *
 * У корня с полем (Input, CheckBox, Switch, радио), у элемента коллекции
 * (таб, секция, элемент списка, тег, опция Select, пункт меню любого вида) и у
 * ListBox и Tabs статические атрибуты разметки база переносит на `<input>`,
 * строку или узел списка с ролью, и там они так же главнее набора ядра,
 * который на поле кладёт шаблон. У Select поле — деталь Input: атрибуты
 * разметки уходят ей, а с неё — на `<input>`.
 * Набор владельца на элементе шаблона и наборы самого элемента сходятся в
 * одном раскладчике элемента (`TElementAttributes`): набор владельца главнее
 * при любом порядке записи.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import {
	TAccordionElement,
	TAccordionItemElement,
	TButtonElement,
	TCheckBoxElement,
	TComponentViewElement,
	TDialogElement,
	TDrawerElement,
	TFieldElement,
	TIconElement,
	TInputElement,
	TLabelElement,
	TListBoxElement,
	TListBoxItemElement,
	TMenuCheckboxItemElement,
	TMenuElement,
	TMenuGroupElement,
	TMenuItemElement,
	TMenuPopoverItemElement,
	TMenuRadioGroupElement,
	TMenuRadioItemElement,
	TMenuSeparatorElement,
	TMenuSubmenuElement,
	TNumberInputElement,
	TPaginationElement,
	TPopoverElement,
	TProgressLinearElement,
	TProgressSpinnerElement,
	TRadioGroupElement,
	TRadioGroupItemElement,
	TRatingElement,
	TScrollerElement,
	TSelectElement,
	TSelectGroupElement,
	TSelectItemElement,
	TSkeletonElement,
	TSliderElement,
	TSwitchElement,
	TTabsContentElement,
	TTabsElement,
	TTabsItemElement,
	TTagsElement,
	TTagsItemElement,
	TTextareaElement,
	TTooltipElement,
	registerButtonTag,
	type TAccordionElementProps,
	type TAccordionItemElementProps,
	type TButtonElementProps,
	type TCheckBoxElementProps,
	type TComponentViewElementProps,
	type TDialogElementProps,
	type TDrawerElementProps,
	type TFieldElementProps,
	type TIconElementProps,
	type TInputElementProps,
	type TLabelElementProps,
	type TListBoxElementProps,
	type TListBoxItemElementProps,
	type TMenuCheckboxItemElementProps,
	type TMenuElementProps,
	type TMenuGroupElementProps,
	type TMenuItemElementProps,
	type TMenuPopoverItemElementProps,
	type TMenuRadioGroupElementProps,
	type TMenuRadioItemElementProps,
	type TMenuSeparatorElementProps,
	type TMenuSubmenuElementProps,
	type TNumberInputElementProps,
	type TPaginationElementProps,
	type TPopoverElementProps,
	type TProgressLinearElementProps,
	type TProgressSpinnerElementProps,
	type TRadioGroupElementProps,
	type TRadioGroupItemElementProps,
	type TRatingElementProps,
	type TScrollerElementProps,
	type TSelectElementProps,
	type TSelectGroupElementProps,
	type TSelectItemElementProps,
	type TSkeletonElementProps,
	type TSliderElementProps,
	type TSwitchElementProps,
	type TTabsContentElementProps,
	type TTabsElementProps,
	type TTabsItemElementProps,
	type TTagsElementProps,
	type TTagsItemElementProps,
	type TTextareaElementProps,
	type TTooltipElementProps,
} from '@soldy-ui/webc'
import { TElementAttributes, applyStyles, stylesOf } from '../src/adapter/runtime/root-attributes'
import { ownerStyles } from '../src/adapter/template'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Проверка вида узла: элемент soldy своего компонента. */
type TElementGuard<T extends HTMLElement> = (node: Element | null) => node is T

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Button на `div` — строка элемента списка: тот же класс, что регистрирует фабрика кнопки. */
const TButtonDivElement = registerButtonTag('div')

function isButtonDiv(node: Element | null): node is TButtonElementProps<HTMLDivElement> {
	return node instanceof TButtonDivElement
}

function isView(node: Element | null): node is TComponentViewElementProps {
	return node instanceof TComponentViewElement
}

function isIcon(node: Element | null): node is TIconElementProps {
	return node instanceof TIconElement
}

function isSpinner(node: Element | null): node is TProgressSpinnerElementProps {
	return node instanceof TProgressSpinnerElement
}

function isSkeleton(node: Element | null): node is TSkeletonElementProps {
	return node instanceof TSkeletonElement
}

function isLine(node: Element | null): node is TProgressLinearElementProps {
	return node instanceof TProgressLinearElement
}

function isSlider(node: Element | null): node is TSliderElementProps {
	return node instanceof TSliderElement
}

function isRating(node: Element | null): node is TRatingElementProps {
	return node instanceof TRatingElement
}

function isPagination(node: Element | null): node is TPaginationElementProps {
	return node instanceof TPaginationElement
}

function isScroller(node: Element | null): node is TScrollerElementProps {
	return node instanceof TScrollerElement
}

function isPopover(node: Element | null): node is TPopoverElementProps {
	return node instanceof TPopoverElement
}

function isTooltip(node: Element | null): node is TTooltipElementProps {
	return node instanceof TTooltipElement
}

function isDialog(node: Element | null): node is TDialogElementProps {
	return node instanceof TDialogElement
}

function isDrawer(node: Element | null): node is TDrawerElementProps {
	return node instanceof TDrawerElement
}

function isLabel(node: Element | null): node is TLabelElementProps {
	return node instanceof TLabelElement
}

function isField(node: Element | null): node is TFieldElementProps {
	return node instanceof TFieldElement
}

function isCheckBox(node: Element | null): node is TCheckBoxElementProps {
	return node instanceof TCheckBoxElement
}

function isSwitch(node: Element | null): node is TSwitchElementProps {
	return node instanceof TSwitchElement
}

function isInput(node: Element | null): node is TInputElementProps {
	return node instanceof TInputElement
}

function isNumberInput(node: Element | null): node is TNumberInputElementProps {
	return node instanceof TNumberInputElement
}

function isTextarea(node: Element | null): node is TTextareaElementProps {
	return node instanceof TTextareaElement
}

function isTabs(node: Element | null): node is TTabsElementProps {
	return node instanceof TTabsElement
}

function isTabsItem(node: Element | null): node is TTabsItemElementProps {
	return node instanceof TTabsItemElement
}

function isTabsContent(node: Element | null): node is TTabsContentElementProps {
	return node instanceof TTabsContentElement
}

function isAccordion(node: Element | null): node is TAccordionElementProps {
	return node instanceof TAccordionElement
}

function isAccordionItem(node: Element | null): node is TAccordionItemElementProps {
	return node instanceof TAccordionItemElement
}

function isRadioGroup(node: Element | null): node is TRadioGroupElementProps {
	return node instanceof TRadioGroupElement
}

function isRadio(node: Element | null): node is TRadioGroupItemElementProps {
	return node instanceof TRadioGroupItemElement
}

function isListBox(node: Element | null): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

function isListBoxItem(node: Element | null): node is TListBoxItemElementProps {
	return node instanceof TListBoxItemElement
}

function isMenu(node: Element | null): node is TMenuElementProps {
	return node instanceof TMenuElement
}

function isMenuItem(node: Element | null): node is TMenuItemElementProps {
	return node instanceof TMenuItemElement
}

function isMenuCheckboxItem(node: Element | null): node is TMenuCheckboxItemElementProps {
	return node instanceof TMenuCheckboxItemElement
}

function isMenuRadioItem(node: Element | null): node is TMenuRadioItemElementProps {
	return node instanceof TMenuRadioItemElement
}

function isMenuSubmenu(node: Element | null): node is TMenuSubmenuElementProps {
	return node instanceof TMenuSubmenuElement
}

function isMenuPopoverItem(node: Element | null): node is TMenuPopoverItemElementProps {
	return node instanceof TMenuPopoverItemElement
}

function isMenuGroup(node: Element | null): node is TMenuGroupElementProps {
	return node instanceof TMenuGroupElement
}

function isMenuRadioGroup(node: Element | null): node is TMenuRadioGroupElementProps {
	return node instanceof TMenuRadioGroupElement
}

function isMenuSeparator(node: Element | null): node is TMenuSeparatorElementProps {
	return node instanceof TMenuSeparatorElement
}

function isTags(node: Element | null): node is TTagsElementProps {
	return node instanceof TTagsElement
}

function isTagsItem(node: Element | null): node is TTagsItemElementProps {
	return node instanceof TTagsItemElement
}

function isSelect(node: Element | null): node is TSelectElementProps {
	return node instanceof TSelectElement
}

function isSelectItem(node: Element | null): node is TSelectItemElementProps {
	return node instanceof TSelectItemElement
}

function isSelectGroup(node: Element | null): node is TSelectGroupElementProps {
	return node instanceof TSelectGroupElement
}

/**
 * Элемент разметки, подключённый к документу; узел не того вида — тест падает
 * здесь. Элемент берётся до вставки — живым он стал уже в `innerHTML`: слой
 * (окно, выезжающая панель) при подключении уезжает в `body`, мимо контейнера.
 */
function mount<T extends HTMLElement>(html: string, guard: TElementGuard<T>): T {
	const host = document.createElement('div')

	host.innerHTML = html

	const node = host.firstElementChild

	if (!guard(node)) throw new Error(`${html}: элемента soldy нет`)

	document.body.appendChild(host)

	return node
}

/**
 * Компонент, его тег с `is`, вид элемента, класс ядра на корне и поле в корне
 * — селектор узла, на который уходят атрибуты разметки: `<input>` поля,
 * строка таба, заголовок секции, строка элемента списка, узел списка с ролью
 * у Tabs и ListBox; `null` — поля нет.
 */
const COMPONENTS: ReadonlyArray<
	readonly [string, string, string, TElementGuard<HTMLElement>, string, string | null]
> = [
	['Button', 'button', 'so-button', isButton, 'so-button', null],
	['Button на div', 'div', 'so-button-div', isButtonDiv, 'so-button', null],
	['ComponentView', 'div', 'so-component-view', isView, 'so-component-view', null],
	['Icon', 'span', 'so-icon', isIcon, 'so-icon', null],
	['ProgressSpinner', 'span', 'so-progress-spinner', isSpinner, 'so-progress-spinner', null],
	['ProgressLinear', 'span', 'so-progress-linear', isLine, 'so-progress-linear', null],
	['Skeleton', 'div', 'so-skeleton', isSkeleton, 'so-skeleton', null],
	// Полей у ползунка столько, сколько ручек, а поле оценки указатель не ловит:
	// атрибуты разметки у обоих остаются корню, как у Vue
	['Slider', 'span', 'so-slider', isSlider, 'so-slider', null],
	['Rating', 'span', 'so-rating', isRating, 'so-rating', null],
	['Scroller', 'div', 'so-scroller', isScroller, 'so-scroller', null],
	['Pagination', 'nav', 'so-pagination', isPagination, 'so-pagination', null],
	// Корень — обёртка триггера: ARIA у панели и у триггера, на корне —
	// `attrs` и `dataset`, и атрибуты разметки остаются на нём
	['Popover', 'span', 'so-popover', isPopover, 'so-popover', null],
	['Tooltip', 'span', 'so-tooltip', isTooltip, 'so-tooltip', null],
	// Корень — сама панель слоя: уезжает в `body` с атрибутами потребителя, а
	// подложка рядом — спутник, атрибутов разметки у неё нет
	['Dialog', 'div', 'so-dialog', isDialog, 'so-dialog', null],
	['Drawer', 'div', 'so-drawer', isDrawer, 'so-drawer', null],
	['Label', 'label', 'so-label', isLabel, 'so-label', null],
	['Field', 'div', 'so-field', isField, 'so-field', null],
	['CheckBox', 'span', 'so-check-box', isCheckBox, 'so-check-box', 'input'],
	['Switch', 'span', 'so-switch', isSwitch, 'so-switch', 'input'],
	['Input', 'div', 'so-input', isInput, 'so-input', 'input'],
	[
		'NumberInput',
		'div',
		'so-number-input',
		isNumberInput,
		'so-number-input',
		'.so-number-input__input',
	],
	['Textarea', 'div', 'so-textarea', isTextarea, 'so-textarea', 'textarea'],
	['Tabs', 'div', 'so-tabs', isTabs, 'so-tabs', '[role="tablist"]'],
	['Tabs.Item', 'div', 'so-tabs-item', isTabsItem, 'so-tabs-item', '[embedded="tabs.row"]'],
	['Tabs.Content', 'div', 'so-tabs-content', isTabsContent, 'so-tabs__panel', null],
	['Accordion', 'div', 'so-accordion', isAccordion, 'so-accordion', null],
	[
		'Accordion.Item',
		'div',
		'so-accordion-item',
		isAccordionItem,
		'so-accordion-item',
		'.so-accordion-item__header',
	],
	['RadioGroup', 'div', 'so-radio-group', isRadioGroup, 'so-radio-group', null],
	['RadioGroup.Item', 'label', 'so-radio-group-item', isRadio, 'so-radio-group-item', 'input'],
	['ListBox', 'div', 'so-list-box', isListBox, 'so-list-box', '[role="listbox"]'],
	[
		'ListBox.Item',
		'div',
		'so-list-box-item',
		isListBoxItem,
		'so-list-box-item',
		'[embedded="list-box.row"]',
	],
	// Корень меню — обёртка триггера, как у Popover: ARIA у панели и у
	// триггера, атрибуты разметки остаются на корне
	['Menu', 'span', 'so-menu', isMenu, 'so-menu', null],
	// Пункты всех видов — корень и строка, как элемент списка: атрибуты
	// разметки — строке с ролью
	['Menu.Item', 'div', 'so-menu-item', isMenuItem, 'so-menu-item', '[embedded="menu.row"]'],
	[
		'Menu.CheckboxItem',
		'div',
		'so-menu-checkbox-item',
		isMenuCheckboxItem,
		'so-menu-item',
		'[embedded="menu.row"]',
	],
	[
		'Menu.RadioItem',
		'div',
		'so-menu-radio-item',
		isMenuRadioItem,
		'so-menu-item',
		'[embedded="menu.row"]',
	],
	[
		'Menu.Submenu',
		'div',
		'so-menu-submenu',
		isMenuSubmenu,
		'so-menu-item',
		'[embedded="menu.row"]',
	],
	[
		'Menu.PopoverItem',
		'div',
		'so-menu-popover-item',
		isMenuPopoverItem,
		'so-menu-item',
		'[embedded="menu.row"]',
	],
	['Menu.Group', 'div', 'so-menu-group', isMenuGroup, 'so-menu-group', null],
	['Menu.RadioGroup', 'div', 'so-menu-radio-group', isMenuRadioGroup, 'so-menu-group', null],
	['Menu.Separator', 'div', 'so-menu-separator', isMenuSeparator, 'so-menu-separator', null],
	// Набор тегов — ряд с ролью: все наборы на корне, атрибуты разметки — тоже
	['Tags', 'div', 'so-tags', isTags, 'so-tags', null],
	['Tags.Item', 'div', 'so-tags-item', isTagsItem, 'so-tags-item', '[embedded="tags.row"]'],
	// Поле Select — деталь Input: атрибуты разметки уходят ей, а с неё — на
	// `<input>` комбобокса
	['Select', 'div', 'so-select', isSelect, 'so-select', 'input'],
	[
		'Select.Item',
		'div',
		'so-select-item',
		isSelectItem,
		'so-select-item',
		'[embedded="select.row"]',
	],
	['Select.Group', 'div', 'so-select-group', isSelectGroup, 'so-select-group', null],
]

/** Корни без поля: атрибуты разметки стоят на них самих. */
const ROOTS = COMPONENTS.filter(([, , , , , field]) => field === null)

/** Корни с полем: атрибуты разметки, кроме класса, стиля и входов, — на поле. */
const FIELDS = COMPONENTS.filter(([, , , , , field]) => field !== null)

/** Разметка пробы: `direction` ядра против `dir` потребителя и класс потребителя. */
const probe = (tag: string, is: string) =>
	`<${tag} is="${is}" direction="rtl" dir="ltr" class="mine"></${tag}>`

describe('атрибут потребителя перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` на элементе — атрибут потребителя. */
	it.each(ROOTS)('%s: dir потребителя — поверх dir ядра', (_name, tag, is, guard) => {
		expect(mount(probe(tag, is), guard).getAttribute('dir')).toBe('ltr')
	})

	/**
	 * У корня с полем `dir` разметки — атрибут потребителя, и он уходит на поле;
	 * на корне — `dir` ядра. Имя поля потребителя главнее имени из набора,
	 * который на поле кладёт шаблон.
	 */
	it.each(FIELDS)(
		'%s: атрибуты разметки — на поле, поверх его набора; dir ядра — на корне',
		(_name, tag, is, guard, _own, control) => {
			const el = mount(
				`<${tag} is="${is}" direction="rtl" dir="ltr" aria-label="Своё" aria_label="Ядра"></${tag}>`,
				guard,
			)
			const field = el.querySelector(control ?? 'input')

			expect(el.getAttribute('dir')).toBe('rtl')
			expect(el.hasAttribute('aria-label')).toBe(false)
			expect(field?.getAttribute('dir')).toBe('ltr')
			expect(field?.getAttribute('aria-label')).toBe('Своё')
		},
	)

	/**
	 * Строка таба — корень вложенной кнопки: на неё пишут и база кнопки — свои
	 * наборы, — и шаблон таба — `aria` таба. Набор элемента главнее того, что
	 * кнопка пишет себе сама, при любом порядке записи: имя кнопки, заданное
	 * ей самой, уступает имени таба.
	 */
	it('слой таба на строке главнее наборов самой кнопки', async () => {
		const tab = mount('<div is="so-tabs-item" text="A" aria_label="Таб"></div>', isTabsItem)
		const row = tab.querySelector('[embedded="tabs.row"]')

		if (!isButton(row)) throw new Error('строки нет')

		expect(row.getAttribute('aria-label')).toBe('Таб')

		row.aria_label = 'Строка'
		await flush()

		expect(row.getAttribute('aria-label')).toBe('Таб')

		tab.aria_label = undefined
		await flush()

		expect(row.getAttribute('aria-label')).toBe('Строка')
	})

	/** Строка элемента списка — корень кнопки на `div`: то же правило слоёв. */
	it('слой элемента списка на строке главнее наборов самой кнопки на div', async () => {
		const item = mount(
			'<div is="so-list-box-item" text="A" aria_label="Пункт"></div>',
			isListBoxItem,
		)
		const row = item.querySelector('[embedded="list-box.row"]')

		if (!isButtonDiv(row)) throw new Error('строки нет')

		expect(row.getAttribute('aria-label')).toBe('Пункт')

		row.aria_label = 'Строка'
		await flush()

		expect(row.getAttribute('aria-label')).toBe('Пункт')

		item.aria_label = undefined
		await flush()

		expect(row.getAttribute('aria-label')).toBe('Строка')
	})

	it.each(COMPONENTS)(
		'%s: класс потребителя — рядом с классами ядра',
		(_name, tag, is, guard, own) => {
			const el = mount(probe(tag, is), guard)

			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
		},
	)
})

/** Поля с ошибкой и выключенные: ошибку пишет поле формы `Field` над каждым. */
const INVALID_FIELDS = [
	['CheckBox', '<span is="so-check-box" disabled></span>', '.so-check-box'],
	['Switch', '<span is="so-switch" disabled></span>', '.so-switch'],
	['Input', '<div is="so-input" disabled></div>', '.so-input'],
	['NumberInput', '<div is="so-number-input" disabled></div>', '.so-number-input'],
	['Textarea', '<div is="so-textarea" disabled></div>', '.so-textarea'],
	// Ошибку и `disabled` Select отдаёт и своему полю: `aria-invalid` — на его `<input>`
	['Select', '<div is="so-select" disabled></div>', '.so-select'],
] as const

/**
 * Тема красит коробку поля и подпись поля формы `Field` по корню поля —
 * прямому ребёнку обёртки контрола, — поэтому `dataset` (`data-disabled`,
 * `data-invalid`) база кладёт на корень, а ошибку скринридеру объявляет поле:
 * `<input>`, у Textarea — `<textarea>`.
 */
describe('поле: dataset — на корне, aria — у поля', () => {
	it.each(INVALID_FIELDS)(
		'%s: data-disabled и data-invalid — на корне, aria-invalid — у поля',
		(_name, control, selector) => {
			const field = mount(`<div is="so-field" invalid>${control}</div>`, isField)
			const root = field.querySelector(selector)
			const input = root?.querySelector('input, textarea')

			if (!(root instanceof HTMLElement) || !input) throw new Error('поля нет')

			expect(root.dataset['disabled']).toBe('true')
			expect(root.dataset['invalid']).toBe('true')
			expect(input.hasAttribute('data-disabled')).toBe(false)
			expect(input.hasAttribute('data-invalid')).toBe(false)
			expect(input.getAttribute('aria-invalid')).toBe('true')
		},
	)
})

/**
 * На элемент пишут двое, когда он корень вложенного компонента: база — свои
 * наборы ядра, разметка владельца — свой набор. Раскладчик один на элемент, и
 * набор владельца главнее при любом порядке записи: две памяти отдали бы
 * общее имя тому, кто записал первым.
 */
describe('раскладчик элемента', () => {
	/** Атрибуты-входы пропов элемента: их называет база вместе со своими наборами. */
	const INPUTS: ReadonlySet<string> = new Set(['disabled'])

	it('набор владельца — поверх наборов элемента, когда владелец пишет первым', () => {
		const node = document.createElement('div')
		const layout = TElementAttributes.of(node)

		layout.set('owner', { role: 'tab', tabindex: '-1' })
		layout.set('aria', { role: 'button', tabindex: '0', 'aria-pressed': 'false' }, INPUTS)

		expect(node.getAttribute('role')).toBe('tab')
		expect(node.getAttribute('tabindex')).toBe('-1')
		expect(node.getAttribute('aria-pressed')).toBe('false')
	})

	it('набор владельца — поверх наборов элемента, когда владелец пишет вторым', () => {
		const node = document.createElement('div')
		const layout = TElementAttributes.of(node)

		layout.set('aria', { role: 'button', tabindex: '0' }, INPUTS)
		layout.set('owner', { role: 'tab', tabindex: '-1' })

		expect(node.getAttribute('role')).toBe('tab')
		expect(node.getAttribute('tabindex')).toBe('-1')
	})

	it('раскладчик у элемента один: владелец снял имя — на элементе снова значение элемента', () => {
		const node = document.createElement('div')

		TElementAttributes.of(node).set('aria', { role: 'button' }, INPUTS)
		TElementAttributes.of(node).set('owner', { role: 'tab' })
		TElementAttributes.of(node).set('owner', { role: null })

		expect(node.getAttribute('role')).toBe('button')

		TElementAttributes.of(node).set('aria', {}, INPUTS)

		expect(node.hasAttribute('role')).toBe(false)
	})

	/** Чужое значение на узле — атрибут потребителя: он главнее обоих слоёв. */
	it('атрибут потребителя главнее и набора владельца', () => {
		const node = document.createElement('div')
		const layout = TElementAttributes.of(node)

		node.setAttribute('aria-label', 'Своё')
		layout.set('aria', { 'aria-label': 'Элемента' }, INPUTS)
		layout.set('owner', { 'aria-label': 'Владельца' })

		expect(node.getAttribute('aria-label')).toBe('Своё')
	})

	/**
	 * Вход пропа элемент ведёт по своему набору, чей бы атрибут ни был. Набор
	 * владельца входов не называет: перекрытое им имя — обычный атрибут.
	 */
	it('вход пропа — только в наборах элемента', () => {
		const node = document.createElement('div')
		const layout = TElementAttributes.of(node)

		node.setAttribute('disabled', '')
		layout.set('attrs', { disabled: 'disabled' }, INPUTS)

		expect(node.getAttribute('disabled')).toBe('disabled')

		layout.set('attrs', { disabled: null }, INPUTS)

		expect(node.hasAttribute('disabled')).toBe(false)

		node.setAttribute('disabled', '')
		layout.set('owner', { disabled: 'owner' })

		expect(node.getAttribute('disabled')).toBe('')
	})
})

describe('корень связан с TElementPlugin', () => {
	/**
	 * До элемента доходит только его `so:element:ready`. Элементы soldy, которые
	 * построил его шаблон, — детали (строка таба, стрелки пагинации) и элементы
	 * из данных (страницы пагинации), — разметка владельца: их события слышно
	 * только на них самих. Это общий сторож: ни одна часть шаблона не всплывает
	 * ни у одного компонента таблицы.
	 */
	it.each(COMPONENTS)('%s: so:element:ready приходит с корнем', async (_name, tag, is, guard) => {
		const el = document.createElement(tag, { is })
		const ready: unknown[] = []

		expect(guard(el)).toBe(true)

		el.addEventListener('so:element:ready', (event) => {
			if (event instanceof CustomEvent) ready.push(event.detail)
		})
		document.body.appendChild(el)
		await nextFrame()

		expect(ready).toEqual([el])
	})
})

describe('стиль потребителя главнее стиля ядра', () => {
	it('style.width потребителя перекрывает размер от плагина раскладки и его смену', async () => {
		const el = mount(
			'<div is="so-skeleton" width="24" height="12" style="width: 40px"></div>',
			isSkeleton,
		)

		expect(el.style.width).toBe('40px')
		// Чужого свойства база не трогает, своё — ставит
		expect(el.style.height).toBe('12px')

		el.width = 32
		await flush()

		expect(el.style.width).toBe('40px')
	})

	/**
	 * Сняв своё значение, потребитель возвращает место базе — со следующей её
	 * раскладкой: узел база не перечитывает.
	 */
	it('снятый style.width потребителя — место базе со следующей раскладкой', async () => {
		const el = mount('<div is="so-skeleton" width="24" style="width: 40px"></div>', isSkeleton)

		el.style.removeProperty('width')

		expect(el.style.width).toBe('')

		el.width = 48
		await flush()

		expect(el.style.width).toBe('48px')
	})
})

/**
 * Слой `aria` корня бывает из другого выхода (`TRootSpec.aria`): у Slider — из
 * набора корня `rootAria`, а `aria` ползунка уходит полям ручек. Правило слоя
 * то же: атрибут потребителя на корне главнее набора, своё база снимает.
 */
describe('слой aria корня из другого выхода', () => {
	it('Slider: на корне — rootAria, атрибут потребителя главнее его имени', async () => {
		const el = mount(
			'<span is="so-slider" value="[20,80]" aria_label="Ядра" aria-label="Своё"></span>',
			isSlider,
		)

		expect(el.getAttribute('role')).toBe('group')
		expect(el.getAttribute('aria-label')).toBe('Своё')

		// Одна ручка — набор корня пуст: роль база снимает, чужое имя — нет
		el.value = 50
		await flush()

		expect(el.hasAttribute('role')).toBe(false)
		expect(el.getAttribute('aria-label')).toBe('Своё')
	})

	it('Slider: aria ползунка на корень не ложится — у одной ручки он у поля', () => {
		const el = mount('<span is="so-slider" value="30" aria_label="Громкость"></span>', isSlider)

		expect(el.hasAttribute('aria-label')).toBe(false)
		expect(el.querySelector('input')?.getAttribute('aria-label')).toBe('Громкость')
	})
})

describe('стиль-выход компонента', () => {
	it('ProgressLinear: стиль потребителя — поверх доли, смена доли его не трогает', async () => {
		const el = mount(
			'<span is="so-progress-linear" value="40" style="--so-progress-linear-percent: 90%"></span>',
			isLine,
		)

		expect(el.style.getPropertyValue('--so-progress-linear-percent')).toBe('90%')

		el.value = 60
		await flush()

		expect(el.style.getPropertyValue('--so-progress-linear-percent')).toBe('90%')
	})

	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const el = mount(
			'<span is="so-progress-spinner" value="40" style="--so-progress-spinner-fraction: 0.9"></span>',
			isSpinner,
		)

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: --* доходит до узла под своим именем, смена доли — тоже', async () => {
		const el = mount('<span is="so-progress-spinner" value="40"></span>', isSpinner)

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')

		el.value = 60
		await flush()

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.6')
	})

	it('ProgressSpinner: скрытие — поверх стиля потребителя, трогает только display', async () => {
		const el = mount(
			'<span is="so-progress-spinner" value="40" style="display: inline-block"></span>',
			isSpinner,
		)

		el.visible = false
		await flush()

		expect(el.style.display).toBe('none')
		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')

		el.visible = true
		await flush()

		expect(el.style.display).toBe('inline-block')
	})
})

describe('раскладка стиля', () => {
	it('стиль-выход — поверх стиля плагина, пустое значение свойства не задаёт', () => {
		const styles = stylesOf(
			{ '--ring': 'plugin', width: '10px', height: '' },
			{ '--ring': 'own', 'z-index': 3, width: '' },
		)

		expect([...styles]).toEqual([
			['--ring', 'own'],
			['width', '10px'],
			['z-index', '3'],
		])
	})

	it('слоя нет или он не объект — стиль пуст', () => {
		expect([...stylesOf(undefined, null, 'width: 1px')]).toEqual([])
	})

	it('--* и имена по-CSS доходят до узла как есть; ушедшее из стиля снимается', () => {
		const node = document.createElement('div')
		const applied = applyStyles(
			node,
			stylesOf({ '--so-dialog-width': '320px', 'z-index': 3 }),
			new Map(),
		)

		expect(node.style.getPropertyValue('--so-dialog-width')).toBe('320px')
		expect(node.style.zIndex).toBe('3')

		applyStyles(node, stylesOf({ 'z-index': 3 }), applied)

		expect(node.style.getPropertyValue('--so-dialog-width')).toBe('')
		expect(node.style.zIndex).toBe('3')
	})

	it('свойство с чужим значением база не трогает и своим больше не считает', () => {
		const node = document.createElement('div')

		let applied = applyStyles(node, stylesOf({ width: '10px' }), new Map())

		// Поверх базы пишет плагин или потребитель
		node.style.setProperty('width', '50px')

		applied = applyStyles(node, stylesOf({ width: '20px' }), applied)

		expect(node.style.width).toBe('50px')

		applyStyles(node, stylesOf({}), applied)

		expect(node.style.width).toBe('50px')
	})
})

/**
 * Стиль значением на узле шаблона — позиции ручек и меток Slider, доля
 * заливки звезды Rating, распорки окна — кладёт шаблон (`ownerStyles`) тем же
 * правилом, что база на корне: своё пишет и снимает, чужое не трогает.
 */
describe('стиль на узле шаблона', () => {
	it('своё пишется и снимается, ушедшее из записи — тоже; памяти — у узла', () => {
		const node = document.createElement('span')

		ownerStyles(node, { '--so-slider-position': '20%', 'z-index': '2' })

		expect(node.style.getPropertyValue('--so-slider-position')).toBe('20%')
		expect(node.style.zIndex).toBe('2')

		ownerStyles(node, { '--so-slider-position': '40%' })

		expect(node.style.getPropertyValue('--so-slider-position')).toBe('40%')
		expect(node.style.zIndex).toBe('')

		ownerStyles(node, undefined)

		expect(node.style.length).toBe(0)
	})

	it('свойство, записанное в узел мимо шаблона, переживает смену записи', () => {
		const node = document.createElement('span')

		ownerStyles(node, { '--so-slider-position': '20%' })
		node.style.setProperty('--so-swipe-offset', '3px')
		node.style.setProperty('--so-slider-position', '99%')

		ownerStyles(node, { '--so-slider-position': '40%' })

		expect(node.style.getPropertyValue('--so-swipe-offset')).toBe('3px')
		expect(node.style.getPropertyValue('--so-slider-position')).toBe('99%')

		ownerStyles(node, {})

		expect(node.style.getPropertyValue('--so-swipe-offset')).toBe('3px')
		expect(node.style.getPropertyValue('--so-slider-position')).toBe('99%')
	})

	it('Slider: свойство, записанное в ручку мимо шаблона, переживает шаг значения', async () => {
		const el = mount('<span is="so-slider" value="20"></span>', isSlider)
		const thumb = el.querySelector('.so-slider__thumb')

		if (!(thumb instanceof HTMLElement)) throw new Error('ручки нет')

		thumb.style.setProperty('--so-probe', '1')
		el.value = 60
		await flush()

		expect(thumb.style.getPropertyValue('--so-slider-position')).toBe('60%')
		expect(thumb.style.getPropertyValue('--so-probe')).toBe('1')
	})
})

/**
 * Плагины пишут в узел и сами — мимо разметки: сдвиг смахиваемой панели,
 * предел высоты списка. Такое свойство база своим не считает и не снимает.
 */
describe('свойство, записанное в узел мимо разметки', () => {
	it('переживает смену layout_styles, видимости и стиля потребителя', async () => {
		const ctrl = new TButton()
		const button = document.createElement('button', { is: 'so-button' })

		if (!isButton(button)) throw new Error('<button is="so-button"> нет')

		button.ctrl = ctrl
		button.style.color = 'red'
		document.body.appendChild(button)

		const skeleton = mount('<div is="so-skeleton" width="10"></div>', isSkeleton)

		button.style.setProperty('--so-swipe-offset', '12px')
		skeleton.style.setProperty('--so-swipe-offset', '7px')

		ctrl.hide()
		await flush()
		ctrl.show()
		button.style.color = 'blue'
		skeleton.width = 20
		await flush()

		expect(button.style.getPropertyValue('--so-swipe-offset')).toBe('12px')
		expect(button.style.color).toBe('blue')
		expect(button.style.display).toBe('')
		expect(skeleton.style.getPropertyValue('--so-swipe-offset')).toBe('7px')
		expect(skeleton.style.width).toBe('20px')
	})

	/** Память базы — у элемента, а не у связки: связка новая на каждое подключение. */
	it('переживает перестановку элемента', async () => {
		const el = mount('<div is="so-skeleton" width="10"></div>', isSkeleton)

		el.style.setProperty('--so-swipe-offset', '7px')
		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		el.width = 30
		await flush()

		expect(el.style.getPropertyValue('--so-swipe-offset')).toBe('7px')
		expect(el.style.width).toBe('30px')
	})
})
