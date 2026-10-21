/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и React
 * (`focus-target.spec.tsx`), по компонентам адаптера. У поля корень — коробка
 * вокруг `<input>`, у ListBox — рамка вокруг узла списка, у Tabs — рамка со
 * списком табов и панелями, у группы радио и аккордеона — контейнер
 * остановок, у элемента коллекции — обёртка вокруг строки; узел фокуса
 * называет правило дескриптора (`focusTarget` плагина действия).
 *
 * Своё у Angular — разметка: корень — элемент компонента, своя остановка
 * перед главной частью — шаблон слота (`leading`) или проекция (`header`). И
 * такт: смену состояния шаблон применяет на проверке изменений, и до неё
 * разметка отстаёт от модели.
 */

import { describe, it, expect } from 'vitest'
import { Component, type Type } from '@angular/core'
import {
	TAccordion,
	TAccordionItem,
	TCheckBox,
	TInput,
	TListBox,
	TListBoxItem,
	TNumberInput,
	TRadioGroup,
	TRadioGroupItem,
	TSwitch,
	TTabs,
	TTabsItem,
	TTextarea,
	createEngineTabs,
} from '@soldy-ui/core'
import {
	SlotDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TCheckBoxComponent,
	TInputComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TNumberInputComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSwitchComponent,
	TTabsComponent,
	TTabsItemComponent,
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
	CheckBox: { host: CheckBoxHost, target: 'input' },
	Switch: { host: SwitchHost, target: 'input' },
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
	'Tabs.Item': { host: TabsItemHost, target: '.target [role="tab"]' },
	'Accordion.Item': { host: AccordionItemHost, target: '.target .so-accordion-item__header' },
	'ListBox.Item': { host: ListBoxItemHost, target: '.target [role="option"]' },
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

		expect(document.activeElement).toBe(findIn(fixture, target, HTMLElement))
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
