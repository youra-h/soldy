/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и React
 * (`focus-target.spec.tsx`), по компонентам адаптера. У поля корень — коробка
 * вокруг `<input>`, у поля даты — вокруг ряда частей, у DatePicker — вокруг
 * полей и кнопок, у календаря — вокруг заголовков, кнопок листания и сеток с
 * одной остановкой, у Select — рамка вокруг поля и тегов, у набора тегов — ряд
 * вокруг строк и крестиков, у ползунка и оценки — дорожка вокруг полей ручек, у ListBox
 * — рамка вокруг узла списка, у Tabs — рамка со списком табов и панелями, у
 * группы радио и аккордеона — контейнер остановок, у пагинации — `nav` без
 * своей остановки, у ленты — ряд из кнопок и вьюпорта, у элемента коллекции —
 * обёртка вокруг строки; узел фокуса называет правило дескриптора
 * (`focusTarget` плагина действия).
 *
 * Своё у Angular — разметка: корень — элемент компонента, своя остановка
 * перед главной частью — шаблон слота (`leading`) или проекция (`header`). И
 * такт: смену состояния шаблон применяет на проверке изменений, и до неё
 * разметка отстаёт от модели. Узел фокуса тест ищет в документе: у пунктов
 * меню он в панели, увезённой в `body`, мимо разметки хоста.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import {
	TAccordion,
	TAccordionItem,
	TCalendar,
	TCheckBox,
	TDateInput,
	TDatePicker,
	TInput,
	TListBox,
	TListBoxItem,
	TMenuCheckboxItem,
	TMenuItem,
	TMenuPopoverItem,
	TMenuRadioItem,
	TMenuSubmenu,
	TNumberInput,
	TPagination,
	TRadioGroup,
	TRadioGroupItem,
	TRating,
	TScroller,
	TSelect,
	TSelectItem,
	TSlider,
	TSwitch,
	TTabs,
	TTabsItem,
	TTags,
	TTagsItem,
	TTextarea,
	createEngineCalendar,
	createEngineTabs,
} from '@soldy-ui/core'
import {
	AttributesDirective,
	SlotDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TCalendarComponent,
	TCheckBoxComponent,
	TDateInputComponent,
	TDatePickerComponent,
	TInputComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TMenuCheckboxItemComponent,
	TMenuComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioGroupComponent,
	TMenuRadioItemComponent,
	TMenuSubmenuComponent,
	TNumberInputComponent,
	TPaginationComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TRatingComponent,
	TScrollerComponent,
	TSelectComponent,
	TSelectItemComponent,
	TSliderComponent,
	TSwitchComponent,
	TTabsComponent,
	TTabsItemComponent,
	TTagsComponent,
	TTagsItemComponent,
	TTextareaComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

/**
 * Хосты полей. Селектор свой у этого хоста, `TextareaHost`, `CheckBoxHost` и
 * `SwitchHost`: их разметка различается только тегом поля, а тег в id
 * компонента Angular не входит — без селектора id совпал бы (предупреждение
 * NG0912).
 */
@Component({
	selector: 'probe-input-focus',
	standalone: true,
	imports: [TInputComponent],
	template: `<div so-input [ctrl]="ctrl"></div>`,
})
class InputHost {
	readonly ctrl = new TInput()
}

@Component({
	standalone: true,
	imports: [TInputComponent, SlotDirective],
	template: `<div so-input [ctrl]="ctrl">
		<ng-template slot="leading"><button class="before"></button></ng-template>
	</div>`,
})
class InputLeadingHost {
	readonly ctrl = new TInput()
}

/**
 * Поле числа: фокус держит ввод, а не коробка корня, не кнопки шага и не
 * скрытое поле формы.
 */
@Component({
	selector: 'probe-number-input-focus',
	standalone: true,
	imports: [TNumberInputComponent],
	template: `<div so-number-input [ctrl]="ctrl"></div>`,
})
class NumberInputHost {
	readonly ctrl = new TNumberInput()
}

@Component({
	selector: 'probe-number-input-leading-focus',
	standalone: true,
	imports: [TNumberInputComponent, SlotDirective],
	template: `<div so-number-input [ctrl]="ctrl">
		<ng-template slot="leading"><button class="before"></button></ng-template>
	</div>`,
})
class NumberInputLeadingHost {
	readonly ctrl = new TNumberInput()
}

@Component({
	selector: 'probe-textarea-focus',
	standalone: true,
	imports: [TTextareaComponent],
	template: `<div so-textarea [ctrl]="ctrl"></div>`,
})
class TextareaHost {
	readonly ctrl = new TTextarea()
}

/**
 * Поле даты: фокус держат части, а корень — коробка вокруг ряда частей,
 * слотов и скрытого поля формы. DatePicker — коробка вокруг полей и кнопок:
 * фокус — на первой части поля, у диапазона — поля начала. Календарь — на
 * остановке сетки, дне с фокусом коллекции, а не на заголовке месяца или
 * кнопках листания перед сеткой.
 */
@Component({
	selector: 'probe-date-input-focus',
	standalone: true,
	imports: [TDateInputComponent],
	template: `<div so-date-input [ctrl]="ctrl"></div>`,
})
class DateInputHost {
	readonly ctrl = new TDateInput()
}

@Component({
	selector: 'probe-date-input-leading-focus',
	standalone: true,
	imports: [TDateInputComponent, SlotDirective],
	template: `<div so-date-input [ctrl]="ctrl">
		<ng-template slot="leading"><button class="before"></button></ng-template>
	</div>`,
})
class DateInputLeadingHost {
	readonly ctrl = new TDateInput()
}

@Component({
	selector: 'probe-date-picker-focus',
	standalone: true,
	imports: [TDatePickerComponent],
	template: `<div so-date-picker [ctrl]="ctrl"></div>`,
})
class DatePickerHost {
	readonly ctrl = new TDatePicker()
}

@Component({
	selector: 'probe-date-picker-range-focus',
	standalone: true,
	imports: [TDatePickerComponent],
	template: `<div so-date-picker [ctrl]="ctrl"></div>`,
})
class DatePickerRangeHost {
	readonly ctrl = new TDatePicker({ mode: 'range' })
}

@Component({
	selector: 'probe-calendar-focus',
	standalone: true,
	imports: [TCalendarComponent],
	template: `<div so-calendar [ctrl]="ctrl"></div>`,
})
class CalendarHost {
	readonly ctrl = new TCalendar()
}

@Component({
	selector: 'probe-check-box-focus',
	standalone: true,
	imports: [TCheckBoxComponent],
	template: `<span so-check-box [ctrl]="ctrl"></span>`,
})
class CheckBoxHost {
	readonly ctrl = new TCheckBox()
}

@Component({
	selector: 'probe-switch-focus',
	standalone: true,
	imports: [TSwitchComponent],
	template: `<span so-switch [ctrl]="ctrl"></span>`,
})
class SwitchHost {
	readonly ctrl = new TSwitch()
}

@Component({
	standalone: true,
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group>
		<label so-radio-group-item value="a"></label>
		<label so-radio-group-item class="target" [ctrl]="ctrl"></label>
	</div>`,
})
class RadioHost {
	readonly ctrl = new TRadioGroupItem({ value: 'b' })
}

@Component({
	standalone: true,
	imports: [TListBoxComponent, TListBoxItemComponent],
	template: `<div so-list-box [ctrl]="ctrl">
		<div so-list-box-item value="a" text="A"></div>
	</div>`,
})
class ListBoxHost {
	readonly ctrl = new TListBox()
}

@Component({
	standalone: true,
	imports: [TListBoxComponent, TListBoxItemComponent],
	template: `<div so-list-box [ctrl]="ctrl">
		<input slot="header" class="before" />
		<div so-list-box-item value="a" text="A"></div>
	</div>`,
})
class ListBoxHeaderHost {
	readonly ctrl = new TListBox()
}

@Component({
	standalone: true,
	imports: [TTabsComponent, TTabsItemComponent],
	template: `<div so-tabs [ctrl]="ctrl">
		<div so-tabs-item value="a" text="A"></div>
		<div so-tabs-item value="b" text="B" active></div>
	</div>`,
})
class TabsHost {
	readonly ctrl = new TTabs()
}

@Component({
	standalone: true,
	imports: [TTabsComponent, TTabsItemComponent, SlotDirective],
	template: `<div so-tabs [ctrl]="ctrl">
		<ng-template slot="leading"><button class="before"></button></ng-template>
		<div so-tabs-item value="a" text="A"></div>
		<div so-tabs-item value="b" text="B" active></div>
	</div>`,
})
class TabsLeadingHost {
	readonly ctrl = new TTabs()
}

@Component({
	standalone: true,
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group [ctrl]="ctrl">
		<label so-radio-group-item value="a"></label>
		<label so-radio-group-item value="b" class="target"></label>
	</div>`,
})
class RadioGroupHost {
	readonly ctrl = new TRadioGroup({ value: 'b' })
}

@Component({
	standalone: true,
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group [ctrl]="ctrl">
		<label so-radio-group-item value="a" disabled></label>
		<label so-radio-group-item value="b" class="target"></label>
	</div>`,
})
class RadioGroupDisabledHost {
	readonly ctrl = new TRadioGroup()
}

@Component({
	standalone: true,
	imports: [TAccordionComponent, TAccordionItemComponent],
	template: `<div so-accordion [ctrl]="ctrl">
		<div so-accordion-item value="a" text="A" class="target"></div>
		<div so-accordion-item value="b" text="B"></div>
	</div>`,
})
class AccordionHost {
	readonly ctrl = new TAccordion()
}

@Component({
	standalone: true,
	imports: [TAccordionComponent, TAccordionItemComponent],
	template: `<div so-accordion [ctrl]="ctrl">
		<div so-accordion-item value="a" text="A" disabled></div>
		<div so-accordion-item value="b" text="B" class="target"></div>
	</div>`,
})
class AccordionDisabledHost {
	readonly ctrl = new TAccordion()
}

@Component({
	standalone: true,
	imports: [TTabsComponent, TTabsItemComponent],
	template: `<div so-tabs>
		<div so-tabs-item value="a" text="A" active></div>
		<div so-tabs-item class="target" [ctrl]="ctrl"></div>
	</div>`,
})
class TabsItemHost {
	readonly ctrl = new TTabsItem({ value: 'b', text: 'B' })
}

@Component({
	standalone: true,
	imports: [TAccordionComponent, TAccordionItemComponent],
	template: `<div so-accordion>
		<div so-accordion-item value="a" text="A"></div>
		<div so-accordion-item class="target" [ctrl]="ctrl"></div>
	</div>`,
})
class AccordionItemHost {
	readonly ctrl = new TAccordionItem({ value: 'b', text: 'B' })
}

@Component({
	standalone: true,
	imports: [TListBoxComponent, TListBoxItemComponent],
	template: `<div so-list-box>
		<div so-list-box-item value="a" text="A"></div>
		<div so-list-box-item class="target" [ctrl]="ctrl"></div>
	</div>`,
})
class ListBoxItemHost {
	readonly ctrl = new TListBoxItem({ value: 'b', text: 'B' })
}

/**
 * Меню, открытое с первой отрисовки, с пунктом `a` перед пунктом теста: фокус
 * встаёт на строку своего пункта, а не на первую строку меню.
 */
const MENU_TRIGGER = `<ng-template slot="trigger" let-triggerAria="triggerAria">
	<button [so-attributes]="triggerAria">M</button>
</ng-template>`

/** Что импортирует хост пункта меню, кроме самого пункта. */
const MENU = [TMenuComponent, TMenuItemComponent, SlotDirective, AttributesDirective]

@Component({
	selector: 'probe-menu-item-focus',
	standalone: true,
	imports: MENU,
	template: `<span so-menu open>
		${MENU_TRIGGER}
		<div so-menu-item value="a" text="A"></div>
		<div so-menu-item class="target" [ctrl]="ctrl"></div>
	</span>`,
})
class MenuItemHost {
	readonly ctrl = new TMenuItem({ value: 'b', text: 'B' })
}

@Component({
	selector: 'probe-menu-checkbox-item-focus',
	standalone: true,
	imports: [...MENU, TMenuCheckboxItemComponent],
	template: `<span so-menu open>
		${MENU_TRIGGER}
		<div so-menu-item value="a" text="A"></div>
		<div so-menu-checkbox-item class="target" [ctrl]="ctrl"></div>
	</span>`,
})
class MenuCheckboxItemHost {
	readonly ctrl = new TMenuCheckboxItem({ value: 'b', text: 'B' })
}

@Component({
	selector: 'probe-menu-radio-item-focus',
	standalone: true,
	imports: [...MENU, TMenuRadioGroupComponent, TMenuRadioItemComponent],
	template: `<span so-menu open>
		${MENU_TRIGGER}
		<div so-menu-item value="a" text="A"></div>
		<div so-menu-radio-group label="Вид">
			<div so-menu-radio-item class="target" [ctrl]="ctrl"></div>
		</div>
	</span>`,
})
class MenuRadioItemHost {
	readonly ctrl = new TMenuRadioItem({ value: 'b', text: 'B' })
}

@Component({
	selector: 'probe-menu-submenu-focus',
	standalone: true,
	imports: [...MENU, TMenuSubmenuComponent],
	template: `<span so-menu open>
		${MENU_TRIGGER}
		<div so-menu-item value="a" text="A"></div>
		<div so-menu-submenu class="target" [ctrl]="ctrl">
			<div so-menu-item value="x" text="X"></div>
		</div>
	</span>`,
})
class MenuSubmenuHost {
	readonly ctrl = new TMenuSubmenu({ value: 'b', text: 'B' })
}

@Component({
	selector: 'probe-menu-popover-item-focus',
	standalone: true,
	imports: [...MENU, TMenuPopoverItemComponent],
	template: `<span so-menu open>
		${MENU_TRIGGER}
		<div so-menu-item value="a" text="A"></div>
		<div so-menu-popover-item class="target" [ctrl]="ctrl"><p>Панель</p></div>
	</span>`,
})
class MenuPopoverItemHost {
	readonly ctrl = new TMenuPopoverItem({ value: 'b', text: 'B' })
}

/** Оценка: фокус держит поле ручки, а корень — ряд звёзд вокруг. */
@Component({
	selector: 'probe-rating-focus',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span so-rating [ctrl]="ctrl"></span>`,
})
class RatingHost {
	readonly ctrl = new TRating()
}

/** Ползунок: фокус держат поля ручек, а корень — дорожка вокруг; — поле первой ручки. */
@Component({
	selector: 'probe-slider-focus',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span so-slider [ctrl]="ctrl"></span>`,
})
class SliderHost {
	readonly ctrl = new TSlider({ value: [20, 80] })
}

/**
 * Пагинация: корень — `nav` без своей остановки, фокус — на кнопке текущей
 * страницы, а не на стрелке «назад», которая на третьей странице включена.
 */
@Component({
	selector: 'probe-pagination-focus',
	standalone: true,
	imports: [TPaginationComponent],
	template: `<nav so-pagination [ctrl]="ctrl" [total]="50" [value]="3"></nav>`,
})
class PaginationHost {
	readonly ctrl = new TPagination()
}

/** Лента со своими остановками: фокус — на первой из них, мимо кнопки «назад». */
@Component({
	selector: 'probe-scroller-focus',
	standalone: true,
	imports: [TScrollerComponent],
	template: `<div so-scroller [ctrl]="ctrl">
		<button class="target">A</button>
		<button>B</button>
	</div>`,
})
class ScrollerHost {
	readonly ctrl = new TScroller()
}

/** Select: фокус держит `<input>` поля, а корень — рамка вокруг поля и тегов. */
@Component({
	selector: 'probe-select-focus',
	standalone: true,
	imports: [TSelectComponent, TSelectItemComponent],
	template: `<div so-select [ctrl]="ctrl">
		<div so-select-item value="a" text="A"></div>
	</div>`,
})
class SelectHost {
	readonly ctrl = new TSelect()
}

/** Select с тегами: крестик тега — нативная остановка перед полем, фокус — на поле. */
@Component({
	selector: 'probe-select-tags-focus',
	standalone: true,
	imports: [TSelectComponent, TSelectItemComponent],
	template: `<div so-select [ctrl]="ctrl" mode="multiple" [value]="value">
		<div so-select-item value="a" text="A"></div>
		<div so-select-item value="b" text="B"></div>
	</div>`,
})
class SelectTagsHost {
	readonly ctrl = new TSelect()
	readonly value = ['a', 'b']
}

/** Набор тегов с выбором: остановка — выбранный тег, а не крестик первого. */
@Component({
	selector: 'probe-tags-single-focus',
	standalone: true,
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags [ctrl]="ctrl" mode="single" closable>
		<div so-tags-item value="a" text="A"></div>
		<div so-tags-item value="b" text="B" selected class="target"></div>
	</div>`,
})
class TagsSelectingHost {
	readonly ctrl = new TTags()
}

/** Набор тегов без выбора: у строк остановки нет — остановка набора — крестик первого. */
@Component({
	selector: 'probe-tags-none-focus',
	standalone: true,
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags [ctrl]="ctrl" closable>
		<div so-tags-item value="a" text="A" class="target"></div>
		<div so-tags-item value="b" text="B"></div>
	</div>`,
})
class TagsPlainHost {
	readonly ctrl = new TTags()
}

/** Тег без выбора: строка — `listitem` без `tabindex`, остановка тега — крестик. */
@Component({
	selector: 'probe-tags-item-focus',
	standalone: true,
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags closable>
		<div so-tags-item value="a" text="A"></div>
		<div so-tags-item class="target" [ctrl]="ctrl"></div>
	</div>`,
})
class TagsItemHost {
	readonly ctrl = new TTagsItem({ value: 'b', text: 'B' })
}

/** Тег с выбором: строка-опция, хотя остановка набора у первого тега. */
@Component({
	selector: 'probe-tags-item-single-focus',
	standalone: true,
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags mode="single" closable>
		<div so-tags-item value="a" text="A"></div>
		<div so-tags-item class="target" [ctrl]="ctrl"></div>
	</div>`,
})
class TagsItemSelectingHost {
	readonly ctrl = new TTagsItem({ value: 'b', text: 'B' })
}

/**
 * Хост с инстансом, которому тест пишет `focused`. Тип инстанса — только
 * свойство: карта событий у каждого контрола своя.
 */
type THost = { readonly ctrl: { focused: boolean } }

type TCase = {
	host: Type<THost>
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: { host: InputHost, target: 'input' },
	'Input с кнопкой в leading': { host: InputLeadingHost, target: 'input', before: '.before' },
	NumberInput: { host: NumberInputHost, target: '.so-number-input__input' },
	'NumberInput с кнопкой в leading': {
		host: NumberInputLeadingHost,
		target: '.so-number-input__input',
		before: '.before',
	},
	Textarea: { host: TextareaHost, target: 'textarea' },
	DateInput: { host: DateInputHost, target: '.so-date-input__segment' },
	'DateInput с кнопкой в leading': {
		host: DateInputLeadingHost,
		target: '.so-date-input__segment',
		before: '.before',
	},
	'DatePicker, одна дата': {
		host: DatePickerHost,
		target: '.so-date-picker__field .so-date-input__segment',
	},
	'DatePicker, диапазон': {
		host: DatePickerRangeHost,
		target: '.so-date-picker__start .so-date-input__segment',
	},
	Calendar: {
		host: CalendarHost,
		target: '.so-calendar-item[tabindex="0"]',
		// Заголовок месяца и кнопки листания — остановки перед сеткой
		before: '.so-calendar__title',
	},
	CheckBox: { host: CheckBoxHost, target: 'input' },
	Switch: { host: SwitchHost, target: 'input' },
	Rating: { host: RatingHost, target: 'input' },
	// Первое поле по документу — поле первой ручки
	Slider: { host: SliderHost, target: '[so-slider] input' },
	Pagination: {
		host: PaginationHost,
		target: '[aria-current="page"]',
		before: '.so-pagination__prev',
	},
	'Scroller со своими остановками': { host: ScrollerHost, target: '.target' },
	Select: { host: SelectHost, target: '.so-select__field input' },
	'Select multiple с тегами': {
		host: SelectTagsHost,
		target: '.so-select__field input',
		before: '.so-tags-item__close',
	},
	'RadioGroup.Item': { host: RadioHost, target: '.target input' },
	ListBox: { host: ListBoxHost, target: '[role="listbox"]' },
	'ListBox с полем в header': {
		host: ListBoxHeaderHost,
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: { host: TabsHost, target: '[role="tab"][aria-selected="true"]' },
	'Tabs с кнопкой в leading': {
		host: TabsLeadingHost,
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	'RadioGroup с отметкой': { host: RadioGroupHost, target: '.target input' },
	'RadioGroup без отметки, первое выключено': {
		host: RadioGroupDisabledHost,
		target: '.target input',
	},
	Accordion: { host: AccordionHost, target: '.target .so-accordion-item__header' },
	'Accordion, первая секция выключена': {
		host: AccordionDisabledHost,
		target: '.target .so-accordion-item__header',
	},
	'Tags с выбором': { host: TagsSelectingHost, target: '.target [role="option"]' },
	'Tags без выбора': { host: TagsPlainHost, target: '.target .so-tags-item__close' },
	'Tags.Item': { host: TagsItemHost, target: '.target .so-tags-item__close' },
	'Tags.Item с выбором': { host: TagsItemSelectingHost, target: '.target [role="option"]' },
	'Tabs.Item': { host: TabsItemHost, target: '.target [role="tab"]' },
	'Accordion.Item': { host: AccordionItemHost, target: '.target .so-accordion-item__header' },
	'ListBox.Item': { host: ListBoxItemHost, target: '.target [role="option"]' },
	'Menu.Item': { host: MenuItemHost, target: '.target [role="menuitem"]' },
	'Menu.CheckboxItem': {
		host: MenuCheckboxItemHost,
		target: '.target [role="menuitemcheckbox"]',
	},
	'Menu.RadioItem': { host: MenuRadioItemHost, target: '.target [role="menuitemradio"]' },
	'Menu.Submenu': { host: MenuSubmenuHost, target: '.target [role="menuitem"]' },
	'Menu.PopoverItem': { host: MenuPopoverItemHost, target: '.target [role="menuitem"]' },
}

describe.each(Object.entries(CASES))('%s', (_name, { host, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const fixture = mountHost(host)
		const { ctrl } = fixture.componentInstance

		await nextFrame()
		fixture.detectChanges()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) findIn(fixture, before, HTMLElement)

		ctrl.focused = true
		fixture.detectChanges()

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false
		fixture.detectChanges()

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

@Component({
	standalone: true,
	imports: [TTabsComponent],
	template: `<div so-tabs [ctrl]="ctrl" [engine]="engine"></div>`,
})
class TabsEngineHost {
	readonly ctrl = new TTabs()
	readonly engine = createEngineTabs({
		items: [
			{ value: 'a', text: 'A', _: { active: true } },
			{ value: 'b', text: 'B' },
		],
	})
}

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: Angular
	 * перерисует `tabindex` на проверке изменений, а остановку правило берёт у
	 * модели, — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const fixture = mountHost(TabsEngineHost)
		const { ctrl, engine } = fixture.componentInstance

		await nextFrame()
		fixture.detectChanges()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(stop().textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: Angular нарисует таб на проверке изменений, а остановка в
	 * модели — уже он, и корень Tabs фокус не держит. Запись ждёт узла: таб
	 * входит в коллекцию при сборке, его узел объявляют кадром позже — и фокус
	 * встаёт на него.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const fixture = mountHost(TabsEngineHost)
		const { ctrl, engine } = fixture.componentInstance

		await nextFrame()
		fixture.detectChanges()

		engine.extensions.activation.activate(
			engine.extensions.plain.push({ value: 'c', text: 'C' }),
		)
		ctrl.focused = true

		// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
		expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		fixture.detectChanges()
		await nextFrame()

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

/**
 * Селектор свой: разметка та же, что у `RadioGroupHost`, разное только
 * значение инстанса, а оно в id компонента Angular не входит — без селектора
 * id совпал бы (предупреждение NG0912).
 */
@Component({
	selector: 'probe-radio-group-model',
	standalone: true,
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group [ctrl]="ctrl">
		<label so-radio-group-item value="a"></label>
		<label so-radio-group-item value="b" class="target"></label>
	</div>`,
})
class RadioGroupModelHost {
	readonly ctrl = new TRadioGroup({ value: 'a' })
}

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: Angular
	 * перепишет `checked` полей на проверке изменений, а отмеченное радио
	 * правило берёт у модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const fixture = mountHost(RadioGroupModelHost)
		const { ctrl } = fixture.componentInstance

		await nextFrame()
		fixture.detectChanges()

		const target = () => findIn(fixture, '.target input', HTMLInputElement)

		ctrl.value = 'b'

		// Такт тот же: отмечено в разметке ещё прежнее
		expect(target().checked).toBe(false)

		ctrl.focused = true

		expect(document.activeElement).toBe(target())
	})
})

@Component({
	selector: 'probe-scroller-viewport-focus',
	standalone: true,
	imports: [TScrollerComponent],
	template: `<div so-scroller [ctrl]="ctrl"><span>A</span></div>`,
})
class ScrollerViewportHost {
	readonly ctrl = new TScroller()
}

@Component({
	selector: 'probe-select-item-focus',
	standalone: true,
	imports: [TSelectComponent, TSelectItemComponent],
	template: `<div so-select [ctrl]="select">
		<div so-select-item value="a" text="A"></div>
		<div so-select-item [ctrl]="item"></div>
	</div>`,
})
class SelectItemHost {
	readonly select = new TSelect()
	readonly item = new TSelectItem({ value: 'b', text: 'B' })
}

/**
 * Календарь над своим движком: инстанс и движок хост отдаёт входами, а тест
 * задаёт их до первой проверки — месяцы сеток у каждого теста свои.
 */
@Component({
	selector: 'probe-calendar-model',
	standalone: true,
	imports: [TCalendarComponent],
	template: `<div so-calendar [ctrl]="ctrl()" [engine]="engine()"></div>`,
})
class CalendarModelHost {
	readonly ctrl = signal(new TCalendar())
	readonly engine = signal(createEngineCalendar())
}

describe('Calendar · остановка по модели', () => {
	const stop = () => find(document, '.so-calendar-item[tabindex="0"]', HTMLElement)
	const titleText = () => find(document, '.so-calendar__title-text', HTMLElement)

	/** Календарь на инстансе `ctrl` и своём движке — после кадра: узлы дней объявлены. */
	async function mountCalendar(ctrl: TCalendar) {
		const fixture = TestBed.createComponent(CalendarModelHost)
		const engine = createEngineCalendar()

		fixture.componentInstance.ctrl.set(ctrl)
		fixture.componentInstance.engine.set(engine)
		fixture.detectChanges()

		await nextFrame()
		fixture.detectChanges()

		return { fixture, engine }
	}

	/**
	 * Фокус коллекции ушёл в месяц второй сетки в том же такте, что и запись
	 * `focused`: Angular перенесёт `tabindex` на проверке изменений, а остановку
	 * правило берёт у модели (`focusedDate`), — фокус встаёт на день того
	 * месяца, а не на прежнюю остановку в первой сетке.
	 */
	it('фокус коллекции в другом месяце и focused = true в одном такте — фокус на его дне', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const { engine } = await mountCalendar(ctrl)

		const before = stop()

		engine.extensions.focus.focusDate('2026-02-10')

		// Такт тот же: остановка в разметке ещё в январе
		expect(stop()).toBe(before)
		expect(engine.extensions.focus.focusedDate).toBe('2026-02-10')

		ctrl.focused = true

		const day = document.activeElement

		expect(day).not.toBe(before)
		expect(day?.classList.contains('so-calendar-item')).toBe(true)
		expect(day?.textContent).toBe('10')
		expect(day?.closest('.so-calendar__month')).toBe(
			document.querySelectorAll('.so-calendar__month')[1],
		)
	})

	/**
	 * Сетка одна, и листание в том же такте, что и запись `focused`, увело
	 * фокус коллекции в месяц, которого в разметке ещё нет: правило дня не
	 * находит, а корень календаря фокус не держит. Запись ждёт узла: Angular
	 * нарисует дни нового месяца на проверке изменений, их узлы объявят кадром
	 * позже — и фокус встанет на день `focusedDate`.
	 */
	it('одна сетка: showNext() и focused = true в одном такте — после перерисовки фокус на дне нового месяца', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01'] })
		const { fixture, engine } = await mountCalendar(ctrl)
		const { focus, view } = engine.extensions

		view.showNext()
		ctrl.focused = true

		const date = focus.focusedDate

		// Такт тот же: фокус коллекции в феврале, а разметка ещё январская
		expect(date.startsWith('2026-02-')).toBe(true)
		expect(titleText().textContent).not.toBe(view.grids[0]?.title)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		fixture.detectChanges()
		await nextFrame()

		const day = document.activeElement

		expect(titleText().textContent).toBe(view.grids[0]?.title)
		expect(day).toBe(stop())
		expect(day?.textContent).toBe(String(Number(date.slice(-2))))
		expect(ctrl.focused).toBe(true)
	})

	/**
	 * Пока открыта панель выбора месяца и года, сетка под её подложкой, и
	 * остановка календаря — список панели.
	 */
	it('панель выбора открыта — фокус на её списке, а не на дне под подложкой', async () => {
		const ctrl = new TCalendar()
		const { fixture, engine } = await mountCalendar(ctrl)

		const picker = engine.extensions.picker.pickers[0]

		if (!picker) throw new Error('панели выбора нет')

		picker.popover.open = true
		fixture.detectChanges()
		await nextFrame()
		fixture.detectChanges()

		// Фокус увели из календаря, а панель открыта
		ctrl.focused = false

		expect(picker.popover.open).toBe(true)

		ctrl.focused = true

		expect(document.activeElement).toBe(
			find(document, '.so-calendar__picker-list [role="listbox"]', HTMLElement),
		)
		expect(ctrl.focused).toBe(true)
	})
})

describe('Select.Item · фокус остаётся на поле', () => {
	/**
	 * У комбобокса DOM-фокус всегда на поле, а подсвеченную опцию объявляет
	 * `aria-activedescendant`: правила у опции нет, и запись её `focused`
	 * фокус с поля не уводит.
	 */
	it('focused = true у опции фокус с поля не уводит', async () => {
		const fixture = mountHost(SelectItemHost)
		const { select, item } = fixture.componentInstance

		await nextFrame()
		fixture.detectChanges()

		select.focused = true
		fixture.detectChanges()

		const field = find(document, '.so-select__field input', HTMLElement)

		expect(document.activeElement).toBe(field)

		item.focused = true
		fixture.detectChanges()

		expect(document.activeElement).toBe(field)
	})
})

describe('Scroller · вьюпорт — остановка', () => {
	/**
	 * Своих остановок в ленте нет, а листать есть куда: остановка — сам
	 * вьюпорт. Замер в jsdom нулевой, поэтому факт приносит инстанс — как
	 * `scroller.spec.ts`. Узел с `tabindex` Angular рисует на проверке
	 * изменений, а остановку правило берёт у модели.
	 */
	it('своих остановок нет — фокус на вьюпорте, а не на кнопке «вперёд»', async () => {
		const fixture = mountHost(ScrollerViewportHost)
		const { ctrl } = fixture.componentInstance

		await nextFrame()

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		fixture.detectChanges()
		ctrl.focused = true

		expect(document.activeElement).toBe(findIn(fixture, '.so-scroller__viewport', HTMLElement))
		expect(ctrl.focused).toBe(true)
	})
})
