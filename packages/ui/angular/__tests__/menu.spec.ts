/**
 * Menu под Angular — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро (`core/__tests__/menu.spec.ts`), клавиши, указатель и
 * фокус — плагины (`plugins/__tests__/menu.plugin.spec.ts`); здесь важно, что
 * они сходятся: панель телепортирована и помечена владельцем, роль и связки
 * стоят на своих узлах, пункты из данных и разметкой входят в коллекцию, клик
 * строки действия закрывает меню и сообщает `choose`, флажок отмечается и
 * меню не закрывает. Сценарии — те же, что у Vue (`ui/vue/__tests__/menu.spec.ts`),
 * кроме глобального компонента приложения с именем подменю — реестра
 * компонентов у Angular нет, и подменю рисует себя само. `item-content` —
 * с поправкой на непрозрачный шаблон, как у Svelte: заданный, он рисуется у
 * каждого подменю из данных вместо его пунктов. `v-model` у
 * Angular нет — открытость, отметку и значение потребитель отдаёт входом и
 * слышит выходом (`(soChangeOpen)`, `(soChangeSelected)`, `(soChangeValue)`).
 *
 * Своё у Angular — разметка. Корень — элемент потребителя (`<span so-menu>`),
 * триггер — шаблон слота (`<ng-template slot="trigger">`), и связку с панелью
 * на свой элемент потребитель кладёт `[so-attributes]`; вывод шаблона меняет
 * контекст в том же представлении, поэтому триггер — тот же узел при каждом
 * открытии и закрытии. Пункты из данных — по секциям, записи которых новые на
 * каждую смену, а их строки — те же узлы: петли идут по ключу секции и `uid`
 * пункта. Подменю из данных, переехавшее в другую группу, Angular снимает с
 * прежнего места и собирает на новом за одну проверку, и в обоих порядках
 * привязка владельца его движка остаётся у живого монтирования. Корень Angular
 * не снимается, а прячется, поэтому `rendered: false` меню и подменю передают
 * и своим панелям. Шаблон `item-content` меню выводит `ngTemplateOutlet` с
 * инжектором места (`ngTemplateOutletInjector="outlet"`), и его пункты входят
 * в коллекцию подменю, у которого он выведен, а не меню, где его написали.
 *
 * Порядок Tab, который ведёт сам браузер, jsdom не считает, а раскладку — тем
 * более: место панелей у якоря — `playground/vue/browser/angular-host.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import {
	createEngineMenu,
	type IMenuItem,
	type IMenuItemSource,
	type TCollectionEngineItemSource,
	type TMenuCollection,
	type TMenuRadioGroupValue,
} from '@soldy-ui/core'
import {
	AttributesDirective,
	SlotDirective,
	TButtonComponent,
	TMenuCheckboxItemComponent,
	TMenuComponent,
	TMenuGroupComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioGroupComponent,
	TMenuRadioItemComponent,
	TMenuSeparatorComponent,
	TMenuSubmenuComponent,
} from '@soldy-ui/angular'
import { find, nextFrame } from './mount'

/**
 * Триггер так, как его кладёт потребитель: Button в шаблоне слота, связку и
 * вид «нажата» он кладёт на себя директивой набора.
 */
const TRIGGER = `<ng-template
	slot="trigger"
	let-triggerAria="triggerAria"
	let-triggerDataset="triggerDataset"
>
	<button
		so-button
		text="Действия"
		class="so-test-trigger"
		[so-attributes]="{ ...triggerAria, ...triggerDataset }"
	></button>
</ng-template>`

/** То, что хост импортирует всегда: меню и триггер. */
const BASE = [TMenuComponent, TButtonComponent, SlotDirective, AttributesDirective]

/**
 * Группа переключателей и переключатели. Части хост импортирует ровно те,
 * что пишет: лишний импорт компилятор отмечает предупреждением NG8113.
 */
const RADIO = [TMenuRadioGroupComponent, TMenuRadioItemComponent]

/** Пункты меню данными и группы — типы входов `items` и `groups`. */
type TItems = NonNullable<TMenuComponent['items']>
type TGroups = NonNullable<TMenuComponent['groups']>

const ITEMS: TItems = [
	{ value: 'edit', text: 'Изменить' },
	{ value: 'remove', text: 'Удалить', variant: 'danger' },
]

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<unknown> | null = null

afterEach(() => {
	current = null
	vi.restoreAllMocks()
})

/**
 * Смонтировать хост в документ и дождаться кадра: корень плагины получают
 * через `requestAnimationFrame`. `prepare` задаёт входы до первой отрисовки —
 * так, как они стоят в разметке с самого начала.
 */
async function render<T>(host: Type<T>, prepare?: (page: T) => void): Promise<ComponentFixture<T>> {
	const fixture = TestBed.createComponent(host)

	current = fixture
	prepare?.(fixture.componentInstance)
	fixture.detectChanges()
	await nextFrame()
	fixture.detectChanges()

	return fixture
}

/**
 * Перепроверить хост: событие дошло до ядра и его состояния, а разметку
 * приложение без Zone.js перепроверяет на своём такте — тест делает это сразу.
 */
function check(): void {
	current?.detectChanges()
}

/** Узел по селектору в документе: панели телепортированы мимо хоста. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const triggerNode = () => node('.so-test-trigger')
const panel = () => node('.so-menu__panel')
const isOpen = () => panel().style.display !== 'none'
/** Строки пунктов по порядку — узлы с ролью. */
const rows = () => [...panel().querySelectorAll<HTMLElement>('[role^="menuitem"]')]

/** Строка пункта по тексту. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim().startsWith(text))

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
function click(target: HTMLElement): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
	check()
}

/** Клавиша на узле и кадр модели фокуса. Отдаёт событие: по нему видно, погашена ли она. */
async function press(
	target: HTMLElement,
	key: string,
	init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	target.dispatchEvent(event)
	check()
	await nextFrame()
	check()

	return event
}

/** Открыть кликом по триггеру и дождаться кадра модели фокуса. */
async function open(): Promise<void> {
	click(triggerNode())
	await nextFrame()
	check()
}

/** Панель по `id` — так на неё ссылается `aria-controls`. */
const panelOf = (target: HTMLElement): HTMLElement =>
	node(`#${target.getAttribute('aria-controls') ?? ''}`)

const shown = (target: HTMLElement) => target.style.display !== 'none'

/** Строка пункта по тексту в панели. */
function rowIn(scope: HTMLElement, text: string): HTMLElement {
	const row = [...scope.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find((candidate) =>
		candidate.textContent?.trim().startsWith(text),
	)

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Тексты строк пунктов-действий и подменю панели по порядку. */
const texts = (scope: HTMLElement) =>
	[...scope.querySelectorAll('[role="menuitem"]')].map((row) => row.textContent?.trim())

/** Модификаторы варианта узла. */
const variantsOf = (target: Element | null | undefined) =>
	[...(target?.classList ?? [])].filter((cls) => cls.includes('--variant-'))

/**
 * Меню из данных: входы — сигналами, выбор и открытость — выходами. Открытость
 * — в обе стороны: вход и `(soChangeOpen)` пишут один сигнал.
 */
@Component({
	selector: 'probe-menu-items',
	standalone: true,
	imports: BASE,
	template: `<span
		so-menu
		[items]="items()"
		[size]="size()"
		[variant]="variant()"
		[open]="open()"
		[rendered]="rendered()"
		[groups]="groups()"
		[groupBy]="groupBy()"
		[groupSeparators]="separators()"
		[trackBy]="trackBy()"
		[openOn]="openOn()"
		[engine]="engine"
		(soChoose)="chosen.push($event.value)"
		(soChangeOpen)="open.set($event)"
	>
		${TRIGGER}
	</span>`,
})
class ItemsPage {
	readonly openOn = signal<TMenuComponent['openOn']>(undefined)
	readonly items = signal<TMenuComponent['items']>(ITEMS)
	readonly size = signal<TMenuComponent['size']>(undefined)
	readonly variant = signal<TMenuComponent['variant']>(undefined)
	readonly open = signal<TMenuComponent['open']>(undefined)
	readonly rendered = signal<TMenuComponent['rendered']>(undefined)
	readonly groups = signal<TMenuComponent['groups']>(undefined)
	readonly groupBy = signal<TMenuComponent['groupBy']>(undefined)
	readonly separators = signal<TMenuComponent['groupSeparators']>(undefined)
	readonly trackBy = signal<TMenuComponent['trackBy']>(undefined)
	/** Движок снаружи — задаёт тест до первой отрисовки. */
	engine: TMenuCollection | undefined = undefined
	readonly chosen: unknown[] = []
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(ItemsPage)

		const root = node('.so-menu')

		expect(root.localName).toBe('span')
		expect(root.contains(triggerNode())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — меню с именем от кнопки, триггер ссылается на панель', async () => {
		await render(ItemsPage)

		const button = triggerNode()

		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		expect(button.getAttribute('aria-haspopup')).toBe('menu')
		expect(button.getAttribute('aria-expanded')).toBe('false')
		expect(button.getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(button.id)
		expect(button.id).not.toBe('')
		// Список — только прокрутка: роли у него нет
		expect(node('.so-menu__list').hasAttribute('role')).toBe(false)
	})

	it('пункты из данных — действия: строка с ролью и вне обхода Tab', async () => {
		await render(ItemsPage)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Изменить', 'Удалить'])
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['menuitem', 'menuitem'])
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
		expect(rows().some((row) => row.hasAttribute('aria-checked'))).toBe(false)
	})

	it('размер и вариант меню — модификаторами панели, свой вариант — у пункта', async () => {
		await render(ItemsPage, (page) => {
			page.size.set('lg')
			page.variant.set('brand')
		})

		expect(panel().classList).toContain('so-frame')
		expect(panel().classList).toContain('so-menu__panel--size-lg')
		expect(panel().classList).toContain('so-menu__panel--variant-brand')

		const [edit, remove] = [...panel().querySelectorAll('.so-menu-item')]

		expect(edit.classList).toContain('so-menu-item--size-lg')
		expect(remove.classList).toContain('so-menu-item--size-lg')
		// Вариант меню пункту не пишется: тема красит его с панели
		expect([...edit.classList].some((cls) => cls.includes('--variant-'))).toBe(false)
		expect(remove.classList).toContain('so-menu-item--variant-danger')
	})

	it('пустые значок и подсказка — без содержимого: тема прячет их по :empty', async () => {
		await render(ItemsPage)

		for (const row of rows()) {
			expect(node('.so-menu-item__icon', row).textContent).toBe('')
			expect(node('.so-menu-item__icon', row).children).toHaveLength(0)
			expect(node('.so-menu-item__shortcut', row).children).toHaveLength(0)
		}
	})

	/** Слоты пунктов из данных — шаблонами, с пунктом в scope. */
	@Component({
		selector: 'probe-menu-item-slots',
		standalone: true,
		imports: BASE,
		template: `<span so-menu [items]="items">
			${TRIGGER}
			<ng-template slot="item-leading" let-item="item"
				><i class="so-test-icon">{{ item.value }}</i></ng-template
			>
			<ng-template slot="item" let-text="text">{{ text }}…</ng-template>
			<ng-template slot="item-trailing" let-item="item">{{
				item.value === 'remove' ? 'Del' : ''
			}}</ng-template>
		</span>`,
	})
	class SlotsPage {
		readonly items = ITEMS
	}

	it('слоты пункта из данных пробрасываются с пунктом в scope', async () => {
		await render(SlotsPage)

		const [edit, remove] = rows()

		expect(node('.so-menu-item__icon .so-test-icon', edit).textContent).toBe('edit')
		expect(node('.so-button__text', edit).textContent).toBe('Изменить…')
		expect(node('.so-menu-item__shortcut', edit).textContent).toBe('')
		expect(node('.so-menu-item__shortcut', remove).textContent).toBe('Del')
	})
})

describe('открытие', () => {
	it('клик по триггеру открывает меню, повторный — закрывает', async () => {
		await render(ItemsPage)

		await open()

		expect(isOpen()).toBe(true)
		expect(triggerNode().getAttribute('aria-expanded')).toBe('true')
		expect(triggerNode().dataset['selected']).toBe('true')
		expect(node('.so-menu').dataset['open']).toBe('true')

		click(triggerNode())

		expect(isOpen()).toBe(false)
	})

	it('open входом и (soChangeOpen) — в обе стороны', async () => {
		const fixture = await render(ItemsPage, (page) => page.open.set(false))
		const page = fixture.componentInstance

		page.open.set(true)
		check()

		expect(isOpen()).toBe(true)

		click(triggerNode())

		expect(page.open()).toBe(false)
	})
})

/**
 * Связка триггера меняется на каждое открытие (`aria-expanded`,
 * `data-selected`), а триггер — тот же узел: вывод шаблона отдаёт новый
 * контекст тому же представлению. Пересоздай он представление — фокус,
 * стоявший на прежнем триггере, упал бы на `body`.
 */
describe('триггер — тот же узел', () => {
	it('после открытия и закрытия — тот же узел с новой связкой', async () => {
		await render(ItemsPage)

		const first = triggerNode()

		await open()

		expect(triggerNode()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('true')
		expect(first.dataset['selected']).toBe('true')

		await press(rowOf('Изменить'), 'Escape')

		expect(triggerNode()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('false')
		expect(first.dataset['selected']).toBe('false')
	})

	it('после закрытия кликом по триггеру фокус остаётся на нём', async () => {
		await render(ItemsPage)

		const first = triggerNode()

		await open()

		click(first)

		expect(isOpen()).toBe(false)
		expect(triggerNode()).toBe(first)
		expect(document.activeElement).toBe(first)
	})
})

describe('нажатие пунктов', () => {
	it('клик строки действия закрывает меню, сообщает choose и возвращает фокус', async () => {
		const fixture = await render(ItemsPage)

		await open()
		click(rowOf('Удалить'))

		expect(fixture.componentInstance.chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Enter на строке — её клик: пункт нажат один раз', async () => {
		const fixture = await render(ItemsPage)

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Изменить'))

		await press(rowOf('Изменить'), 'Enter')

		expect(fixture.componentInstance.chosen).toEqual(['edit'])
		expect(isOpen()).toBe(false)
	})

	it('выключенный пункт не нажимается', async () => {
		const fixture = await render(ItemsPage, (page) =>
			page.items.set([{ value: 'edit', text: 'Изменить', disabled: true }]),
		)

		await open()
		click(rowOf('Изменить'))

		expect(rowOf('Изменить').getAttribute('aria-disabled')).toBe('true')
		expect(fixture.componentInstance.chosen).toEqual([])
		expect(isOpen()).toBe(true)
	})

	/** Флажки разметкой: отметка «Сетки» — в сигнале, в обе стороны. */
	@Component({
		selector: 'probe-menu-checkboxes',
		standalone: true,
		imports: [...BASE, TMenuCheckboxItemComponent, TMenuItemComponent],
		template: `<span so-menu (soChoose)="chosen.push($event.value)">
			${TRIGGER}
			<div
				so-menu-checkbox-item
				value="grid"
				text="Сетка"
				[selected]="grid()"
				(soChangeSelected)="grid.set($event)"
			></div>
			<div so-menu-checkbox-item value="ruler" text="Линейка" selected></div>
			<div so-menu-item value="edit" text="Изменить"></div>
		</span>`,
	})
	class CheckboxesPage {
		readonly grid = signal(false)
		readonly chosen: unknown[] = []
	}

	it('флажок отмечается кликом и меню не закрывает: selected входом и (soChangeSelected)', async () => {
		const fixture = await render(CheckboxesPage)
		const page = fixture.componentInstance

		await open()

		expect(rowOf('Сетка').getAttribute('role')).toBe('menuitemcheckbox')
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')

		click(rowOf('Сетка'))

		expect(page.grid()).toBe(true)
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		// Отметки флажков независимы, меню открыто, choose нет
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')
		expect(isOpen()).toBe(true)
		expect(page.chosen).toEqual([])

		page.grid.set(false)
		check()

		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
	})

	it('отметка рисуется только у отмеченного флажка, обёртка — у всех флажков', async () => {
		await render(CheckboxesPage)

		const indicator = (text: string) => rowOf(text).querySelector('.so-menu-item__indicator')

		expect(indicator('Сетка')?.getAttribute('aria-hidden')).toBe('true')
		expect(indicator('Сетка')?.querySelector('svg, .so-icon')).toBeNull()
		expect(indicator('Линейка')?.querySelector('.so-icon')).not.toBeNull()
		expect(indicator('Изменить')).toBeNull()
	})

	@Component({
		selector: 'probe-menu-checkbox-mark',
		standalone: true,
		imports: [...BASE, TMenuCheckboxItemComponent],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-checkbox-item value="grid" text="Сетка" selected>
				<ng-template slot="indicator-icon" let-selected="selected"
					><i class="so-test-mark" [attr.data-mark]="selected"></i
				></ng-template>
			</div>
		</span>`,
	})
	class CheckboxMarkPage {}

	it('слот отметки флажка подменяет иконку, scope — отмечен ли флажок', async () => {
		await render(CheckboxMarkPage)

		expect(node('.so-test-mark', rowOf('Сетка')).dataset['mark']).toBe('true')
		expect(rowOf('Сетка').querySelector('.so-menu-item__indicator .so-icon')).toBeNull()
	})

	/**
	 * Слушатель потребителя на пункте рендерер адаптера ставит на строку, рядом
	 * со своим: клик пункта приходит потребителю следом за нажатием.
	 */
	@Component({
		selector: 'probe-menu-item-click',
		standalone: true,
		imports: [...BASE, TMenuItemComponent],
		template: `<span so-menu (soChoose)="order.push('choose')">
			${TRIGGER}
			<div so-menu-item value="edit" text="Изменить" (click)="order.push('click')"></div>
		</span>`,
	})
	class ItemClickPage {
		readonly order: string[] = []
	}

	it('клик потребителя по строке не отменяет нажатие пункта', async () => {
		const fixture = await render(ItemClickPage)

		await open()
		click(rowOf('Изменить'))

		expect(fixture.componentInstance.order).toEqual(['choose', 'click'])
		expect(isOpen()).toBe(false)
	})
})

/**
 * Переключатели: `<div so-menu-radio-group>` со своим значением и
 * `<div so-menu-radio-item>` в ней. Отметка — выбор коллекции меню, и в группе
 * отмечен один; группу переключатель берёт лифтом. Модель —
 * `core/__tests__/menu.spec.ts`, лифт без фреймворка —
 * `setup/__tests__/menu-radio.spec.ts`.
 */
describe('переключатели', () => {
	/** Меню с группой «Сортировка», её значение — в сигнале, и флажком рядом. */
	@Component({
		selector: 'probe-menu-sort',
		standalone: true,
		imports: [...BASE, ...RADIO, TMenuSeparatorComponent, TMenuCheckboxItemComponent],
		template: `<span so-menu (soChoose)="chosen.push($event.value)">
			${TRIGGER}
			<div
				so-menu-radio-group
				label="Сортировка"
				[value]="sort()"
				(soChangeValue)="sort.set($event.newValue)"
			>
				<div so-menu-radio-item value="name" text="По имени"></div>
				<div so-menu-radio-item value="date" text="По дате"></div>
			</div>
			<div so-menu-separator></div>
			<div so-menu-checkbox-item value="grid" text="Сетка" selected></div>
		</span>`,
	})
	class SortPage {
		readonly sort = signal<TMenuRadioGroupValue>(null)
		readonly chosen: unknown[] = []
	}

	const checked = () => rows().map((row) => row.getAttribute('aria-checked'))

	it('группа — group с именем от подписи, переключатели — menuitemradio вне обхода Tab', async () => {
		await render(SortPage)

		const group = node('.so-menu-group')
		const label = node('.so-menu-group__label', group)

		expect(group.getAttribute('role')).toBe('group')
		expect(group.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.textContent).toBe('Сортировка')

		expect(rowOf('По имени').getAttribute('role')).toBe('menuitemradio')
		expect(rowOf('По дате').getAttribute('tabindex')).toBe('-1')
		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	it('клик отмечает переключатель и меню не закрывает: value входом и (soChangeValue)', async () => {
		const fixture = await render(SortPage)
		const page = fixture.componentInstance

		await open()
		click(rowOf('По имени'))

		expect(page.sort()).toBe('name')
		expect(checked()).toEqual(['true', 'false', 'true'])

		click(rowOf('По дате'))

		// В группе отмечен один, флажок — сам по себе
		expect(page.sort()).toBe('date')
		expect(checked()).toEqual(['false', 'true', 'true'])

		// Отмеченный нажатием не снимается
		click(rowOf('По дате'))

		expect(page.sort()).toBe('date')
		expect(isOpen()).toBe(true)
		expect(page.chosen).toEqual([])
	})

	it('значение из приложения отмечает свой переключатель, без него — ни один', async () => {
		const fixture = await render(SortPage, (page) => page.sort.set('date'))
		const page = fixture.componentInstance

		expect(checked()).toEqual(['false', 'true', 'true'])

		page.sort.set('name')
		check()

		expect(checked()).toEqual(['true', 'false', 'true'])

		page.sort.set('size')
		check()

		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	/** Отметка переключателей — в сигналах, в обе стороны, значение группы — тоже. */
	@Component({
		selector: 'probe-menu-radio-selected',
		standalone: true,
		imports: [...BASE, ...RADIO],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-radio-group [value]="sort()" (soChangeValue)="sort.set($event.newValue)">
				<div
					so-menu-radio-item
					value="name"
					text="name"
					[selected]="name()"
					(soChangeSelected)="name.set($event)"
				></div>
				<div
					so-menu-radio-item
					value="date"
					text="date"
					[selected]="date()"
					(soChangeSelected)="date.set($event)"
				></div>
			</div>
		</span>`,
	})
	class RadioSelectedPage {
		readonly sort = signal<TMenuRadioGroupValue>('name')
		readonly name = signal(true)
		readonly date = signal(false)
	}

	it('selected у переключателя — его отметка: значение группы и сосед за ней', async () => {
		const fixture = await render(RadioSelectedPage)
		const page = fixture.componentInstance

		page.date.set(true)
		check()

		expect(page.sort()).toBe('date')
		expect(page.name()).toBe(false)
		expect(checked()).toEqual(['false', 'true'])
	})

	it('точка рисуется только у отмеченного, обёртка отметки — у всех переключателей', async () => {
		await render(SortPage, (page) => page.sort.set('name'))

		const indicator = (text: string) => node('.so-menu-item__indicator', rowOf(text))

		expect(indicator('По имени').getAttribute('aria-hidden')).toBe('true')
		expect(indicator('По имени').querySelector('.so-menu-item__dot')).not.toBeNull()
		expect(indicator('По дате').querySelector('.so-menu-item__dot')).toBeNull()
		expect(indicator('По дате').children).toHaveLength(0)
	})

	/** Две группы одного меню — значения в своих сигналах. */
	@Component({
		selector: 'probe-menu-two-groups',
		standalone: true,
		imports: [...BASE, ...RADIO],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-radio-group [value]="sort()" (soChangeValue)="sort.set($event.newValue)">
				<div so-menu-radio-item value="name" text="name"></div>
				<div so-menu-radio-item value="date" text="date"></div>
			</div>
			<div so-menu-radio-group [value]="order()" (soChangeValue)="order.set($event.newValue)">
				<div so-menu-radio-item value="asc" text="asc"></div>
				<div so-menu-radio-item value="desc" text="desc"></div>
			</div>
		</span>`,
	})
	class TwoGroupsPage {
		readonly sort = signal<TMenuRadioGroupValue>('name')
		readonly order = signal<TMenuRadioGroupValue>('asc')
	}

	it('две группы одного меню независимы', async () => {
		const fixture = await render(TwoGroupsPage)
		const page = fixture.componentInstance

		await open()
		click(rowOf('date'))
		click(rowOf('desc'))

		expect([page.sort(), page.order()]).toEqual(['date', 'desc'])
		expect(checked()).toEqual(['false', 'true', 'false', 'true'])
	})

	@Component({
		selector: 'probe-menu-radio-mark',
		standalone: true,
		imports: [...BASE, ...RADIO],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-radio-group value="name">
				<div so-menu-radio-item value="name" text="По имени">
					<ng-template slot="indicator-icon" let-selected="selected"
						><i class="so-test-mark" [attr.data-mark]="selected"></i
					></ng-template>
				</div>
			</div>
		</span>`,
	})
	class RadioMarkPage {}

	it('слот отметки подменяет точку, scope — отмечен ли переключатель', async () => {
		await render(RadioMarkPage)

		expect(node('.so-test-mark', rowOf('По имени')).dataset['mark']).toBe('true')
		expect(rowOf('По имени').querySelector('.so-menu-item__dot')).toBeNull()
	})
})

describe('группа и разделитель', () => {
	@Component({
		selector: 'probe-menu-groups-markup',
		standalone: true,
		imports: [
			...BASE,
			TMenuGroupComponent,
			TMenuCheckboxItemComponent,
			TMenuSeparatorComponent,
			TMenuItemComponent,
		],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-group label="Вид">
				<div so-menu-checkbox-item value="grid" text="Сетка"></div>
			</div>
			<div so-menu-separator></div>
			<div so-menu-group>
				<div so-menu-item value="edit" text="Изменить"></div>
			</div>
		</span>`,
	})
	class GroupsPage {}

	it('группа — group с именем от подписи, пункты в ней — пункты меню', async () => {
		await render(GroupsPage)

		const [labelled, bare] = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]
		const label = node('.so-menu-group__label', labelled)

		expect(labelled.getAttribute('role')).toBe('group')
		expect(label.textContent).toBe('Вид')
		expect(labelled.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.id).not.toBe('')

		// Без подписи — ни обёртки, ни ссылки
		expect(bare.querySelector('.so-menu-group__label')).toBeNull()
		expect(bare.hasAttribute('aria-labelledby')).toBe(false)

		expect(node('.so-menu-separator').getAttribute('role')).toBe('separator')

		// Навигация идёт сквозь группы: строки в порядке разметки
		triggerNode().focus()
		await press(triggerNode(), 'ArrowUp')

		expect(document.activeElement).toBe(rowOf('Изменить'))
	})
})

/**
 * Группы из данных: метка группы — `_.group` в `items` или `groupBy`, порядок
 * и подписи — `groups`. Меню рисует секции показанного: группу с подписью —
 * `<div so-menu-group>`, пункты без группы — прямо в списке, между секциями —
 * разделитель. Группы из `groups` идут первыми, остальное — по месту, поэтому
 * здесь, где заявлены все группы, пункты без группы — последними. Стрелки
 * ходят тем же порядком, что пункты стоят на экране.
 */
describe('группы из данных', () => {
	/** В данных «Увеличить» и «Переименовать» стоят между пунктами «Правки». */
	const GROUPED: TItems = [
		{ value: 'cut', text: 'Вырезать', _: { group: 'edit' } },
		{ value: 'zoom', text: 'Увеличить', _: { group: 'view' } },
		{ value: 'rename', text: 'Переименовать' },
		{ value: 'copy', text: 'Копировать', _: { group: 'edit' } },
	]

	const GROUPS: TGroups = [
		{ key: 'edit', label: 'Правка' },
		{ key: 'view', label: 'Вид' },
	]

	/** Данные и группы — до первой отрисовки. */
	const grouped = (page: ItemsPage) => {
		page.items.set(GROUPED)
		page.groups.set(GROUPS)
	}

	/** Части списка по порядку: группа — по подписи, разделитель, пункт — по тексту. */
	const parts = () =>
		[...node('.so-menu__list').children].map((child) => {
			if (child.classList.contains('so-menu-group')) {
				return `группа ${child.querySelector('.so-menu-group__label')?.textContent ?? ''}`
			}

			if (child.classList.contains('so-menu-separator')) return '—'

			return child.textContent?.trim()
		})

	it('группы с подписью, разделитель — только между секциями, без группы — последними', async () => {
		await render(ItemsPage, grouped)

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Вырезать',
			'Копировать',
			'Увеличить',
			'Переименовать',
		])

		const groups = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]

		for (const group of groups) {
			const label = node('.so-menu-group__label', group)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
		}

		expect(groups[0].contains(rowOf('Копировать'))).toBe(true)
		expect(
			[...panel().querySelectorAll('.so-menu-separator')].map((separator) =>
				separator.getAttribute('role'),
			),
		).toEqual(['separator', 'separator'])
	})

	it('стрелки ходят порядком экрана: ↓ с «Вырезать» — на «Копировать»', async () => {
		await render(ItemsPage, grouped)

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Вырезать'))

		await press(rowOf('Вырезать'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Копировать'))

		await press(rowOf('Копировать'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Увеличить'))

		await press(rowOf('Увеличить'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Переименовать'))
	})

	it('смена подписи в groups перерисовывает подписи групп', async () => {
		const fixture = await render(ItemsPage, grouped)

		fixture.componentInstance.groups.set([
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		])
		check()

		expect(parts()).toEqual(['группа Edit', '—', 'группа View', '—', 'Переименовать'])
	})

	/**
	 * Секции — новые записи на каждую смену, а петли по ним идут по ключу
	 * секции и `uid` пункта: смена подписи и новый пункт не пересоздают строк —
	 * фокус и узлы пунктов на месте. С `trackBy` новый состав — правка
	 * прежнего, и пункты секций — те же экземпляры.
	 */
	it('строки пунктов — те же узлы после смены подписи в groups и нового пункта', async () => {
		const fixture = await render(ItemsPage, (page) => {
			grouped(page)
			page.trackBy.set((item: { value?: unknown }) => item.value)
		})
		const page = fixture.componentInstance

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		const before = rows()
		const focused = rowOf('Вырезать')

		expect(document.activeElement).toBe(focused)

		page.groups.set([
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		])
		check()

		expect(rows()).toHaveLength(before.length)
		before.forEach((row, index) => expect(rows()[index]).toBe(row))

		page.items.set([...GROUPED, { value: 'paste', text: 'Вставить', _: { group: 'edit' } }])
		check()

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Вырезать',
			'Копировать',
			'Вставить',
			'Увеличить',
			'Переименовать',
		])

		for (const row of before) expect(rows()).toContain(row)

		expect(document.activeElement).toBe(focused)
	})

	it('groupBy входом: ключ группы — из пункта', async () => {
		await render(ItemsPage, (page) => {
			page.groupBy.set((item: IMenuItem) =>
				item.variant === 'danger' ? 'danger' : undefined,
			)
			page.groups.set([{ key: 'danger', label: 'Опасное' }])
		})

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('группировка через движок: engine.extensions.group после монтирования', async () => {
		const engine = createEngineMenu({ items: ITEMS })

		await render(ItemsPage, (page) => {
			page.items.set(undefined)
			page.engine = engine
		})

		expect(parts()).toEqual(['Изменить', 'Удалить'])

		engine.extensions.group.groupBy = (item) => (item.value === 'remove' ? 'danger' : undefined)
		engine.extensions.group.groups = [{ key: 'danger', label: 'Опасное' }]
		check()

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('без группировки — ни групп, ни разделителей: пункты прямо в списке', async () => {
		await render(ItemsPage)

		expect(parts()).toEqual(['Изменить', 'Удалить'])
		expect(panel().querySelector('.so-menu-group, .so-menu-separator')).toBeNull()
	})

	it('groupSeparators=false — секции без разделителей, порядок и группы те же', async () => {
		await render(ItemsPage, (page) => {
			grouped(page)
			page.separators.set(false)
		})

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
		expect(panel().querySelector('.so-menu-separator')).toBeNull()
	})

	it('groupSeparators на лету ставит и снимает разделители', async () => {
		const fixture = await render(ItemsPage, (page) => {
			grouped(page)
			page.separators.set(false)
		})
		const page = fixture.componentInstance

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])

		page.separators.set(true)
		check()

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])

		page.separators.set(false)
		check()

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
	})

	@Component({
		selector: 'probe-menu-manual-separator',
		standalone: true,
		imports: [...BASE, TMenuItemComponent, TMenuSeparatorComponent],
		template: `<span so-menu [groupSeparators]="false">
			${TRIGGER}
			<div so-menu-item value="edit" text="Изменить"></div>
			<div so-menu-separator></div>
			<div so-menu-item value="remove" text="Удалить"></div>
		</span>`,
	})
	class ManualSeparatorPage {}

	it('ручной разделитель разметки свойство не трогает', async () => {
		await render(ManualSeparatorPage)

		expect(parts()).toEqual(['Изменить', '—', 'Удалить'])
	})
})

/**
 * Группы разметки — `<div so-menu-group>` и `<div so-menu-radio-group>` —
 * входят в ту же группировку, что группы из данных: их ключ пункты внутри
 * берут лифтом, подпись группа регистрирует в группировке, и `sections`
 * описывают их. Пункт вне группы пишут и над группами («Новый» над «Правкой»):
 * группы не заявлены в `groups`, и показанное идёт по месту — стрелки ходят,
 * как пункты стоят.
 */
describe('группы разметки', () => {
	/** «Новый» — над группой «Правка», «Закрыть» — под группой переключателей. */
	@Component({
		selector: 'probe-menu-markup-groups',
		standalone: true,
		imports: [
			...BASE,
			...RADIO,
			TMenuItemComponent,
			TMenuGroupComponent,
			TMenuSeparatorComponent,
		],
		template: `<span so-menu [engine]="engine">
			${TRIGGER}
			<div so-menu-item value="new" text="Новый"></div>
			<div so-menu-group [label]="label()">
				<div so-menu-item value="cut" text="Вырезать"></div>
				<div so-menu-item value="copy" text="Копировать"></div>
			</div>
			<div so-menu-separator></div>
			<div so-menu-radio-group label="Сортировка" value="name">
				<div so-menu-radio-item value="name" text="По имени"></div>
				<div so-menu-radio-item value="date" text="По дате"></div>
			</div>
			<div so-menu-item value="close" text="Закрыть"></div>
		</span>`,
	})
	class MarkupGroupsPage {
		readonly engine = createEngineMenu()
		readonly label = signal('Правка')
	}

	/** Секции коротко: подпись группы (`null` — без группы) и значения пунктов. */
	const brief = (engine: TMenuCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('секции — группы разметки с подписью, пункты вне групп — на своих местах', async () => {
		const fixture = await render(MarkupGroupsPage)
		const { engine } = fixture.componentInstance

		expect(brief(engine)).toEqual([
			[null, ['new']],
			['Правка', ['cut', 'copy']],
			['Сортировка', ['name', 'date']],
			[null, ['close']],
		])
		expect(engine.extensions.group.groups).toEqual([])
	})

	it('стрелки ходят порядком экрана: «Новый» над группой — первым', async () => {
		await render(MarkupGroupsPage)

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		const visited = [document.activeElement]

		for (let step = 1; step < rows().length; step += 1) {
			const focused = document.activeElement

			if (!(focused instanceof HTMLElement)) throw new Error('фокус — не на строке')

			await press(focused, 'ArrowDown')
			visited.push(document.activeElement)
		}

		expect(visited).toEqual(rows())
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Новый',
			'Вырезать',
			'Копировать',
			'По имени',
			'По дате',
			'Закрыть',
		])
	})

	it('смена подписи группы разметки — новая подпись секции', async () => {
		const fixture = await render(MarkupGroupsPage)
		const page = fixture.componentInstance

		page.label.set('Изменение')
		check()

		expect(brief(page.engine)[1]).toEqual(['Изменение', ['cut', 'copy']])
	})
})

/**
 * Контекстное меню — `openOn="contextmenu"`: в слоте `trigger` область, меню
 * вызывают над ней, и панель встаёт у точки вызова. Переходы плагинов —
 * `plugins/__tests__/menu.plugin.spec.ts`, расчёт у точки —
 * `setup/__tests__/overlay.spec.ts`; здесь — что проводка доводит точку от
 * ядра до якоря панели и что связка кнопки у области пуста.
 */
describe('контекстное меню', () => {
	/** Область — строка «файла», как у потребителя: связку из scope она берёт, если она есть. */
	@Component({
		selector: 'probe-menu-context',
		standalone: true,
		imports: [TMenuComponent, SlotDirective, AttributesDirective],
		template: `<span so-menu openOn="contextmenu" [items]="items">
			<ng-template slot="trigger" let-triggerAria="triggerAria">
				<div class="so-test-area" [so-attributes]="triggerAria">Отчёт.pdf</div>
			</ng-template>
		</span>`,
	})
	class AreaPage {
		readonly items = ITEMS
	}

	const areaNode = () => node('.so-test-area')

	/** Правая кнопка мыши над областью в точке окна. */
	async function rightClick(x: number, y: number): Promise<void> {
		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 2 }),
		)
		areaNode().dispatchEvent(
			new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: x,
				clientY: y,
			}),
		)
		check()
		await nextFrame()
		check()
	}

	it('у области связки кнопки нет, у панели — роль и id, но не имя от триггера', async () => {
		await render(AreaPage)

		expect(
			areaNode()
				.getAttributeNames()
				.filter((name) => name.startsWith('aria-')),
		).toEqual([])
		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().id).not.toBe('')
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('правая кнопка открывает меню у точки вызова, повторная — переставляет панель', async () => {
		await render(AreaPage)

		await rightClick(120, 80)

		expect(isOpen()).toBe(true)
		// Точка — в координатах окна: панель `fixed`, отступ 4px, как у кнопки
		expect(panel().style.position).toBe('fixed')
		expect(panel().style.left).toBe('120px')
		expect(panel().style.top).toBe('84px')

		await rightClick(300, 200)

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('300px')
		expect(panel().style.top).toBe('204px')
	})

	it('нажатие в области мимо вызова закрывает меню', async () => {
		await render(AreaPage)

		await rightClick(120, 80)

		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }),
		)
		check()

		expect(isOpen()).toBe(false)
	})

	it('смена openOn на лету: у кнопки связка появляется, у области пропадает', async () => {
		const fixture = await render(ItemsPage, (page) => page.openOn.set('press'))
		const page = fixture.componentInstance

		expect(triggerNode().getAttribute('aria-haspopup')).toBe('menu')

		page.openOn.set('contextmenu')
		check()

		expect(triggerNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(triggerNode().hasAttribute('aria-controls')).toBe(false)
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)

		page.openOn.set('press')
		check()

		expect(triggerNode().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(triggerNode().id)
	})
})

/**
 * Подменю — `<div so-menu-submenu>`: пункт меню, в котором стоит, и меню своих
 * пунктов. Переходы плагинов — `plugins/__tests__/menu-submenu.plugin.spec.ts`,
 * сборка через лифт — `setup/__tests__/menu-submenu.spec.ts`; здесь — что в
 * Angular пункт входит в коллекцию меню над ним, а его пункты — в его
 * собственную, связки стоят на своих узлах, клавиши и нажатие ходят между
 * уровнями, а выбор в подменю закрывает всё меню.
 */
describe('подменю', () => {
	/** Строка пункта с подменю — узел с ролью у пункта «Поделиться». */
	const shareRow = () => {
		const row = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')].find(
			(candidate) => candidate.textContent?.trim().startsWith('Поделиться'),
		)

		if (!row) throw new Error('строки «Поделиться» нет')

		return row
	}

	const rootPanel = () => panelOf(triggerNode())
	const subPanel = () => panelOf(shareRow())

	/**
	 * Меню «Изменить · Поделиться → (Ссылка, Почта) · Удалить» разметкой и
	 * кнопка после него. Открытость подменю — в сигнале, в обе стороны.
	 */
	@Component({
		selector: 'probe-menu-share',
		standalone: true,
		imports: [...BASE, TMenuItemComponent, TMenuSubmenuComponent],
		template: `<div>
			<span
				so-menu
				[size]="size()"
				[variant]="variant()"
				(soChoose)="root.push($event.value)"
			>
				${TRIGGER}
				<div so-menu-item value="edit" text="Изменить"></div>
				<div
					so-menu-submenu
					value="share"
					text="Поделиться"
					[variant]="own()"
					[rendered]="shareRendered()"
					[open]="shareOpen()"
					(soChangeOpen)="shareOpen.set($event)"
					(soChoose)="nested.push($event.value)"
				>
					<div so-menu-item value="link" text="Ссылка"></div>
					<div so-menu-item value="mail" text="Почта"></div>
				</div>
				<div so-menu-item value="remove" text="Удалить"></div>
			</span>
			<button class="so-test-after">После</button>
		</div>`,
	})
	class SharePage {
		readonly size = signal<TMenuComponent['size']>(undefined)
		readonly variant = signal<TMenuComponent['variant']>(undefined)
		readonly own = signal<TMenuSubmenuComponent['variant']>(undefined)
		readonly shareRendered = signal<TMenuSubmenuComponent['rendered']>(undefined)
		readonly shareOpen = signal(false)
		readonly root: unknown[] = []
		readonly nested: unknown[] = []
	}

	/** Открыть меню клавишей и спуститься на «Поделиться». */
	async function openOnShare(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowIn(rootPanel(), 'Изменить'), 'ArrowDown')
	}

	it('строка — пункт меню, панель подменю — меню с именем от строки, в body и скрыта', async () => {
		await render(SharePage)

		const row = shareRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(subPanel().getAttribute('role')).toBe('menu')
		expect(subPanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(subPanel().getAttribute('tabindex')).toBe('-1')
		expect(subPanel().parentElement).toBe(document.body)
		expect(subPanel()).not.toBe(rootPanel())
		expect(shown(subPanel())).toBe(false)
		// Стрелка у конца строки — немая: подменю объявляет aria-haspopup
		expect(node('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).not.toBeNull()
	})

	it('пункт входит в меню над ним, его пункты — в его собственное меню', async () => {
		await render(SharePage)

		expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
		expect(texts(subPanel())).toEqual(['Ссылка', 'Почта'])

		// Стрелки меню ходят по его пунктам: из «Поделиться» вниз — «Удалить»
		await openOnShare()

		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'ArrowDown')

		expect(document.activeElement).toBe(rowIn(rootPanel(), 'Удалить'))
	})

	it('→ открывает подменю на первом пункте, ← закрывает уровень — фокус на строке', async () => {
		await render(SharePage)

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)
		expect(shareRow().getAttribute('aria-expanded')).toBe('true')
		expect(document.activeElement).toBe(rowIn(subPanel(), 'Ссылка'))
		// Пункт подменю горит, пока открыта его панель
		expect(shareRow().parentElement?.dataset['open']).toBe('true')

		await press(rowIn(subPanel(), 'Ссылка'), 'ArrowLeft')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())
	})

	it('Escape закрывает один уровень, следующий — меню', async () => {
		await render(SharePage)

		await openOnShare()
		await press(shareRow(), 'Enter')
		await press(rowIn(subPanel(), 'Ссылка'), 'Escape')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('клик по строке открывает подменю, повторный его не закрывает', async () => {
		await render(SharePage)

		await open()
		click(shareRow())

		expect(shown(subPanel())).toBe(true)

		click(shareRow())

		expect(shown(subPanel())).toBe(true)
	})

	it('выбор в подменю закрывает всё меню, сообщает choose меню и подменю, фокус — на триггер', async () => {
		const fixture = await render(SharePage)
		const page = fixture.componentInstance

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		click(rowIn(subPanel(), 'Почта'))
		await nextFrame()

		expect(page.root).toEqual(['mail'])
		expect(page.nested).toEqual(['mail'])
		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Tab в подменю закрывает всё меню и ведёт к остановке за ним', async () => {
		await render(SharePage)

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		await press(rowIn(subPanel(), 'Ссылка'), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('open входом и (soChangeOpen) — в обе стороны', async () => {
		const fixture = await render(SharePage)
		const page = fixture.componentInstance

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(page.shareOpen()).toBe(true)

		page.shareOpen.set(false)
		check()

		expect(shown(subPanel())).toBe(false)
	})

	it('размер меню — у панели подменю и у его пунктов', async () => {
		await render(SharePage, (page) => page.size.set('lg'))

		expect(subPanel().classList).toContain('so-menu__panel')
		expect(subPanel().classList).toContain('so-menu__panel--size-lg')
		expect(rowIn(subPanel(), 'Ссылка').parentElement?.classList).toContain(
			'so-menu-item--size-lg',
		)
	})

	/**
	 * Панель подменю телепортирована, и класс панели меню до её пунктов не
	 * доходит: вариант меню она несёт своим модификатором, а свой вариант
	 * подменю сильнее. Строкам — ни подменю, ни его пунктов — вариант меню не
	 * пишется: их тема красит с панели, в которой они стоят.
	 */
	it('вариант меню — у панели подменю, свой вариант подменю сильнее; смена на лету', async () => {
		const fixture = await render(SharePage, (page) => page.variant.set('brand'))
		const page = fixture.componentInstance

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(shareRow().parentElement)).toEqual([])
		expect(variantsOf(rowIn(subPanel(), 'Ссылка').parentElement)).toEqual([])

		page.variant.set('danger')
		check()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])

		page.own.set('brand')
		check()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(shareRow().parentElement)).toEqual(['so-menu-item--variant-brand'])

		// Под своим вариантом подменю смена у меню панели не трогает
		page.variant.set(undefined)
		check()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])

		page.own.set(undefined)
		check()

		expect(variantsOf(subPanel())).toEqual([])
	})

	/**
	 * Корень подменю Angular не снимается, а прячется, а его панель увезена в
	 * `body`: `rendered` подменю передаёт ей сам, иначе открытая панель осталась
	 * бы на виду без своей строки.
	 */
	it('rendered: false у подменю прячет его корень и открытую панель', async () => {
		const fixture = await render(SharePage)
		const page = fixture.componentInstance

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)

		page.shareRendered.set(false)
		check()

		expect(shareRow().parentElement?.style.display).toBe('none')
		expect(shown(subPanel())).toBe(false)

		page.shareRendered.set(true)
		check()

		expect(shown(subPanel())).toBe(true)
	})

	const SEND: Pick<TMenuSubmenuComponent, 'items' | 'groups'> = {
		items: [
			{ value: 'link', text: 'Ссылка' },
			{ value: 'mail', text: 'Почта', _: { group: 'send' } },
		],
		groups: [{ key: 'send', label: 'Отправить' }],
	}

	/** Пункты подменю данными — с группой и шаблоном слота `item`. */
	@Component({
		selector: 'probe-menu-submenu-items',
		standalone: true,
		imports: [...BASE, TMenuSubmenuComponent],
		template: `<span so-menu [groupSeparators]="false">
			${TRIGGER}
			<div
				so-menu-submenu
				value="share"
				text="Поделиться"
				[items]="send.items"
				[groups]="send.groups"
				[groupSeparators]="separated()"
			>
				<ng-template slot="item" let-text="text">{{ text }}…</ng-template>
			</div>
		</span>`,
	})
	class SubmenuItemsPage {
		readonly send = SEND
		readonly separated = signal<TMenuSubmenuComponent['groupSeparators']>(undefined)
	}

	it('пункты подменю данными (items) — с группами и пробросом слотов, как у меню', async () => {
		await render(SubmenuItemsPage)

		expect(texts(subPanel())).toEqual(['Почта…', 'Ссылка…'])
		expect(node('.so-menu-group__label', subPanel()).textContent).toBe('Отправить')
	})

	/**
	 * Разделители между секциями своих пунктов подменю просит само: свойство
	 * своё, с умолчанием меню, и от меню над ним не переходит.
	 */
	it('разделители секций подменю — свои: по умолчанию есть, groupSeparators снимает их только у него', async () => {
		const fixture = await render(SubmenuItemsPage)

		// Меню своих разделителей не просит, а подменю — по своему умолчанию
		expect(subPanel().querySelectorAll('.so-menu-separator')).toHaveLength(1)

		fixture.componentInstance.separated.set(false)
		check()

		expect(subPanel().querySelector('.so-menu-separator')).toBeNull()
	})

	/**
	 * Подменю из данных: пункт `items` с вложенным `items` меню рисует
	 * `<div so-menu-submenu>` из записи коллекции (`ctrl`, `engine`), а подменю
	 * так же рисует свои — уровней сколько угодно. Модель —
	 * `core/__tests__/menu.spec.ts`, группа «коллекция меню · подменю из данных».
	 */
	describe('подменю из данных', () => {
		/**
		 * То же меню, что разметкой выше, — «Изменить · Поделиться → (Ссылка,
		 * Почта, Мессенджеры → Telegram) · Удалить», — данными, с третьим уровнем.
		 */
		const DATA: TItems = [
			{ value: 'edit', text: 'Изменить' },
			{
				value: 'share',
				text: 'Поделиться',
				items: [
					{ value: 'link', text: 'Ссылка' },
					{ value: 'mail', text: 'Почта' },
					{
						value: 'messengers',
						text: 'Мессенджеры',
						items: [{ value: 'telegram', text: 'Telegram' }],
					},
				],
			},
			{ value: 'remove', text: 'Удалить' },
		]

		/** Меню из данных этого блока — до первой отрисовки. */
		const withData = (page: ItemsPage) => page.items.set(DATA)

		/** Строка подменю по тексту — на любом уровне. */
		const submenuRow = (text: string): HTMLElement => {
			const row = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')].find(
				(candidate) => candidate.textContent?.trim().startsWith(text),
			)

			if (!row) throw new Error(`строки подменю «${text}» нет`)

			return row
		}

		it('вариант меню — у панелей подменю из данных всех уровней', async () => {
			const fixture = await render(ItemsPage, (page) => {
				withData(page)
				page.variant.set('brand')
			})

			const messengers = () => panelOf(submenuRow('Мессенджеры'))

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-brand'])

			fixture.componentInstance.variant.set('danger')
			check()

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-danger'])
		})

		it('пункт с items — подменю: строка объявляет меню, панель — его пункты, третий уровень — тоже', async () => {
			await render(ItemsPage, withData)

			const messengers = submenuRow('Мессенджеры')

			expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
			expect(shareRow().getAttribute('role')).toBe('menuitem')
			expect(shareRow().getAttribute('tabindex')).toBe('-1')
			expect(shareRow().getAttribute('aria-expanded')).toBe('false')
			expect(subPanel().getAttribute('role')).toBe('menu')
			expect(subPanel().getAttribute('aria-labelledby')).toBe(shareRow().id)
			expect(subPanel().parentElement).toBe(document.body)
			expect(shown(subPanel())).toBe(false)
			expect(texts(subPanel())).toEqual(['Ссылка', 'Почта', 'Мессенджеры'])
			// Третий уровень подменю рисует само
			expect(subPanel().contains(messengers)).toBe(true)
			expect(texts(panelOf(messengers))).toEqual(['Telegram'])
			expect(panelOf(messengers).getAttribute('aria-labelledby')).toBe(messengers.id)
		})

		it('клик по строке открывает подменю из данных, повторный его не закрывает', async () => {
			await render(ItemsPage, withData)

			await open()
			click(shareRow())

			expect(shown(subPanel())).toBe(true)
			expect(shareRow().getAttribute('aria-expanded')).toBe('true')

			click(shareRow())

			expect(shown(subPanel())).toBe(true)
		})

		it('→ открывает подменю из данных на первом пункте, ← закрывает уровень — фокус на строке', async () => {
			await render(ItemsPage, withData)

			await openOnShare()
			await press(shareRow(), 'ArrowRight')

			expect(shown(subPanel())).toBe(true)
			expect(document.activeElement).toBe(rowIn(subPanel(), 'Ссылка'))

			await press(rowIn(subPanel(), 'Ссылка'), 'ArrowLeft')

			expect(shown(subPanel())).toBe(false)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(shareRow())
		})

		it('клавиши и выбор на втором уровне: choose — корню, меню закрыто целиком, фокус — на триггер', async () => {
			const fixture = await render(ItemsPage, withData)

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowIn(subPanel(), 'Ссылка'), 'ArrowDown')

			expect(document.activeElement).toBe(rowIn(subPanel(), 'Почта'))

			await press(rowIn(subPanel(), 'Почта'), 'Enter')

			expect(fixture.componentInstance.chosen).toEqual(['mail'])
			expect(shown(rootPanel())).toBe(false)
			expect(shown(subPanel())).toBe(false)
			expect(document.activeElement).toBe(triggerNode())
		})

		it('третий уровень: → открывает его, выбор доходит до корня и закрывает все уровни', async () => {
			const fixture = await render(ItemsPage, withData)

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowIn(subPanel(), 'Ссылка'), 'End')

			const messengers = submenuRow('Мессенджеры')
			const deep = panelOf(messengers)

			expect(document.activeElement).toBe(messengers)

			await press(messengers, 'ArrowRight')

			expect(shown(deep)).toBe(true)
			expect(document.activeElement).toBe(rowIn(deep, 'Telegram'))

			await press(rowIn(deep, 'Telegram'), 'Enter')

			expect(fixture.componentInstance.chosen).toEqual(['telegram'])
			expect([shown(rootPanel()), shown(subPanel()), shown(deep)]).toEqual([
				false,
				false,
				false,
			])
			expect(document.activeElement).toBe(triggerNode())
		})

		it('патч по trackBy: строка, панель и пункты подменю — те же узлы, текст и состав — новые', async () => {
			const fixture = await render(ItemsPage, (page) => {
				withData(page)
				page.trackBy.set((item: { value?: unknown }) => item.value)
			})

			const row = shareRow()
			const panel = subPanel()
			const link = rowIn(panel, 'Ссылка')

			fixture.componentInstance.items.set([
				{ value: 'edit', text: 'Изменить' },
				{
					value: 'share',
					text: 'Отправить',
					items: [
						{ value: 'link', text: 'Ссылкой' },
						{ value: 'sms', text: 'СМС' },
					],
				},
				{ value: 'remove', text: 'Удалить' },
			])
			check()

			expect(row.isConnected).toBe(true)
			expect(row.textContent?.trim()).toBe('Отправить')
			expect(panelOf(row)).toBe(panel)
			expect(rowIn(panel, 'Ссылкой')).toBe(link)
			expect(texts(panel)).toEqual(['Ссылкой', 'СМС'])
		})

		/** Слоты пунктов из данных — шаблонами, одни на все уровни. */
		@Component({
			selector: 'probe-menu-data-slots',
			standalone: true,
			imports: BASE,
			template: `<span so-menu [items]="items">
				${TRIGGER}
				<ng-template slot="item-leading" let-item="item"
					><i class="so-test-icon" [attr.data-value]="item.value"></i
				></ng-template>
				<ng-template slot="item" let-text="text">{{ text }}…</ng-template>
				<ng-template slot="item-header" let-text="text" let-open="open">{{
					open ? text + ' ▸' : text
				}}</ng-template>
				<ng-template slot="item-arrow-icon" let-item="item"
					><b class="so-test-arrow" [attr.data-value]="item.value"></b
				></ng-template>
			</span>`,
		})
		class DataSlotsPage {
			readonly items = DATA
		}

		it('слоты пунктов из данных — одни на все уровни: значок, текст, строка и стрелка подменю', async () => {
			await render(DataSlotsPage)

			const messengers = submenuRow('Мессенджеры')
			const label = (row: HTMLElement) => node('.so-button__text', row).textContent
			const mark = (selector: string, row: HTMLElement) =>
				node(selector, row).dataset['value']

			// Действия — слот `item`, строки подменю — `item-header`, на каждом уровне
			expect(label(rowIn(rootPanel(), 'Изменить'))).toBe('Изменить…')
			expect(label(shareRow())).toBe('Поделиться')
			expect(label(rowIn(subPanel(), 'Ссылка'))).toBe('Ссылка…')
			expect(label(messengers)).toBe('Мессенджеры')
			expect(label(rowIn(panelOf(messengers), 'Telegram'))).toBe('Telegram…')
			// Значок — у строк обоих видов, стрелка — у подменю, с пунктом в scope
			expect(mark('.so-menu-item__icon .so-test-icon', rowIn(rootPanel(), 'Изменить'))).toBe(
				'edit',
			)
			expect(mark('.so-menu-item__icon .so-test-icon', shareRow())).toBe('share')
			expect(mark('.so-menu-item__icon .so-test-icon', messengers)).toBe('messengers')
			expect(mark('.so-menu-item__arrow .so-test-arrow', shareRow())).toBe('share')
			expect(mark('.so-menu-item__arrow .so-test-arrow', messengers)).toBe('messengers')
			// Своей стрелки у строки с шаблоном нет
			expect(shareRow().querySelector('.so-menu-item__arrow .so-icon')).toBeNull()

			// Строка подменю получает его открытость
			await open()
			click(shareRow())

			expect(label(shareRow())).toBe('Поделиться ▸')
			expect(label(messengers)).toBe('Мессенджеры')
		})

		/** Запись подменю из данных по значению пункта. */
		function submenuOf(engine: TMenuCollection, value: string) {
			const { batch, submenus } = engine.extensions
			const item = batch.items.find((candidate) => candidate.value === value)
			const entry = item ? submenus.entries.get(item) : undefined

			if (!entry) throw new Error(`подменю «${value}» нет`)

			return entry
		}

		const NESTED: IMenuItemSource[] = [
			{ value: 'link', text: 'Ссылка' },
			{ value: 'mail', text: 'Почта' },
		]

		/**
		 * Пункты рядом с подменю — есть ли секция без группы, в которую оно
		 * переедет, — и секции до переезда. Есть — петля по секциям оставляет её
		 * узел, а прежнюю секцию с подменю снимает; нет — снимает прежнюю и
		 * собирает новую.
		 */
		const NEIGHBOURS: ReadonlyArray<
			readonly [string, TCollectionEngineItemSource<IMenuItemSource>[], readonly string[]]
		> = [
			['секция без группы есть', [{ value: 'remove', text: 'Удалить' }], ['group:g', 'free']],
			['секции без группы нет', [], ['group:g']],
		]

		/**
		 * Подменю, переехавшее в другую секцию, Angular за одну проверку снимает
		 * с прежнего места и собирает на новом — с той же записью: тем же пунктом
		 * и тем же движком. Привязку владельца его движка держит живое
		 * монтирование: снятие прежнего привязку нового не трогает, а приём
		 * нового её забирает.
		 */
		it.each(NEIGHBOURS)(
			'переезд в другую группу, %s: владелец движка подменю на месте, размер меню — у его пунктов, выбор — до корня',
			async (_case, neighbours, before) => {
				const engine = createEngineMenu()
				const sections = () =>
					engine.extensions.group.sections.map((section) => section.key)

				engine.extensions.batch.trackBy = (item) => item.value

				const fixture = await render(ItemsPage, (page) => {
					page.engine = engine
					page.items.set([
						{ value: 'share', text: 'Поделиться', items: NESTED, _: { group: 'g' } },
						...neighbours,
					])
					page.groups.set([{ key: 'g' }])
					page.size.set('lg')
				})
				const page = fixture.componentInstance

				const share = submenuOf(engine, 'share')
				const row = shareRow()

				expect(sections()).toEqual(before)
				expect(share.engine.options.get('owner')).toBe(share.ctrl)

				// Патч снял группу: подменю переезжает в секцию без группы
				page.items.set([
					{ value: 'share', text: 'Поделиться', items: NESTED, _: { group: undefined } },
					...neighbours,
				])
				check()
				await nextFrame()
				check()

				// Перемонтировано — новые узлы, та же запись
				expect(sections()).toEqual(['free'])
				expect(row.isConnected).toBe(false)
				expect(submenuOf(engine, 'share')).toBe(share)
				expect(share.engine.options.get('owner')).toBe(share.ctrl)

				// Размер меню доходит до пунктов подменю через его владельца
				page.size.set('sm')
				check()

				expect(rowIn(subPanel(), 'Ссылка').parentElement?.classList).toContain(
					'so-menu-item--size-sm',
				)

				await open()
				click(shareRow())
				click(rowIn(subPanel(), 'Почта'))
				await nextFrame()

				expect(page.chosen).toEqual(['mail'])
				expect(shown(rootPanel())).toBe(false)
				expect(shown(subPanel())).toBe(false)
			},
		)

		/**
		 * `item-content` — панель подменю из данных шаблоном. Меню отдаёт его
		 * подменю шаблоном `default`, а выводит с инжектором места
		 * (`ngTemplateOutletInjector="outlet"`), и пункты разметки из шаблона
		 * входят в коллекцию того подменю, у которого он выведен, а не меню, где
		 * его написали.
		 * Сценарий Vue — с поправкой на непрозрачный шаблон, как у сниппета
		 * Svelte: заданный, он рисуется у каждого подменю из данных вместо его
		 * пунктов, и где ничего не нарисовал, панель пуста, — у Vue и Solid
		 * пустой слот оставляет подменю его пункты из данных.
		 */
		describe('item-content', () => {
			/** Значения пунктов коллекции по порядку. */
			const values = (engine: TMenuCollection) =>
				engine.extensions.batch.items.map((item) => item.value)

			const exportRow = () => submenuRow('Экспорт')

			/**
			 * «Поделиться» со своими пунктами и пустой «Экспорт»; шаблон снимает
			 * сигнал. Шаблон в ветке `@if` уводит в слив шаблонов `ngProjectAs`:
			 * корень ветки без него Angular проецирует в основную проекцию меню, и
			 * она сняла бы пункты из данных.
			 */
			@Component({
				selector: 'probe-menu-item-content',
				standalone: true,
				imports: [...BASE, TMenuItemComponent],
				template: `<span
					so-menu
					[items]="items"
					[engine]="engine"
					(soChoose)="chosen.push($event.value)"
				>
					${TRIGGER}
					@if (custom()) {
						<ng-template
							slot="item-content"
							ngProjectAs="ng-template[slot]"
							let-item="item"
						>
							@if (item.value === 'export') {
								<div so-menu-item value="pdf" text="PDF"></div>
								<div so-menu-item value="png" text="PNG"></div>
							}
						</ng-template>
					}
				</span>`,
			})
			class ItemContentPage {
				readonly items: TItems = [
					{ value: 'share', text: 'Поделиться', items: NESTED },
					{ value: 'export', text: 'Экспорт', items: [] },
				]
				readonly engine = createEngineMenu()
				readonly custom = signal(true)
				readonly chosen: unknown[] = []
			}

			it('пункты одного подменю разметкой, у другого — пусто: стрелки и выбор идут по пунктам шаблона', async () => {
				const fixture = await render(ItemContentPage)
				const { engine, chosen } = fixture.componentInstance

				expect(texts(subPanel())).toEqual([])
				expect(texts(panelOf(exportRow()))).toEqual(['PDF', 'PNG'])
				// Пункты шаблона — в коллекции «Экспорта», а не меню, где шаблон написан
				expect(values(engine)).toEqual(['share', 'export'])
				expect(values(submenuOf(engine, 'export').engine)).toEqual(['pdf', 'png'])

				triggerNode().focus()
				await press(triggerNode(), 'ArrowDown')
				await press(shareRow(), 'ArrowDown')
				await press(exportRow(), 'ArrowRight')

				expect(document.activeElement).toBe(rowIn(panelOf(exportRow()), 'PDF'))

				await press(rowIn(panelOf(exportRow()), 'PDF'), 'ArrowDown')
				await press(rowIn(panelOf(exportRow()), 'PNG'), 'Enter')

				expect(chosen).toEqual(['png'])
				expect(shown(rootPanel())).toBe(false)
			})

			/**
			 * Шаблон `default` подменю выбирает веткой, а не проекцией: снятый, он
			 * возвращает подменю его пункты из данных, а пункты шаблона уходят из
			 * коллекции вместе с ним.
			 */
			it('шаблон снят — подменю снова рисуют свои пункты из данных; задан снова — его пункты', async () => {
				const fixture = await render(ItemContentPage)
				const page = fixture.componentInstance
				const exported = submenuOf(page.engine, 'export').engine

				page.custom.set(false)
				check()

				expect(texts(subPanel())).toEqual(['Ссылка', 'Почта'])
				expect(texts(panelOf(exportRow()))).toEqual([])
				expect(values(exported)).toEqual([])

				page.custom.set(true)
				check()

				expect(texts(subPanel())).toEqual([])
				expect(texts(panelOf(exportRow()))).toEqual(['PDF', 'PNG'])
				expect(values(exported)).toEqual(['pdf', 'png'])
			})

			/** Пункт шаблона пишет текст из scope — из пункта подменю. */
			@Component({
				selector: 'probe-menu-item-content-scope',
				standalone: true,
				imports: [...BASE, TMenuItemComponent],
				template: `<span so-menu [items]="items" [engine]="engine">
					${TRIGGER}
					<ng-template slot="item-content" let-item="item">
						<div so-menu-item value="pdf" [text]="item.text + ' в PDF'"></div>
					</ng-template>
				</span>`,
			})
			class ItemContentScopePage {
				readonly items: TItems = [{ value: 'export', text: 'Экспорт', items: [] }]
				readonly engine = createEngineMenu()
			}

			/**
			 * Вывод пересоздаёт представление только с новым шаблоном: новое в
			 * scope — сменившийся текст пункта подменю — доходит до шаблона в
			 * тех же узлах, а его пункты остаются в коллекции подменю теми же
			 * пунктами, без выхода и нового входа.
			 */
			it('новое в scope — пункты шаблона те же узлы и те же пункты подменю', async () => {
				const fixture = await render(ItemContentScopePage)
				const exported = submenuOf(fixture.componentInstance.engine, 'export')
				const panel = panelOf(exportRow())
				const row = rowIn(panel, 'Экспорт в PDF')
				const [pdf] = exported.engine.extensions.batch.items

				exported.ctrl.text = 'Выгрузка'
				check()

				expect(texts(panel)).toEqual(['Выгрузка в PDF'])
				expect(rowIn(panel, 'Выгрузка в PDF')).toBe(row)
				expect(values(exported.engine)).toEqual(['pdf'])
				expect(exported.engine.extensions.batch.items[0]).toBe(pdf)
			})

			/**
			 * Владелец внутри шаблона — группа переключателей — своим пунктам
			 * ближе места вывода: узлы шаблона Angular спрашивает раньше места.
			 * Её ключ и саму группу переключатели берут лифтом из её слоя, а
			 * движок — из слоя подменю, у которого шаблон выведен. Это и сторож
			 * минимальной версии Angular 22.1.6: слой лифта читается со
			 * `skipSelf`, а раньше `skipSelf` в таком представлении пропускал все
			 * его узлы, и переключатели группы не видели.
			 */
			@Component({
				selector: 'probe-menu-item-content-radio',
				standalone: true,
				imports: [...BASE, ...RADIO],
				template: `<span so-menu [items]="items" [engine]="engine">
					${TRIGGER}
					<ng-template slot="item-content">
						<div
							so-menu-radio-group
							label="Сортировка"
							[value]="sort()"
							(soChangeValue)="sort.set($event.newValue)"
						>
							<div so-menu-radio-item value="name" text="По имени"></div>
							<div so-menu-radio-item value="date" text="По дате"></div>
						</div>
					</ng-template>
				</span>`,
			})
			class ItemContentRadioPage {
				readonly items: TItems = [
					{ value: 'edit', text: 'Изменить' },
					{ value: 'view', text: 'Вид', items: [] },
				]
				readonly engine = createEngineMenu()
				readonly sort = signal<TMenuRadioGroupValue>(null)
			}

			it('группа переключателей в шаблоне: ключ группы — у её переключателей, отмечен один', async () => {
				const fixture = await render(ItemContentRadioPage)
				const page = fixture.componentInstance
				const view = submenuOf(page.engine, 'view').engine
				const panel = panelOf(submenuRow('Вид'))
				const checked = () =>
					[...panel.querySelectorAll('[role="menuitemradio"]')].map((row) =>
						row.getAttribute('aria-checked'),
					)

				expect(values(page.engine)).toEqual(['edit', 'view'])
				expect(
					view.extensions.group.sections.map(({ group, items }) => [
						group === null ? null : (group.label ?? ''),
						items.map((item) => item.value),
					]),
				).toEqual([['Сортировка', ['name', 'date']]])

				await open()
				click(submenuRow('Вид'))
				click(rowIn(panel, 'По имени'))

				expect(page.sort()).toBe('name')
				expect(checked()).toEqual(['true', 'false'])

				click(rowIn(panel, 'По дате'))

				// В группе отмечен один, и переключатель меню не закрывает
				expect(page.sort()).toBe('date')
				expect(checked()).toEqual(['false', 'true'])
				expect(shown(panel)).toBe(true)
			})

			/**
			 * Подменю разметкой со своими пунктами из данных отдаёт свой
			 * `item-content` их подменю, как меню: scope — пункт следующего
			 * уровня, пункты шаблона — в коллекции того подменю.
			 */
			@Component({
				selector: 'probe-menu-submenu-item-content',
				standalone: true,
				imports: [...BASE, TMenuItemComponent, TMenuSubmenuComponent],
				template: `<span so-menu>
					${TRIGGER}
					<div
						so-menu-submenu
						value="share"
						text="Поделиться"
						[items]="items"
						[engine]="engine"
					>
						<ng-template slot="item-content" let-item="item">
							<div so-menu-item value="pdf" [text]="item.text + ' в PDF'"></div>
						</ng-template>
					</div>
				</span>`,
			})
			class SubmenuItemContentPage {
				readonly items: TMenuSubmenuComponent['items'] = [
					{ value: 'export', text: 'Экспорт', items: [] },
				]
				readonly engine = createEngineMenu()
			}

			it('подменю разметкой отдаёт свой item-content подменю из данных: scope — их пункт', async () => {
				const fixture = await render(SubmenuItemContentPage)
				const { engine } = fixture.componentInstance

				expect(texts(subPanel())).toEqual(['Экспорт'])
				expect(texts(panelOf(exportRow()))).toEqual(['Экспорт в PDF'])
				expect(values(engine)).toEqual(['export'])
				expect(values(submenuOf(engine, 'export').engine)).toEqual(['pdf'])
			})
		})
	})
})

/**
 * Пункт с панелью — `<div so-menu-popover-item>`: строка открывает сбоку
 * немодальную панель-диалог с любым содержимым. Переходы плагинов —
 * `plugins/__tests__/menu-popover-item.plugin.spec.ts`; здесь — что в Angular
 * пункт входит в коллекцию меню, связки стоят на своих узлах, панель
 * телепортирована и открывается нажатием и клавишами, фокус ходит между меню и
 * панелью, а содержимое панели меню не закрывает.
 */
describe('пункт с панелью', () => {
	/** Строка пункта с панелью — узел с ролью у пункта «Срок». */
	const dueRow = () => node('.so-menu-item > [aria-haspopup="dialog"]')

	const rootPanel = () => panelOf(triggerNode())
	const duePanel = () => panelOf(dueRow())
	const shareRow = () => node('.so-menu-item > [aria-haspopup="menu"]')

	/**
	 * Меню «Изменить · Срок → (Раньше, Позже) · Поделиться → (Ссылка)» разметкой
	 * и кнопка после него; входы пункта с панелью — сигналами, открытость — в
	 * обе стороны.
	 */
	@Component({
		selector: 'probe-menu-due',
		standalone: true,
		imports: [...BASE, TMenuItemComponent, TMenuPopoverItemComponent, TMenuSubmenuComponent],
		template: `<div>
			<span so-menu [size]="size()" (soChoose)="chosen.push($event.value)">
				${TRIGGER}
				<div so-menu-item value="edit" text="Изменить"></div>
				<div
					so-menu-popover-item
					value="due"
					text="Срок"
					[lazyMount]="lazyMount()"
					[variant]="variant()"
					[open]="dueOpen()"
					(soChangeOpen)="dueOpen.set($event)"
				>
					<button class="so-test-earlier">Раньше</button>
					<button class="so-test-later">Позже</button>
				</div>
				<div so-menu-submenu value="share" text="Поделиться">
					<div so-menu-item value="link" text="Ссылка"></div>
				</div>
			</span>
			<button class="so-test-after">После</button>
		</div>`,
	})
	class DuePage {
		readonly size = signal<TMenuComponent['size']>(undefined)
		readonly lazyMount = signal<TMenuPopoverItemComponent['lazyMount']>(undefined)
		readonly variant = signal<TMenuPopoverItemComponent['variant']>(undefined)
		readonly dueOpen = signal(false)
		readonly chosen: unknown[] = []
	}

	/** Открыть меню клавишей и спуститься на «Срок». */
	async function openOnDue(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowOf('Изменить'), 'ArrowDown')
	}

	it('строка — пункт меню, панель — диалог с именем от строки, в body и скрыта', async () => {
		await render(DuePage)

		const row = dueRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(duePanel().getAttribute('role')).toBe('dialog')
		expect(duePanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(duePanel().getAttribute('tabindex')).toBe('-1')
		expect(duePanel().classList).toContain('so-menu-item__panel')
		expect(duePanel().parentElement).toBe(document.body)
		expect(duePanel()).not.toBe(rootPanel())
		expect(shown(duePanel())).toBe(false)
		// Содержимое — в своей обёртке, без lazyMount смонтировано сразу
		expect(duePanel().querySelector('.so-menu-item__content .so-test-earlier')).not.toBeNull()
		// Стрелка у конца строки — немая: о панели говорит aria-haspopup
		expect(node('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).not.toBeNull()
		// Пункт — в коллекции меню, рядом с остальными
		expect(rows().map((candidate) => candidate.textContent?.trim())).toEqual([
			'Изменить',
			'Срок',
			'Поделиться',
		])
	})

	it('клик по строке открывает панель — фокус в ней, повторный клик её не закрывает', async () => {
		await render(DuePage)

		await open()
		click(dueRow())
		await nextFrame()

		expect(shown(duePanel())).toBe(true)
		expect(dueRow().getAttribute('aria-expanded')).toBe('true')
		expect(dueRow().parentElement?.dataset['open']).toBe('true')
		expect(document.activeElement).toBe(node('.so-test-earlier'))

		click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(rootPanel())).toBe(true)
	})

	it.each(['ArrowRight', 'Enter'])(
		'%s на строке открывает панель — фокус на её первой остановке, меню открыто',
		async (key) => {
			await render(DuePage)

			await openOnDue()

			expect(document.activeElement).toBe(dueRow())

			await press(dueRow(), key)

			expect(shown(duePanel())).toBe(true)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(node('.so-test-earlier'))
		},
	)

	it('Escape в панели закрывает её — фокус на строке; следующий Escape — меню', async () => {
		await render(DuePage)

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(node('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(dueRow())

		await press(dueRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Shift+Tab с первой остановки — на строку, Tab со строки — снова в панель', async () => {
		await render(DuePage)

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(node('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())
		expect(shown(duePanel())).toBe(true)

		await press(dueRow(), 'Tab')

		expect(document.activeElement).toBe(node('.so-test-earlier'))
	})

	it('стрелка к концу строки открытого пункта ведёт фокус в его панель', async () => {
		await render(DuePage)

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		// Фокус на строке, панель открыта — как после открытия наведением
		await press(node('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())

		const event = await press(dueRow(), 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-earlier'))
	})

	it('Tab с последней остановки закрывает всё меню и ведёт к остановке за ним', async () => {
		await render(DuePage)

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		node('.so-test-later').focus()
		await press(node('.so-test-later'), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(duePanel())).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('нажатие в содержимом панели меню не закрывает и не выбирает пункт', async () => {
		const fixture = await render(DuePage)

		await open()
		click(dueRow())
		await nextFrame()
		click(node('.so-test-later'))

		expect(shown(rootPanel())).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(fixture.componentInstance.chosen).toEqual([])
	})

	it('открыта одна панель: пункт с панелью закрывает подменю, и подменю — его', async () => {
		await render(DuePage)

		await open()
		click(shareRow())
		click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(panelOf(shareRow()))).toBe(false)

		click(shareRow())

		expect(shown(duePanel())).toBe(false)
		expect(shown(panelOf(shareRow()))).toBe(true)
	})

	it('lazyMount: содержимое — с первого открытия, закрытие его не снимает', async () => {
		await render(DuePage, (page) => page.lazyMount.set(true))

		expect(duePanel().querySelector('.so-test-earlier')).toBeNull()
		expect(duePanel().querySelector('.so-menu-item__content')).not.toBeNull()

		await open()
		click(dueRow())

		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()

		await press(node('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()
	})

	it('open входом и (soChangeOpen) — в обе стороны', async () => {
		const fixture = await render(DuePage)
		const page = fixture.componentInstance

		await openOnDue()
		await press(dueRow(), 'ArrowRight')

		expect(page.dueOpen()).toBe(true)

		page.dueOpen.set(false)
		check()

		expect(shown(duePanel())).toBe(false)
	})

	/** Слоты строки: значок проекцией, текст и стрелка — шаблонами, содержимое панели. */
	@Component({
		selector: 'probe-menu-due-slots',
		standalone: true,
		imports: [...BASE, TMenuPopoverItemComponent],
		template: `<span so-menu>
			${TRIGGER}
			<div so-menu-popover-item value="due" text="Срок">
				<i slot="leading" class="so-test-icon"></i>
				<ng-template slot="header" let-text="text" let-open="open"
					>{{ text }}: {{ open ? 'открыт' : 'закрыт' }}</ng-template
				>
				<ng-template slot="arrow-icon"><b class="so-test-arrow"></b></ng-template>
				<span class="so-test-content">Календарь</span>
			</div>
		</span>`,
	})
	class DueSlotsPage {}

	it('слоты строки: значок, свой текст со scope и своя стрелка', async () => {
		await render(DueSlotsPage)

		const row = dueRow()

		expect(row.querySelector('.so-menu-item__icon .so-test-icon')).not.toBeNull()
		expect(node('.so-button__text', row).textContent).toBe('Срок: закрыт')
		expect(row.querySelector('.so-menu-item__arrow .so-test-arrow')).not.toBeNull()
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).toBeNull()
		expect(node('.so-menu-item__content', duePanel()).textContent?.trim()).toBe('Календарь')
	})

	it('размер меню — у пункта с панелью, вариант — свой; у панели модификаторов нет', async () => {
		await render(DuePage, (page) => {
			page.size.set('lg')
			page.variant.set('danger')
		})

		const item = dueRow().parentElement

		expect(item?.classList).toContain('so-menu-item--size-lg')
		expect(item?.classList).toContain('so-menu-item--variant-danger')
		// Содержимое панели красится само: размер и вариант меню ему ни к чему
		expect([...duePanel().classList].some((cls) => cls.includes('--size-'))).toBe(false)
	})
})

describe('Angular', () => {
	/**
	 * Якорь — корень: его узел шаблону отдаёт база (`rootElement()`), а компонент
	 * свой хост взять не может. Место якоря задаёт тест — jsdom раскладку не
	 * считает: панель встаёт под корнем, в 4 px от него.
	 */
	it('якорь — корень: открытая панель встаёт под ним, в 4 px', async () => {
		await render(ItemsPage)

		vi.spyOn(node('.so-menu'), 'getBoundingClientRect').mockReturnValue(
			new DOMRect(100, 50, 80, 20),
		)

		await open()

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('100px')
		expect(panel().style.top).toBe('74px')
	})

	/**
	 * Корень Angular не снимается, а прячется, а панель увезена в `body`:
	 * `rendered` меню передаёт ей сам, иначе открытая панель осталась бы на виду
	 * без своего триггера. Снова отрисованное — панель на виду, как и была.
	 */
	it('rendered: false прячет корень и открытую панель', async () => {
		const fixture = await render(ItemsPage)
		const page = fixture.componentInstance

		await open()

		page.rendered.set(false)
		check()

		expect(node('.so-menu').style.display).toBe('none')
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
		expect(page.open()).toBe(true)

		page.rendered.set(true)
		check()

		expect(node('.so-menu').style.display).toBe('')
		expect(isOpen()).toBe(true)
	})

	/**
	 * Написанное на пункте делится, как у элемента ListBox: класс и стиль —
	 * корню пункта, где тема читает его состояние, а статика разметки — строке,
	 * где роль и фокус пункта.
	 */
	@Component({
		selector: 'probe-menu-item-attrs',
		standalone: true,
		imports: [...BASE, TMenuItemComponent],
		template: `<span so-menu>
			${TRIGGER}
			<div
				so-menu-item
				value="edit"
				text="Изменить"
				class="mine"
				style="color: red"
				title="Подсказка"
				data-probe="1"
			></div>
		</span>`,
	})
	class ItemAttrsPage {}

	it('класс и стиль — корню пункта, остальное, что написано на пункте, — строке', async () => {
		await render(ItemAttrsPage)

		const row = rowOf('Изменить')
		const item = row.parentElement

		expect(item?.classList).toContain('mine')
		expect(item?.classList).toContain('so-menu-item')
		expect(item?.style.color).toBe('red')
		expect(item?.hasAttribute('title')).toBe(false)
		expect(item?.hasAttribute('data-probe')).toBe(false)
		expect(row.getAttribute('title')).toBe('Подсказка')
		expect(row.dataset['probe']).toBe('1')
		expect(row.classList.contains('mine')).toBe(false)
		expect(row.getAttribute('role')).toBe('menuitem')
	})

	/**
	 * Классы панели — привязка `[class]` шаблона меню, а свои классы Frame
	 * пишет база: Angular ставит и снимает классы привязки по одному, а база —
	 * только свои, поэтому оба набора стоят рядом, и смена размера меняет
	 * модификатор на том же узле.
	 */
	it('классы панели — рядом с классами Frame: смена размера — новый модификатор на том же узле', async () => {
		const fixture = await render(ItemsPage, (page) => page.size.set('lg'))
		const first = panel()

		expect(first.classList).toContain('so-frame')
		expect(first.classList).toContain('so-menu__panel')
		expect(first.classList).toContain('so-menu__panel--size-lg')

		fixture.componentInstance.size.set('sm')
		check()

		expect(panel()).toBe(first)
		expect(first.classList).toContain('so-frame')
		expect(first.classList).toContain('so-menu__panel--size-sm')
		expect(first.classList).not.toContain('so-menu__panel--size-lg')

		await open()

		// Открытость панели для темы — её слой: классы Frame пишет его база
		expect(first.dataset['open']).toBe('true')
		expect(first.classList).toContain('so-menu__panel')
	})
})
