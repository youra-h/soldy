/**
 * Select под Angular — проводка целиком, на настоящей разметке.
 *
 * Юнит-тесты ядра и плагинов проверяют механизмы по отдельности; здесь важно,
 * что они сходятся: опции входят в коллекцию лифтом, панель телепортирована и
 * связана с полем, ARIA собирается в один набор. Сценарии — те же, что у Vue
 * (`select.spec`, `select-filter`, Select из `list-groups`, `list-indicator`,
 * `item-slots`, `item-control-attrs` и слот `tags` из `tags-overflow`) и React
 * (`select.spec.tsx`, группы «атрибуты» и «узлы — те же»); `v-model` Vue здесь
 * — выходы `(soChange*)`.
 *
 * Своё у Angular — разметка и цепочка хостов. Корень — сам элемент
 * компонента (`<div so-select>`), поле — `<div so-input>` в его шаблоне, а
 * оно — тоже хост, который отдаёт написанное своему `<input>`. Всё, что
 * потребитель написал на Select, кроме класса и стиля, — статика, привязки,
 * слушатели — и набор `aria` Select доходят до `<input>` поля этой цепочкой.
 * Панель — Frame в шаблоне, увезённый в `body`; опции разметки — основная
 * проекция Select, и слой лифта Select они видят там, где их написали: DI идёт
 * по дереву объявлений. Корень Angular не снимается, а прячется, поэтому
 * панель прячется по признаку поддерева Select: `rendered: false` Select
 * прячет и её. Якорь панели — корень, его узел
 * шаблону отдаёт база (`rootElement()`). Слоты со scope — шаблоны
 * (`<ng-template slot="item" let-item="item">`), и шаблон, заданный Select,
 * рисуется у каждой опции вместо своего — как сниппет у Svelte.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { Component, signal, type EventEmitter, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import {
	TSelect,
	createEngine,
	createEngineSelect,
	type ISelectItem,
	type TGroup,
	type TListContentFit,
	type TGroupSection,
	type TListIndicator,
	type TSelectCollection,
	type TSelectEditableMode,
	type TSelectPlacement,
	type TSelectValue,
	type TSelectionMode,
	type TSwipe,
} from '@soldy-ui/core'
import { TAnchorPlugin, ruRU } from '@soldy-ui/plugins'
import {
	LocaleProviderDirective,
	SlotDirective,
	TSelectComponent,
	TSelectGroupComponent,
	TSelectItemComponent,
	TTagsComponent,
	TTagsItemComponent,
} from '@soldy-ui/angular'
import { find, nextFrame } from './mount'

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<unknown> | null = null

afterEach(() => {
	current = null
	vi.restoreAllMocks()
})

/**
 * Смонтировать хост и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, и клик, клавиши и «мимо» слушаются с него.
 * `prepare` задаёт входы до первой отрисовки — так, как они стоят в разметке с
 * самого начала.
 */
async function render<T>(host: Type<T>, prepare?: (page: T) => void): Promise<ComponentFixture<T>> {
	const fixture = draw(host, prepare)

	await nextFrame()
	check()

	return fixture
}

/** Смонтировать хост без кадра — разметка первой отрисовки. */
function draw<T>(host: Type<T>, prepare?: (page: T) => void): ComponentFixture<T> {
	const fixture = TestBed.createComponent(host)

	current = fixture
	prepare?.(fixture.componentInstance)
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

/** Поле комбобокса — `<input>` внутри Select; фокус всегда на нём. */
const field = (scope: ParentNode = document) =>
	find(scope, '.so-select__field input', HTMLInputElement)

/** Корень Select — элемент потребителя. */
const root = () => find(document, '.so-select', HTMLElement)

/** Панель телепортирована в `body` — ищется по документу. */
const panel = () => find(document, '.so-select__panel', HTMLElement)

/** Открыта ли панель: она всегда в документе и скрывается через `display: none`. */
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Список панели — узел с `role="listbox"`. */
const list = () => find(document, '.so-select__list', HTMLElement)

/** Корни показанных опций: опция разметки под отбором — скрытый элемент потребителя. */
const optionRoots = () =>
	[...document.querySelectorAll<HTMLElement>('.so-select-item')].filter(
		(option) => option.style.display !== 'none',
	)

/** Строки показанных опций — носители роли, выбора и `id`. */
const options = () => optionRoots().map((option) => find(option, '[role="option"]', HTMLElement))

/** Строка опции по месту; нет её — тест падает здесь. */
function optionAt(index: number): HTMLElement {
	const option = options()[index]

	if (!option) throw new Error(`опции №${index} нет`)

	return option
}

const texts = () => options().map((option) => option.textContent?.trim())

const selection = () => options().map((option) => option.getAttribute('aria-selected'))

function click(target: HTMLElement): void {
	target.click()
	check()
}

/** Клавиша на поле — как её шлёт браузер: всплывает и отменяется. */
function press(key: string, target: Element = field()): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	target.dispatchEvent(event)
	check()

	return event
}

/** Набрать текст в поле так, как это делает пользователь. */
function type(value: string): void {
	field().value = value
	field().dispatchEvent(new Event('input', { bubbles: true }))
	check()
}

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
function pointerDown(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	check()
}

/** Открыть кликом по полю: select-only тумблит панель кликом по корню. */
async function open(): Promise<void> {
	click(field())
	await nextFrame()
	check()
}

/**
 * Options from data are drawn from the panel's first opening on: open the
 * panel with its arrow — it opens in `editable` too — and close it again. The
 * Select is closed, as before, and its options are in the document.
 */
async function openOnce(): Promise<void> {
	const arrow = find(document, '.so-select__arrow', HTMLElement)

	click(arrow)
	await nextFrame()
	click(arrow)
	await nextFrame()
	check()
}

/** Узлы сверяются по ссылке: `toEqual` сравнил бы узлы по разметке. */
function expectNodes(actual: readonly Element[], expected: readonly Element[]): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

/** Движок так, как его видит тест: состав, отбор и выбор. */
type TEngineView = {
	extensions: {
		batch: { items: ReadonlyArray<{ readonly value: unknown }> }
		filter: { query: string; fields: readonly string[]; clear(): void }
		selection: { selectedCount: number; isSelected(item: object): boolean }
	}
}

/** Движок из выхода `(soEngineCreate)`: его объявляет фасад на микрозадаче. */
async function engineOf(engines: readonly TEngineView[]): Promise<TEngineView> {
	await Promise.resolve()

	const engine = engines.at(-1)

	if (!engine) throw new Error('soEngineCreate не пришёл')

	return engine
}

type TOption = { value: string; text: string; disabled?: boolean }

/** По умолчанию — три города, «Тула» выключена, как `Select.test.vue` у Vue. */
const CITIES: readonly TOption[] = [
	{ value: 'msk', text: 'Москва' },
	{ value: 'tver', text: 'Тверь' },
	{ value: 'tula', text: 'Тула', disabled: true },
]

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
	{ value: 'd', text: 'Четвёртый' },
]

/**
 * Select с опциями разметки, имя поля «Город». Входы — сигналы: хост `OnPush`,
 * и смена входа — смена сигнала. Неопределённый сигнал — вход не задан.
 */
@Component({
	selector: 'probe-select-page',
	imports: [TSelectComponent, TSelectItemComponent],
	template: `<div
		so-select
		name="Город"
		[ctrl]="ctrl()"
		[engine]="engine()"
		[mode]="mode()"
		[value]="value()"
		[id]="id()"
		[required]="required()"
		[editable]="editable()"
		[editableMode]="editableMode()"
		[clearable]="clearable()"
		[placement]="placement()"
		[contentFit]="contentFit()"
		[indicator]="indicator()"
		[swipe]="swipe()"
		[open]="opened()"
		[rendered]="rendered()"
		(soChangeValue)="values.push($event.newValue)"
		(soChangeOpen)="opens.push($event); opened.set($event)"
		(soEngineCreate)="engines.push($event)"
	>
		@for (option of options(); track $index) {
			<div
				so-select-item
				[value]="option.value"
				[text]="option.text"
				[disabled]="option.disabled"
			></div>
		}
	</div>`,
})
class Page {
	readonly ctrl = signal<TSelect | undefined>(undefined)
	readonly engine = signal<TSelectCollection | undefined>(undefined)
	readonly mode = signal<TSelectionMode | undefined>(undefined)
	readonly value = signal<TSelectValue | undefined>(undefined)
	readonly id = signal<string | undefined>(undefined)
	readonly required = signal<boolean | undefined>(undefined)
	readonly editable = signal<boolean | undefined>(undefined)
	readonly editableMode = signal<TSelectEditableMode | undefined>(undefined)
	readonly clearable = signal<boolean | undefined>(undefined)
	readonly placement = signal<TSelectPlacement | undefined>(undefined)
	readonly contentFit = signal<TListContentFit | undefined>(undefined)
	readonly indicator = signal<TListIndicator | undefined>(undefined)
	readonly swipe = signal<TSwipe | undefined>(undefined)
	readonly opened = signal<boolean | undefined>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
	readonly options = signal<readonly TOption[]>(CITIES)
	/** Значение, которое Select сообщил выходом. */
	readonly values: unknown[] = []
	/** Открытость, которую Select сообщил выходом. */
	readonly opens: boolean[] = []
	readonly engines: TEngineView[] = []
}

/** Select из данных — опции рисует он сам. */
@Component({
	selector: 'probe-select-data',
	imports: [TSelectComponent],
	template: `<div
		so-select
		[items]="items()"
		[mode]="mode()"
		[value]="value()"
		[editable]="editable()"
		[editableMode]="editableMode()"
		[groups]="groups()"
		[groupSeparators]="groupSeparators()"
		[open]="opened()"
		(soEngineCreate)="engines.push($event)"
	></div>`,
})
class DataPage {
	readonly items = signal<readonly object[]>(ITEMS)
	readonly mode = signal<TSelectionMode | undefined>(undefined)
	readonly value = signal<TSelectValue | undefined>(undefined)
	readonly editable = signal<boolean | undefined>(undefined)
	readonly editableMode = signal<TSelectEditableMode | undefined>(undefined)
	readonly groups = signal<TGroup[] | undefined>(undefined)
	readonly groupSeparators = signal<boolean | undefined>(undefined)
	readonly opened = signal<boolean | undefined>(undefined)
	readonly engines: TEngineView[] = []
}

describe('поле', () => {
	it('объявлено как combobox и свёрнуто', () => {
		draw(Page)

		expect(field().getAttribute('role')).toBe('combobox')
		expect(field().getAttribute('aria-expanded')).toBe('false')
		expect(field().getAttribute('aria-haspopup')).toBe('listbox')
	})

	it('required пробрасывается в aria-required на combobox', () => {
		draw(Page, (page) => page.required.set(true))

		expect(field().getAttribute('aria-required')).toBe('true')
	})

	it('без required aria-required нет', () => {
		draw(Page)

		expect(field().hasAttribute('aria-required')).toBe(false)
	})

	it('select-only: поле readonly нативно, aria-readonly рядом не дублирует', () => {
		draw(Page)

		expect(field().hasAttribute('readonly')).toBe(true)
		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	it('editable: поле не readonly, aria-autocomplete="list"', () => {
		draw(Page, (page) => page.editable.set(true))

		expect(field().hasAttribute('readonly')).toBe(false)
		expect(field().getAttribute('aria-autocomplete')).toBe('list')
	})

	it('editableMode: none тоже объявляет aria-autocomplete="list"', () => {
		draw(Page, (page) => {
			page.editable.set(true)
			page.editableMode.set('none')
		})

		expect(field().getAttribute('aria-autocomplete')).toBe('list')
	})

	/**
	 * Сними панель из дерева — и закрытие вычистило бы опции из коллекции, а
	 * вместе с ними значение поля.
	 */
	it('пока закрыто, панель скрыта — но остаётся в документе', async () => {
		await render(Page)

		expect(document.querySelector('[role="listbox"]')).not.toBeNull()
		expect(isOpen()).toBe(false)
	})

	it('клик открывает панель', async () => {
		await render(Page)
		await open()

		expect(field().getAttribute('aria-expanded')).toBe('true')
		expect(isOpen()).toBe(true)
	})

	it('ссылается на список — и список этот id носит', async () => {
		await render(Page)
		await open()

		expect(field().getAttribute('aria-controls')).toBe(list().id)
		expect(list().id).not.toBe('')
	})

	it('id по умолчанию нет, заданный — доходит до поля', () => {
		const fixture = draw(Page)

		expect(field().hasAttribute('id')).toBe(false)

		fixture.componentInstance.id.set('city')
		check()

		expect(field().id).toBe('city')
	})

	it('в корне — поле, панель телепортирована', async () => {
		await render(Page)

		expect(root().firstElementChild?.classList.contains('so-select__field')).toBe(true)
		expect(root().querySelector('.so-select__panel')).toBeNull()
	})
})

describe('опции', () => {
	it('входят в коллекцию лифтом и получают роль', async () => {
		await render(Page)
		await open()

		expect(options()).toHaveLength(3)
		expect(texts()).toEqual(['Москва', 'Тверь', 'Тула'])
	})

	/**
	 * Поле ссылается на подсвеченную опцию по `id`, а стоит он на строке опции
	 * вместе со всей её ARIA: ссылка обязана находить узел с ролью.
	 */
	it('aria-activedescendant указывает на узел с role="option"', async () => {
		await render(Page)

		press('ArrowDown')
		await nextFrame()
		check()

		const id = field().getAttribute('aria-activedescendant')

		expect(id).toBeTruthy()
		expect(document.getElementById(id ?? '')?.getAttribute('role')).toBe('option')
	})

	/**
	 * Свой `id` опции — её вход: статический атрибут и привязка `[id]` пишут
	 * вход, статику база снимает с корня опции, и на строку `id` встаёт из
	 * набора опции — ссылка поля ведёт на него, узел с ним один. Раньше `id`
	 * потребителя ехал на строку статикой, и набор, который база считает своим,
	 * его стирал. Сменили у подсвеченной — строка и ссылка идут за ним.
	 */
	it('свой id опции — на строке, ссылка поля ведёт на него и идёт за его сменой', async () => {
		@Component({
			selector: 'probe-select-option-id',
			imports: [TSelectComponent, TSelectItemComponent],
			template: `<div so-select>
				<div so-select-item value="msk" text="Москва" [id]="own()"></div>
				<div so-select-item value="tver" text="Тверь" id="city-tver"></div>
			</div>`,
		})
		class OptionIdPage {
			readonly own = signal<string | undefined>('city-msk')
		}

		const fixture = await render(OptionIdPage)

		press('ArrowDown')
		await nextFrame()
		check()

		expect(optionAt(0).id).toBe('city-msk')
		expect(optionAt(1).id).toBe('city-tver')
		expect(field().getAttribute('aria-activedescendant')).toBe('city-msk')
		expect(document.querySelectorAll('[id="city-msk"]')).toHaveLength(1)
		expect(optionRoots().some((option) => option.hasAttribute('id'))).toBe(false)

		fixture.componentInstance.own.set('city-moscow')
		check()

		expect(optionAt(0).id).toBe('city-moscow')
		expect(field().getAttribute('aria-activedescendant')).toBe('city-moscow')
	})

	it('aria-selected стоит на всех, а не только на выбранной', async () => {
		await render(Page)
		await open()

		expect(options().every((option) => option.hasAttribute('aria-selected'))).toBe(true)
	})

	it('клик по опции выбирает её, закрывает панель, (soChangeValue) сообщает', async () => {
		const fixture = await render(Page)

		await open()
		click(optionAt(1))

		expect(field().value).toBe('Тверь')
		expect(field().getAttribute('aria-expanded')).toBe('false')
		expect(selection()).toEqual(['false', 'true', 'false'])
		expect(fixture.componentInstance.values).toEqual(['tver'])
	})

	it('выключенная опция кликом не выбирается', async () => {
		await render(Page)
		await open()

		click(optionAt(2))

		expect(field().value).toBe('')
		expect(selection()).toEqual(['false', 'false', 'false'])
	})

	/**
	 * Фон подсветки и выбора тема рисует на `.so-button` опции и читает
	 * `data-*` с неё: набор доезжает и до корня опции, и до её строки.
	 */
	it('состояние для темы — data-* на корне опции и на её строке, вида в разметке нет', async () => {
		await render(Page)
		await open()

		click(optionAt(0))

		const roots = optionRoots()

		expect(roots.map((option) => option.getAttribute('data-selected'))).toEqual([
			'true',
			'false',
			'false',
		])
		expect(optionAt(0).getAttribute('data-selected')).toBe('true')
		expect(optionAt(0).className).not.toMatch(/--view-/)
		expect(roots.map((option) => option.getAttribute('data-disabled'))).toEqual([
			'false',
			'false',
			'true',
		])
		expect(optionAt(2).getAttribute('data-disabled')).toBe('true')
	})

	/**
	 * Строка Select — сама опция: набор опции ложится поверх того, что кнопка
	 * пишет себе сама. Узел с ролью один — корень ничего не объявляет, строка не
	 * объявляет себя кнопкой; строка — `span` без нативного `disabled`, и
	 * `aria-disabled` у неё единственный способ сказать о выключенности, а
	 * `tabindex="-1"` выводит её из обхода.
	 */
	it('строка и есть опция: роль, id и aria-selected — на ней, корень без ARIA', async () => {
		await render(Page, (page) => page.options.set([{ value: 'a', text: 'A', disabled: true }]))

		const row = find(document, '.so-select-item .so-button', HTMLElement)
		const option = find(document, '.so-select-item', HTMLElement)

		expect(row.tagName).toBe('SPAN')
		expect(row.getAttribute('role')).toBe('option')
		expect(row.id).toMatch(/-option$/)
		expect(row.getAttribute('aria-selected')).toBe('false')
		expect(row.getAttribute('aria-disabled')).toBe('true')
		expect(row.hasAttribute('disabled')).toBe(false)
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(document.querySelectorAll('.so-select-item [role="button"]')).toHaveLength(0)

		for (const name of ['role', 'id', 'aria-selected', 'aria-disabled', 'disabled']) {
			expect(option.hasAttribute(name), name).toBe(false)
		}
	})

	it('корень опции — тег элемента, строка остаётся span', () => {
		@Component({
			selector: 'probe-select-fieldset',
			imports: [TSelectComponent, TSelectItemComponent],
			template: `<div so-select>
				<fieldset so-select-item value="a" text="A" disabled></fieldset>
			</div>`,
		})
		class FieldsetPage {}

		draw(FieldsetPage)

		const option = find(document, '.so-select-item', HTMLElement)
		const row = find(option, '.so-button', HTMLElement)

		expect(option.tagName).toBe('FIELDSET')
		expect(option.hasAttribute('disabled')).toBe(true)
		expect(row.tagName).toBe('SPAN')
		expect(row.getAttribute('aria-disabled')).toBe('true')
	})

	it('класс и стиль потребителя — корню опции, остальное — строке; клик потребителя выбора не отменяет', async () => {
		@Component({
			selector: 'probe-select-option-attrs',
			imports: [TSelectComponent, TSelectItemComponent],
			template: `<div so-select>
				<div
					so-select-item
					value="a"
					text="A"
					class="mine"
					style="color: red"
					title="Строка"
					(click)="clicks.push($event.currentTarget)"
				></div>
			</div>`,
		})
		class OptionAttrsPage {
			readonly clicks: (EventTarget | null)[] = []
		}

		const fixture = await render(OptionAttrsPage)

		await open()

		const option = find(document, '.so-select-item', HTMLElement)
		const row = find(option, '[role="option"]', HTMLElement)

		expect(option.classList.contains('mine')).toBe(true)
		expect(option.style.color).toBe('red')
		expect(row.classList.contains('mine')).toBe(false)
		expect(row.getAttribute('title')).toBe('Строка')
		expect(option.hasAttribute('title')).toBe(false)

		click(row)

		expect(fixture.componentInstance.clicks).toEqual([row])
		expect(field().value).toBe('A')
	})

	it('клик потребителя по опции — после выбора, как у ListBox; stopPropagation выбор не отменяет', async () => {
		@Component({
			selector: 'probe-select-option-click',
			imports: [TSelectComponent, TSelectItemComponent],
			template: `<div so-select (soChangeValue)="order.push('выбор')">
				<div so-select-item value="a" text="A" (click)="onClick($event)"></div>
			</div>`,
		})
		class OptionClickPage {
			readonly order: string[] = []

			onClick(event: MouseEvent): void {
				this.order.push('клик')
				event.stopPropagation()
			}
		}

		const fixture = await render(OptionClickPage)

		await open()

		click(find(document, '[role="option"]', HTMLElement))

		expect(fixture.componentInstance.order).toEqual(['выбор', 'клик'])
		expect(field().value).toBe('A')
	})
})

/**
 * Поле, его обёртки, ряд тегов и опции — те же узлы на всё монтирование:
 * открытие, выбор и отбор их не пересоздают. Фокус остаётся на поле, а узел
 * опции, на который ссылается `aria-activedescendant`, — тем же.
 */
describe('узлы — те же', () => {
	it('опции разметкой: поле и опции — те же узлы после открытия, выбора и отбора', async () => {
		await render(Page, (page) => {
			page.editable.set(true)
			page.editableMode.set('filter')
		})

		const input = field()
		const box = find(document, '.so-select__field', HTMLElement)
		const nodes = [...document.querySelectorAll('.so-select-item')]
		const before = panel()

		input.focus()
		await open()
		click(optionAt(1))

		expect(field().value).toBe('Тверь')

		await open()
		type('Мос')

		expect(texts()).toEqual(['Москва'])
		expect(field()).toBe(input)
		expect(find(document, '.so-select__field', HTMLElement)).toBe(box)
		expect(panel()).toBe(before)
		expectNodes([...document.querySelectorAll('.so-select-item')], nodes)
		expect(document.activeElement).toBe(input)
	})

	it('опции из items: поле и опции — те же узлы после открытия и выбора; отбор оставляет совпавшую', async () => {
		await render(DataPage, (page) => {
			page.editable.set(true)
			page.editableMode.set('filter')
		})

		const input = field()

		await openOnce()

		const nodes = [...document.querySelectorAll('.so-select-item')]

		expect(nodes).toHaveLength(4)

		await open()
		click(optionAt(2))
		await open()

		expect(field()).toBe(input)
		expectNodes([...document.querySelectorAll('.so-select-item')], nodes)

		type('тре')

		expect(texts()).toEqual(['Третий'])
		expect(document.querySelector('.so-select-item')).toBe(nodes[2])
		expect(field()).toBe(input)
	})

	it('multiple: теги встают в поле, а поле и ряд тегов — те же узлы', async () => {
		await render(Page, (page) => page.mode.set('multiple'))

		const input = field()
		const row = find(document, '.so-select__tags', HTMLElement)

		await open()
		click(optionAt(0))
		click(optionAt(1))

		expect(document.querySelectorAll('.so-select__tags .so-tags-item')).toHaveLength(2)
		expect(field()).toBe(input)
		expect(find(document, '.so-select__tags', HTMLElement)).toBe(row)
	})
})

/**
 * Options from data are mounted from the panel's first opening on: a closed
 * Select nobody opened is its field and an empty list. The closed field needs
 * none of their nodes — the selected text comes from the collection, and the
 * field refers to the list, which is always there. Closing only hides them.
 * Options in markup are the projection: they enter the collection only
 * mounted and are there from the start.
 */
describe('опции из данных — с первого открытия', () => {
	const CITY_ITEMS = [
		{ value: 'msk', text: 'Москва' },
		{ value: 'tver', text: 'Тверь' },
	]

	it('закрытый — текст выбранного и список с id без опций; открыли — опции есть, закрыли — те же', async () => {
		await render(DataPage, (page) => {
			page.items.set(CITY_ITEMS)
			page.value.set('tver')
		})

		expect(field().value).toBe('Тверь')
		expect(list().id).not.toBe('')
		expect(field().getAttribute('aria-controls')).toBe(list().id)
		expect(options()).toHaveLength(0)

		await open()

		const drawn = options()

		expect(isOpen()).toBe(true)
		expect(texts()).toEqual(['Москва', 'Тверь'])

		await open()

		expect(isOpen()).toBe(false)
		expectNodes(options(), drawn)
	})

	it('опции разметкой — и до первого открытия', () => {
		draw(Page)

		expect(isOpen()).toBe(false)
		expect(texts()).toEqual(['Москва', 'Тверь', 'Тула'])
	})

	it('↓ на закрытом поле открывает панель; ссылка — на подсвеченную, когда опции нарисованы', async () => {
		await render(DataPage, (page) => page.items.set(CITY_ITEMS))

		press('ArrowDown')
		await nextFrame()
		check()

		const id = field().getAttribute('aria-activedescendant') ?? ''

		expect(isOpen()).toBe(true)
		expect(id).not.toBe('')
		expect(document.getElementById(id)?.textContent?.trim()).toBe('Москва')
	})
})

/**
 * Кнопку очистки рисует поле — Input внутри Select (`.so-input__clear`):
 * `clearable` Select отдаёт полю, имя кнопке пишет плагин имён самого поля,
 * и своей кнопки у Select нет.
 */
describe('кнопка очистки', () => {
	it('без clearable её нет', () => {
		draw(Page)

		expect(document.querySelector('.so-input__clear')).toBeNull()
	})

	it('кнопка — поля, первой в его слоте у конца, перед стрелкой', () => {
		draw(Page, (page) => page.clearable.set(true))

		const slot = find(document, '.so-select__field > .so-input__trailing', HTMLElement)
		const parts = ['.so-input__clear', '.so-select__arrow']

		expect([...slot.children].map((node) => parts.find((part) => node.matches(part)))).toEqual(
			parts,
		)
		expect(document.querySelector('.so-select__clear')).toBeNull()
	})

	it('имя собрано с именем поля', () => {
		draw(Page, (page) => page.clearable.set(true))

		expect(find(document, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Clear Город',
		)
	})

	it('строку имени поле берёт от локали поддерева — через Select она не идёт', () => {
		@Component({
			selector: 'probe-select-locale',
			imports: [TSelectComponent, LocaleProviderDirective],
			template: `<div so-locale-provider [locale]="locale">
				<div so-select name="Город" clearable></div>
			</div>`,
		})
		class LocalePage {
			readonly locale = ruRU
		}

		draw(LocalePage)

		expect(find(document, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Очистить Город',
		)
	})

	it('клик сбрасывает выбранное значение и панель не открывает', async () => {
		await render(Page, (page) => page.clearable.set(true))
		await open()

		click(optionAt(1))

		expect(field().value).toBe('Тверь')
		expect(isOpen()).toBe(false)

		click(find(document, '.so-input__clear', HTMLElement))

		expect(field().value).toBe('')
		expect(selection()).toEqual(['false', 'false', 'false'])
		// Клик кнопки до корня не всплыл: select-only тумблит панель кликом по
		// корню, и очистка открыла бы её
		expect(isOpen()).toBe(false)
	})

	/**
	 * Шаблоны полю — после первой отрисовки: свой шаблон `clear` Select отдаёт
	 * полю, а оно рисует его вместо своей кнопки.
	 */
	@Component({
		selector: 'probe-select-clear',
		imports: [TSelectComponent, TSelectItemComponent, SlotDirective],
		template: `<div so-select value="tver" [clearable]="clearable">
			<div so-select-item value="msk" text="Москва"></div>
			<div so-select-item value="tver" text="Тверь"></div>
			<ng-template slot="clear" let-clear="clear">
				<button class="probe-clear" (click)="clear()"></button>
			</ng-template>
		</div>`,
	})
	class ClearPage {
		clearable = false
	}

	/**
	 * Своя кнопка вместо встроенной берёт `clear` из scope слота и зовёт его
	 * голой функцией: метод, оторванный от поля, не падает.
	 */
	it('своя кнопка в слоте clear снимает выбор функцией из scope', async () => {
		await render(ClearPage)

		expect(field().value).toBe('Тверь')
		expect(selection()).toEqual(['false', 'true'])

		click(find(document, '.probe-clear', HTMLElement))

		expect(field().value).toBe('')
		expect(selection()).toEqual(['false', 'false'])
	})

	/** Шаблон Select уходит полю: своя кнопка встаёт на место встроенной и при `clearable`. */
	it('своя кнопка заменяет встроенную целиком и стоит на её месте', () => {
		draw(ClearPage, (page) => {
			page.clearable = true
		})

		expect(document.querySelector('.so-input__clear')).toBeNull()
		expect(
			document.querySelector('.so-select__field .so-input__trailing > .probe-clear'),
		).not.toBeNull()
	})
})

describe('множественный выбор', () => {
	it('список помечен как multiselectable, в одиночном режиме пометки нет', async () => {
		const fixture = await render(Page, (page) => page.mode.set('multiple'))

		expect(list().getAttribute('aria-multiselectable')).toBe('true')

		fixture.componentInstance.mode.set('single')
		check()

		expect(list().hasAttribute('aria-multiselectable')).toBe(false)
	})

	/**
	 * Теги — второй компонент внутри поля (`TSelectTagsExtension`), а не
	 * разметка: связка «опция ⇄ тег» иначе повторилась бы в шести адаптерах.
	 */
	it('выбор рисует тег в поле, а не текст', async () => {
		await render(Page, (page) => page.mode.set('multiple'))
		await open()

		click(optionAt(0))

		expect(field().value).toBe('')

		const tags = document.querySelectorAll('.so-select__tags .so-tags-item')

		expect(tags).toHaveLength(1)
		expect(tags[0]?.textContent).toContain('Москва')
	})

	it('закрытие тега снимает выбор с опции и панель не открывает', async () => {
		await render(Page, (page) => page.mode.set('multiple'))
		await open()

		click(optionAt(0))
		pointerDown(document.body)
		await nextFrame()
		check()

		expect(isOpen()).toBe(false)

		click(find(document, '.so-tags-item__close', HTMLElement))

		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(0)
		expect(optionAt(0).getAttribute('aria-selected')).toBe('false')
		// Клик крестика до корня Select не всплыл: select-only открыл бы панель
		expect(isOpen()).toBe(false)
	})

	it('в single тегов в поле нет', () => {
		draw(Page)

		expect(document.querySelector('.so-select__tags')).toBeNull()
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(0)
	})

	/**
	 * Инстанс тегов живёт только в `multiple`: смена режима заводит новый или
	 * снимает прежний, и ряд в поле встаёт и уходит вслед за ним, а поле — тот
	 * же узел.
	 */
	it('режим на лету: multiple — ряд тегов в поле, single — ряда нет, поле то же', async () => {
		const fixture = await render(Page, (page) => page.mode.set('multiple'))
		const input = field()

		await open()
		click(optionAt(0))

		expect(document.querySelectorAll('.so-select__tags .so-tags-item')).toHaveLength(1)

		fixture.componentInstance.mode.set('single')
		check()

		expect(document.querySelector('.so-select__tags')).toBeNull()

		fixture.componentInstance.mode.set('multiple')
		check()

		expect(document.querySelector('.so-select__tags')).not.toBeNull()
		expect(field()).toBe(input)
	})

	/**
	 * Литерал массива в `value` Angular держит одним объектом, пока не сменились
	 * переменные в нём (чистая функция шаблона): страница, перепроверенная по
	 * своему поводу, вход не пишет, и снятый пользователем выбор не возвращается.
	 */
	@Component({
		selector: 'probe-select-literal',
		imports: [TSelectComponent, TSelectItemComponent],
		template: `<span>{{ tick() }}</span>
			<div so-select mode="multiple" [value]="['msk', second()]">
				<div so-select-item value="msk" text="Москва"></div>
				<div so-select-item value="tver" text="Тверь"></div>
			</div>`,
	})
	class LiteralPage {
		readonly tick = signal(0)
		readonly second = signal('tver')
	}

	it('литерал массива в value не откатывает выбор, когда страница перепроверена', async () => {
		const fixture = await render(LiteralPage)

		expect(selection()).toEqual(['true', 'true'])

		await open()
		click(optionAt(1))

		expect(selection()).toEqual(['true', 'false'])

		// Страница перепроверилась по своему поводу — литерал тот же
		fixture.componentInstance.tick.set(1)
		check()

		expect(find(fixture.nativeElement, 'span', HTMLSpanElement).textContent).toBe('1')
		expect(selection()).toEqual(['true', 'false'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(1)
	})

	/** Чужому движку фасад умолчание не пишет: режим переполнения остаётся движка. */
	it('движок снаружи сохраняет режим переполнения тегов', async () => {
		const engine = createEngineSelect()

		engine.extensions.selection.mode = 'multiple'
		engine.extensions.tags.overflow = 'scroll'

		await render(Page, (page) => {
			page.engine.set(engine)
			page.options.set([{ value: 'msk', text: 'Москва' }])
		})

		expect(engine.extensions.tags.overflow).toBe('scroll')
		expect(document.querySelector('.so-select__tags')?.getAttribute('data-overflow')).toBe(
			'scroll',
		)
	})

	/**
	 * Без выбора у строк тегов нет действия: ни остановки, ни фокуса от клика им
	 * не нужно, и `tabindex` у них нет, крестик — нативная остановка. Так и в
	 * поле Select: набор тегов там без выбора.
	 */
	it('теги в поле — без выбора: у строк tabindex нет, крестик — нативная остановка', async () => {
		await render(Page, (page) => {
			page.mode.set('multiple')
			page.value.set(['msk', 'tver'])
			page.options.set(CITIES.slice(0, 2))
		})

		const rows = [
			...document.querySelectorAll('.so-select__tags .so-tags-item > .so-button:first-child'),
		]

		expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual([null, null])
		expect(rows.map((row) => row.getAttribute('role'))).toEqual(['listitem', 'listitem'])
		expect(
			document
				.querySelector('.so-select__tags .so-tags-item__close')
				?.hasAttribute('tabindex'),
		).toBe(false)
	})
})

/**
 * Шаблон слота `tags` получает инстанс тегов и его коллекцию — то, что
 * встроенный ряд берёт `[ctrl]` и `[engine]`. Свой ряд получает связку «опция
 * ⇄ тег» готовой и заменяет встроенный: теги не рисуются дважды. Теги своей
 * раскладки входят в коллекцию своего набора — DI идёт по дереву объявлений.
 */
describe('слот tags', () => {
	@Component({
		selector: 'probe-select-own-tags',
		imports: [
			TSelectComponent,
			TSelectItemComponent,
			TTagsComponent,
			TTagsItemComponent,
			SlotDirective,
		],
		template: `<div
			so-select
			[mode]="mode"
			[value]="value"
			(soChangeValue)="values.push($event.newValue)"
		>
			<ng-template slot="tags" let-tags="tags" let-engine="engine">
				<div so-tags class="own-tags" [ctrl]="tags" [engine]="engine">
					<ng-template slot="default" let-shown="shown">
						<div class="own">
							@for (tag of shown; track tag.uid) {
								<div so-tags-item [ctrl]="tag"></div>
							}
						</div>
					</ng-template>
				</div>
			</ng-template>
			<div so-select-item value="msk" text="Москва"></div>
			<div so-select-item value="tver" text="Тверь"></div>
		</div>`,
	})
	class OwnTagsPage {
		mode: TSelectionMode = 'multiple'
		value: TSelectValue = ['msk', 'tver']
		readonly values: unknown[] = []
	}

	const own = () => find(document, '.own', HTMLElement)
	const ownTexts = () =>
		[...own().querySelectorAll('.so-tags-item')]
			.filter((node) => node instanceof HTMLElement && node.style.display !== 'none')
			.map((node) => node.textContent?.trim())

	it('свой ряд встаёт на место встроенного и получает выбранное тегами', () => {
		draw(OwnTagsPage)

		expect(document.querySelector('.so-select__tags')).toBeNull()
		expect(find(document, '.so-select__field .own-tags', HTMLElement).contains(own())).toBe(
			true,
		)
		expect(ownTexts()).toEqual(['Москва', 'Тверь'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(2)
	})

	it('закрытый в своём ряду тег снимает выбор опции', async () => {
		const fixture = await render(OwnTagsPage)

		click(find(own(), '.so-tags-item:first-child .so-tags-item__close', HTMLElement))

		expect(ownTexts()).toEqual(['Тверь'])
		expect(fixture.componentInstance.values.at(-1)).toEqual(['tver'])
	})

	it('без множественного выбора слота нет: тегов в поле не бывает', () => {
		draw(OwnTagsPage, (page) => {
			page.mode = 'single'
			page.value = 'msk'
		})

		expect(document.querySelector('.own-tags')).toBeNull()
	})
})

describe('панель как телепортированный Frame', () => {
	it('класс и пометка владельцем доезжают до узла в body', async () => {
		const fixture = await render(Page)
		const host: HTMLElement = fixture.nativeElement

		expect(panel().parentElement).toBe(document.body)
		expect(panel().hasAttribute('data-owner')).toBe(true)
		expect(host.querySelector('.so-select__panel')).toBeNull()
	})

	it('нажатие внутрь панели её не закрывает', async () => {
		await render(Page)
		await open()

		pointerDown(optionAt(0))

		expect(isOpen()).toBe(true)
	})

	it('нажатие мимо закрывает', async () => {
		await render(Page)
		await open()

		pointerDown(document.body)

		expect(isOpen()).toBe(false)
	})

	it('корень несёт data-open для темы, aria-expanded — у поля, а не у корня', async () => {
		await render(Page)

		expect(root().getAttribute('data-open')).toBe('false')
		expect(root().hasAttribute('aria-expanded')).toBe(false)

		click(root())

		expect(root().getAttribute('data-open')).toBe('true')
		expect(field().getAttribute('aria-expanded')).toBe('true')
	})

	/** Frame по умолчанию не навязывает панели пиксельную высоту. */
	it('панель без инлайнового height в пикселях, высота списка — за темой', async () => {
		await render(Page)
		await nextFrame()

		expect(panel().style.height).toBe('auto')
		expect(list().style.maxHeight).toBe('')
	})

	/**
	 * Якорь — корень, его узел шаблону отдаёт база: открытая панель встаёт
	 * под корнем, в 4 px от него.
	 */
	it('якорь — корень: открытая панель встаёт под ним, в 4 px', async () => {
		await render(Page)

		vi.spyOn(root(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 200, 32))

		await open()

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('100px')
		expect(panel().style.top).toBe('86px')
	})

	/**
	 * Корень Angular не снимается, а прячется, а панель увезена в `body`: Frame
	 * в шаблоне Select прячет её по признаку поддерева Select, иначе открытая
	 * панель осталась бы на виду без своего поля. Снова отрисованный — панель
	 * на виду, как и была.
	 */
	it('rendered: false прячет корень и открытую панель', async () => {
		const fixture = await render(Page)

		await open()

		fixture.componentInstance.rendered.set(false)
		check()

		expect(root().style.display).toBe('none')
		expect(isOpen()).toBe(false)

		fixture.componentInstance.rendered.set(true)
		check()

		expect(root().style.display).toBe('')
		expect(isOpen()).toBe(true)
	})
})

describe('слоты поля', () => {
	@Component({
		selector: 'probe-select-edges',
		imports: [TSelectComponent],
		template: `<div so-select [clearable]="clearable">
			<i slot="leading" class="probe-leading"></i>
			<i slot="trailing" class="probe-trailing"></i>
		</div>`,
	})
	class EdgesPage {
		clearable = false
	}

	it('leading и trailing пробрасываются в Input', () => {
		draw(EdgesPage)

		expect(document.querySelector('.so-input__leading .probe-leading')).not.toBeNull()
		expect(document.querySelector('.so-input__trailing .probe-trailing')).not.toBeNull()
	})

	/** Края поля Select отдаёт всегда, как Vue свои шаблоны: обёртки стоят и без тегов. */
	it('обёртки поля по сторонам — и в single без слотов', () => {
		draw(Page)

		expect(document.querySelector('.so-select__field > .so-input__leading')).not.toBeNull()
		expect(
			document.querySelector('.so-select__field > .so-input__trailing > .so-select__arrow'),
		).not.toBeNull()
	})

	/**
	 * Класс на обёртке, а не на иконке: иначе поворот при открытии молча
	 * перестал бы работать для своей иконки.
	 */
	it('стрелка заменяется через arrow-icon и остаётся внутри носителя состояния', () => {
		@Component({
			selector: 'probe-select-arrow',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select>
				<ng-template slot="arrow-icon"><i class="probe-arrow"></i></ng-template>
			</div>`,
		})
		class ArrowPage {}

		draw(ArrowPage)

		expect(document.querySelector('.so-select__arrow .probe-arrow')).not.toBeNull()
		expect(document.querySelector('.so-select__arrow svg')).toBeNull()
	})

	it('trailing дополняет кнопку очистки и стрелку, а не заменяет их', () => {
		draw(EdgesPage, (page) => {
			page.clearable = true
		})

		expect(document.querySelector('.so-input__clear')).not.toBeNull()
		expect(document.querySelector('.so-select__arrow')).not.toBeNull()
		expect(document.querySelector('.probe-trailing')).not.toBeNull()
	})

	/**
	 * Своё поле — шаблон `field`: он заменяет встроенное поле и получает в scope
	 * экземпляр `TInput`, которым владеет Select, — с набором комбобокса.
	 */
	it('переопределённый field получает экземпляр TInput с role combobox в aria', () => {
		@Component({
			selector: 'probe-select-field',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select>
				<ng-template slot="field" let-field="field">
					<div class="probe-field">{{ field.aria.get('role') }}</div>
				</ng-template>
			</div>`,
		})
		class FieldPage {}

		draw(FieldPage)

		expect(find(document, '.probe-field', HTMLElement).textContent).toBe('combobox')
		expect(document.querySelector('.so-select__field')).toBeNull()
	})
})

/**
 * Атрибуты потребителя делятся, как у поля: класс и стиль — корню, остальное
 * — `<input>` поля, поверх набора комбобокса. Поле — само хост, и цепочка
 * хостов доводит до `<input>` статику, привязки и слушатели, и набор `aria`
 * Select — имя из `aria_label` — туда же.
 */
describe('атрибуты', () => {
	@Component({
		selector: 'probe-select-attrs',
		imports: [TSelectComponent],
		template: `<div
			so-select
			class="mine"
			style="color: red"
			aria-label="Город доставки"
			title="Подсказка"
			data-probe="yes"
			[attr.data-bound]="bound()"
			(keyup)="targets.push($event.currentTarget)"
		></div>`,
	})
	class AttrsPage {
		readonly bound = signal<string | null>('a')
		readonly targets: (EventTarget | null)[] = []
	}

	it('aria-label, title и data-* потребителя — на поле, класс и стиль — на корне', () => {
		draw(AttrsPage)

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().style.color).toBe('red')
		expect(field().getAttribute('aria-label')).toBe('Город доставки')
		expect(field().getAttribute('title')).toBe('Подсказка')
		expect(field().getAttribute('data-probe')).toBe('yes')
		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().hasAttribute('title')).toBe(false)
		expect(field().hasAttribute('class')).toBe(false)
		// До поля Select — `<div so-input>` — написанное не задерживается
		const box = find(document, '.so-select__field', HTMLElement)

		for (const name of ['aria-label', 'title', 'data-probe']) {
			expect(box.hasAttribute(name), name).toBe(false)
		}
	})

	it('[attr.x] — на поле: смена доходит, null снимает', () => {
		const fixture = draw(AttrsPage)

		expect(field().getAttribute('data-bound')).toBe('a')

		fixture.componentInstance.bound.set('b')
		check()

		expect(field().getAttribute('data-bound')).toBe('b')

		fixture.componentInstance.bound.set(null)
		check()

		expect(field().hasAttribute('data-bound')).toBe(false)
		expect(root().hasAttribute('data-bound')).toBe(false)
	})

	it('слушатель потребителя — на поле', () => {
		const fixture = draw(AttrsPage)

		field().dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }))

		expect(fixture.componentInstance.targets).toEqual([field()])
	})

	/** Имя комбобокса из `aria_label` Select — набор Select, и он тоже на поле. */
	it('aria_label Select — имя поля, а не корня', () => {
		@Component({
			selector: 'probe-select-name',
			imports: [TSelectComponent],
			template: `<div so-select aria_label="Город"></div>`,
		})
		class NamePage {}

		draw(NamePage)

		expect(field().getAttribute('aria-label')).toBe('Город')
		expect(root().hasAttribute('aria-label')).toBe(false)
	})

	/**
	 * Входы фасада — `mode`, `items`, `engine` — съедает связка фасада, и
	 * атрибутами в DOM они не уходят.
	 */
	it('входы фасада — не атрибуты', () => {
		@Component({
			selector: 'probe-select-facade',
			imports: [TSelectComponent],
			template: `<div so-select mode="multiple" [items]="items" [engine]="engine"></div>`,
		})
		class FacadePage {
			readonly items = ITEMS
			readonly engine = createEngineSelect()
		}

		draw(FacadePage)

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(field().hasAttribute(name), name).toBe(false)
		}
	})
})

/**
 * Списочные свойства Select — та же тройка, что у ListBox: вход доезжает до DOM
 * панели и опций.
 */
describe('списочные свойства', () => {
	it('contentFit доезжает до data-content-fit каждой опции, по умолчанию — truncate', async () => {
		const fixture = await render(Page, (page) => page.contentFit.set('wrap'))

		expect(options().map((option) => option.getAttribute('data-content-fit'))).toEqual([
			'wrap',
			'wrap',
			'wrap',
		])

		fixture.componentInstance.contentFit.set(undefined)
		check()

		expect(optionAt(0).getAttribute('data-content-fit')).toBe('truncate')
	})
})

/**
 * `placement` и `contentFit` Select доходят до плагина якоря вложенного Frame:
 * сторону и ширину считает он. Ядро переводит выбор в `panelPlacement`,
 * `panelFlip` и `autoFitWidth`, разметка только пробрасывает их.
 */
describe('плагин якоря панели', () => {
	/** Плагины якоря, которые поставил Frame панели, — по их `install`. */
	function anchorProbe(): () => TAnchorPlugin {
		const install = vi.spyOn(TAnchorPlugin.prototype, 'install')

		return () => {
			const [plugin] = install.mock.contexts

			if (!(plugin instanceof TAnchorPlugin)) throw new Error('плагина якоря нет')

			return plugin
		}
	}

	it('по умолчанию bottom-start, flip включён, ширина — по полю', async () => {
		const plugin = anchorProbe()

		await render(Page)

		expect(plugin().placement).toBe('bottom-start')
		expect(plugin().flip).toBe(true)
		expect(plugin().matchWidth).toBe(true)
		expect(plugin().offset).toBe(4)
	})

	it('contentFit="expand" отвязывает ширину панели от поля', async () => {
		const plugin = anchorProbe()

		await render(Page, (page) => page.contentFit.set('expand'))

		expect(plugin().matchWidth).toBe(false)
	})

	it('смена placement на лету доходит до плагина', async () => {
		const plugin = anchorProbe()
		const fixture = await render(Page, (page) => page.placement.set('top'))

		const steps: [TSelectPlacement, string, boolean][] = [
			['bottom', 'bottom-start', false],
			['auto', 'bottom-start', true],
			['top', 'top-start', false],
		]

		expect(plugin().placement).toBe('top-start')
		expect(plugin().flip).toBe(false)

		for (const [placement, side, flip] of steps) {
			fixture.componentInstance.placement.set(placement)
			check()

			expect(plugin().placement, placement).toBe(side)
			expect(plugin().flip, placement).toBe(flip)
		}
	})

	it('якорь панели — корень Select', async () => {
		const plugin = anchorProbe()

		await render(Page)

		expect(plugin().anchor).toBe(root())
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин,
 * раскладку и настоящую мышь — браузер. Здесь — проводка: полоса и признак
 * «тянут» на телепортированной панели, а закрытие жестом доходит до
 * `(soChangeOpen)`.
 */
describe('жест', () => {
	const handle = () => document.querySelector('.so-select__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	function pointer(kind: string, target: Element, y: number): void {
		target.dispatchEvent(
			new PointerEvent(kind, {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: y,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				isPrimary: true,
			}),
		)
		check()
	}

	it('без жеста полосы нет; с жестом — первая в панели, вне списка и немая для скринридера', async () => {
		const ctrl = new TSelect()

		await render(Page, (page) => page.ctrl.set(ctrl))

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')

		ctrl.swipe = 'handle'
		check()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
		expect(handle()?.closest('[role="listbox"]')).toBeNull()

		ctrl.swipe = 'panel'
		check()

		expect(handle()).not.toBeNull()
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после
	 * flip плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по
	 * полосе вниз — дальше четверти высоты панели. Открытость — состояние
	 * страницы: смена приходит выходом `(soChangeOpen)`.
	 */
	it('смахнули вниз от поля — закрыта, (soChangeOpen) видит закрытие, признак «тянут» на панели', async () => {
		const fixture = await render(Page, (page) => {
			page.swipe.set('handle')
			page.options.set(CITIES.slice(0, 1))
		})

		await open()

		expect(isOpen()).toBe(true)
		expect(panel().dataset['placement']).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 160))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 125)

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('80px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 130)

		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
		expect(fixture.componentInstance.opens).toEqual([true, false])
	})
})

/**
 * Отбор: скрытая опция уходит из разметки и при этом остаётся в коллекции —
 * составом владеют данные, а не разметка.
 */
describe('отбор опций из items', () => {
	async function renderSelect(prepare?: (page: DataPage) => void) {
		const fixture = await render(DataPage, prepare)
		const engine = await engineOf(fixture.componentInstance.engines)

		await openOnce()

		return engine
	}

	/** Запрос отбора из кода: он перерисовывает список. */
	function query(engine: TEngineView, text: string): void {
		engine.extensions.filter.query = text
		check()
	}

	it('сужает список на экране, хранилище не трогает', async () => {
		const engine = await renderSelect()

		expect(options()).toHaveLength(4)

		query(engine, 'тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('снятие отбора возвращает весь список', async () => {
		const engine = await renderSelect()

		query(engine, 'тре')
		engine.extensions.filter.clear()
		check()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('отбор по тексту, а не по значению — поле сравнения ставит Select', async () => {
		const engine = await renderSelect()

		expect(options()).toHaveLength(4)
		expect(engine.extensions.filter.fields).toEqual(['text'])

		// 'a' — это value первой опции, но по значению не ищем
		query(engine, 'a')

		expect(options()).toHaveLength(0)
	})

	it('пустой отбор показывает слот empty внутри списка', async () => {
		@Component({
			selector: 'probe-select-empty',
			imports: [TSelectComponent],
			template: `<div so-select [items]="items" (soEngineCreate)="engines.push($event)">
				<p slot="empty" class="probe-empty">Пусто</p>
			</div>`,
		})
		class EmptyPage {
			readonly items = ITEMS
			readonly engines: TEngineView[] = []
		}

		const fixture = await render(EmptyPage)
		const engine = await engineOf(fixture.componentInstance.engines)

		await openOnce()

		expect(options()).toHaveLength(4)
		expect(document.querySelector('.probe-empty')).toBeNull()

		query(engine, 'ничего такого нет')

		expect(options()).toHaveLength(0)
		expect(find(document, '.probe-empty', HTMLElement).parentElement).toBe(list())
	})

	it('выбор скрытой опции не теряется', async () => {
		const engine = await renderSelect((page) => page.value.set('a'))

		query(engine, 'тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.clear()
		check()

		const selected = engine.extensions.batch.items.filter((item) =>
			engine.extensions.selection.isSelected(item),
		)

		expect(selected.map((item) => item.value)).toEqual(['a'])
	})
})

/**
 * Ввод в поле — та же механика, только запрос приходит от пользователя:
 * `TEditablePlugin` слушает вложенный `<input>` и пишет `filter.query` сам.
 */
describe('ввод в поле', () => {
	async function renderSelect(prepare?: (page: DataPage) => void) {
		const fixture = await render(DataPage, prepare)

		return engineOf(fixture.componentInstance.engines)
	}

	it('editableMode: filter — набранное сужает список', async () => {
		const engine = await renderSelect((page) => {
			page.editable.set(true)
			page.editableMode.set('filter')
		})

		type('тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.filter.query).toBe('тре')
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('editableMode: search — список остаётся целым', async () => {
		const engine = await renderSelect((page) => {
			page.editable.set(true)
			page.editableMode.set('search')
		})

		type('тре')

		expect(options()).toHaveLength(4)
		expect(engine.extensions.filter.query).toBe('')
	})

	it('без editable ввод не слушается вовсе', async () => {
		const engine = await renderSelect((page) => page.editableMode.set('filter'))

		await openOnce()
		type('тре')

		expect(engine.extensions.filter.query).toBe('')
		expect(options()).toHaveLength(4)
	})

	/**
	 * Двойной Escape: первый закрывает панель и набранное не трогает, второй —
	 * уже на закрытой панели — возвращает поле. Отбор возврат снимает, когда
	 * закрытая панель догасла: переходов jsdom не ведёт, и ожидание кончается
	 * кадром позже; поле возвращается сразу.
	 */
	it('первый Escape закрывает панель, второй — возвращает текст и снимает отбор', async () => {
		const engine = await renderSelect((page) => {
			page.editable.set(true)
			page.editableMode.set('filter')
			page.value.set('a')
		})

		type('тре')

		expect(texts()).toEqual(['Третий'])

		press('Escape')

		expect(engine.extensions.filter.query).toBe('тре')
		expect(field().value).toBe('тре')

		press('Escape')

		expect(field().value).toBe('Первый')
		expect(engine.extensions.filter.query).toBe('тре')

		await nextFrame()
		check()

		expect(engine.extensions.filter.query).toBe('')
		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect(field().value).toBe('Первый')
	})

	it('несовпавший текст, Esc, Esc, ↓ — поле остаётся пустым', async () => {
		await renderSelect((page) => page.editable.set(true))

		type('несуществующий текст')
		press('Escape')
		press('Escape')

		expect(field().value).toBe('')

		press('ArrowDown')

		expect(field().value).toBe('')
	})

	it('multiple: Enter добавляет тег и очищает поле, включая перерисовку', async () => {
		await renderSelect((page) => {
			page.editable.set(true)
			page.mode.set('multiple')
		})

		type('Пер')
		press('Enter')

		expect(field().value).toBe('')
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(1)
	})

	it('single: Enter на уже выбранной опции возвращает её текст в поле', async () => {
		const engine = await renderSelect((page) => {
			page.editable.set(true)
			page.value.set('c')
		})

		expect(field().value).toBe('Третий')

		type('Тре')
		press('Enter')

		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect(field().value).toBe('Третий')
	})
})

/**
 * Опции разметкой: состав списка принадлежит содержимому, перебрать его
 * коллекция не может, и отбор доезжает до таких опций через их собственный
 * `visible` (`TSelectExtension`): корень опции прячется.
 */
describe('опции разметки под отбором', () => {
	async function renderMarkup(prepare?: (page: Page) => void) {
		const fixture = await render(Page, (page) => {
			page.options.set(ITEMS)
			prepare?.(page)
		})

		return engineOf(fixture.componentInstance.engines)
	}

	it('отбор из кода прячет несовпавшие опции, из коллекции они не уходят', async () => {
		const engine = await renderMarkup()

		expect(texts()).toHaveLength(4)

		engine.extensions.filter.query = 'вто'
		check()

		expect(texts()).toEqual(['Второй'])
		expect(engine.extensions.batch.items).toHaveLength(4)

		engine.extensions.filter.clear()
		check()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('ввод в поле прячет несовпавшие опции', async () => {
		const engine = await renderMarkup((page) => {
			page.editable.set(true)
			page.editableMode.set('filter')
		})

		type('вто')

		expect(engine.extensions.filter.query).toBe('вто')
		expect(texts()).toEqual(['Второй'])
	})
})

// Options from data are drawn from the panel's first opening on: the panel is
// open from the start
describe('готовая коллекция', () => {
	@Component({
		selector: 'probe-select-engine',
		imports: [TSelectComponent],
		template: `<div so-select [engine]="engine" [items]="items" open></div>`,
	})
	class EnginePage {
		engine = createEngine<{ value: string; text: string }>()
		items: readonly { value: string; text: string }[] | undefined = undefined
	}

	it('рисует опции движка уровня 1, добавленное в него — тоже', () => {
		const engine = createEngine<{ value: string; text: string }>({ items: ITEMS.slice(0, 2) })

		draw(EnginePage, (page) => {
			page.engine = engine
		})

		expect(options()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		check()

		expect(options()).toHaveLength(3)
	})

	/**
	 * Фасад собирается из тех же входов, и `items` он уже записал: связка, получив
	 * те же входы, второй раз их не пишет.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<{ value: string; text: string }>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		draw(EnginePage, (page) => {
			page.engine = engine
			page.items = ITEMS
		})

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(options()).toHaveLength(ITEMS.length)
	})
})

/**
 * `indicator` — отметка выбранной опции: сторона одна на весь список, опция
 * читает её у Select.
 */
describe('отметка выбранной опции', () => {
	const marked = () =>
		options().map((option) => option.querySelector('.so-select-item__indicator svg') !== null)

	it('без indicator обёртки нет', () => {
		draw(Page)

		expect(document.querySelectorAll('.so-select-item__indicator')).toHaveLength(0)
	})

	it('обёртка у каждой опции, иконка — у выбранной, обёртка немая', async () => {
		await render(Page, (page) => page.indicator.set('start'))

		expect(document.querySelectorAll('.so-select-item__indicator')).toHaveLength(3)
		expect(marked()).toEqual([false, false, false])
		expect(
			document.querySelector('.so-select-item__indicator')?.getAttribute('aria-hidden'),
		).toBe('true')

		await open()
		click(optionAt(1))

		expect(marked()).toEqual([false, true, false])
	})

	it('end уносит отметку в конец строки, start — в начало; смена — на лету', () => {
		/** Сторона отметки относительно текста строки. */
		const sideOf = (option: Element) => {
			const parts = [
				...option.querySelectorAll('.so-select-item__indicator, .so-button__text'),
			]

			return parts[0]?.classList.contains('so-select-item__indicator') ? 'start' : 'end'
		}
		const fixture = draw(Page, (page) => page.indicator.set('end'))

		expect(sideOf(optionAt(0))).toBe('end')

		fixture.componentInstance.indicator.set('start')
		check()

		expect(sideOf(optionAt(0))).toBe('start')
	})
})

/**
 * Проброс целиком: у каждого слота опции есть `item-<слот>`, и его scope —
 * scope слота опции плюс сама опция. Шаблон непрозрачен: заданный Select, он
 * рисуется у каждой опции вместо своего, как сниппет у Svelte.
 */
describe('слоты опций', () => {
	const TWO = ITEMS.slice(0, 2)

	// Options from data are drawn from the panel's first opening on: the panel
	// is open from the start

	it('item получает text и selected опции, selected следует за выбором', async () => {
		@Component({
			selector: 'probe-select-item-slot',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select [items]="items" open>
				<ng-template slot="item" let-item="item" let-text="text" let-selected="selected"
					>{{ item.value }}:{{ text }}:{{ selected }}</ng-template
				>
			</div>`,
		})
		class ItemSlotPage {
			readonly items = TWO
		}

		await render(ItemSlotPage)

		expect(texts()).toEqual(['a:Первый:false', 'b:Второй:false'])

		click(optionAt(1))

		expect(texts()).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	/**
	 * Новый контекст вывод шаблона отдаёт тому же представлению: узлы слота
	 * переживают выбор, а текст в них новый.
	 */
	it('item, читающий scope в разметке, — те же узлы после выбора', async () => {
		@Component({
			selector: 'probe-select-item-nodes',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select [items]="items" open>
				<ng-template slot="item" let-item="item" let-selected="selected">
					<b class="probe">{{ item.value }}:{{ selected }}</b>
				</ng-template>
			</div>`,
		})
		class NodesPage {
			readonly items = TWO
		}

		await render(NodesPage)

		const probes = [...document.querySelectorAll('.probe')]

		click(optionAt(1))

		expectNodes([...document.querySelectorAll('.probe')], probes)
		expect(probes.map((probe) => probe.textContent)).toEqual(['a:false', 'b:true'])
	})

	it('item-leading и item-trailing получают опцию через scope', () => {
		@Component({
			selector: 'probe-select-item-edges',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select [items]="items" open>
				<ng-template slot="item-leading" let-item="item"
					><u class="lead">{{ item.value }}</u></ng-template
				>
				<ng-template slot="item-trailing" let-item="item"
					><s class="trail">{{ item.value }}</s></ng-template
				>
			</div>`,
		})
		class EdgesPage {
			readonly items = TWO
		}

		draw(EdgesPage)

		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
	})

	/**
	 * Шаблон `item-indicator-icon` рисуется в отметке каждой опции вместо своей
	 * иконки — и там, где ничего не нарисовал: пустоту шаблона опция не видит.
	 */
	it('item-indicator-icon подменяет отметку у каждой опции, scope — опция и выбор', async () => {
		@Component({
			selector: 'probe-select-indicator-slot',
			imports: [TSelectComponent, SlotDirective],
			template: `<div so-select [items]="items" open mode="multiple" indicator="end">
				<ng-template slot="item-indicator-icon" let-item="item" let-selected="selected">
					@if (item.value === 'a') {
						<b class="probe">{{ selected }}</b>
					}
				</ng-template>
			</div>`,
		})
		class IndicatorPage {
			readonly items = TWO
		}

		await render(IndicatorPage)

		click(optionAt(0))
		click(optionAt(1))

		expect(
			[...document.querySelectorAll('.so-select-item__indicator')].map((node) =>
				node.querySelector('.probe')
					? 'slot'
					: node.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'empty'])
		expect(find(document, '.probe', HTMLElement).textContent).toBe('true')
	})

	it('default опции разметки получает text и selected, без него — text', async () => {
		@Component({
			selector: 'probe-select-own-default',
			imports: [TSelectComponent, TSelectItemComponent, SlotDirective],
			template: `<div so-select>
				<div so-select-item value="a" text="A">
					<ng-template slot="default" let-text="text" let-selected="selected"
						>{{ text }}:{{ selected }}</ng-template
					>
				</div>
				<div so-select-item value="b" text="B"></div>
			</div>`,
		})
		class OwnDefaultPage {}

		await render(OwnDefaultPage)

		expect(texts()).toEqual(['A:false', 'B'])

		await open()
		click(optionAt(0))

		expect(texts()).toEqual(['A:true', 'B'])
	})
})

/**
 * Группы из данных — метка `_.group` в `items` или `groupBy`, порядок и
 * подписи — `groups`: список рисует секциями, группа — `<div so-select-group>`
 * с `role="group"` и именем от подписи.
 */
describe('группы из данных', () => {
	/** В данных «Морковь» стоит между фруктами, у «Воды» группы нет. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS: TGroup[] = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']

	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	const prepare = (page: DataPage) => {
		page.items.set(MIXED)
		page.groups.set(GROUPS)
	}

	/**
	 * Части списка по порядку: группа — подписью и текстами её опций,
	 * разделитель — `—`, опция без группы — текстом.
	 */
	const parts = () =>
		[...list().children].map((node) => {
			if (node.classList.contains('so-select-group')) {
				const label =
					node.querySelector('.so-select-group__label')?.textContent?.trim() ?? ''
				const items = [...node.querySelectorAll('.so-select-item')].map((option) =>
					option.textContent?.trim(),
				)

				return [label, items]
			}

			if (node.classList.contains('so-select__separator')) return '—'

			return node.textContent?.trim()
		})

	/** Подсвеченная опция — по ссылке поля. */
	const active = () =>
		document
			.getElementById(field().getAttribute('aria-activedescendant') ?? '')
			?.textContent?.trim()

	// Options from data are drawn from the panel's first opening on: the panel
	// is open from the start where the test looks at them without opening it

	it('группы с подписью, без группы — последними; разделителей по умолчанию нет', async () => {
		await render(DataPage, (page) => {
			prepare(page)
			page.opened.set(true)
		})

		expect(parts()).toEqual(SECTIONS)
		expect(list().querySelector('.so-select__separator')).toBeNull()

		for (const group of list().querySelectorAll('.so-select-group')) {
			const label = find(group, '.so-select-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(label.id).not.toBe('')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.getAttribute('role')).toBe('presentation')
		}
	})

	it('groupSeparators — немой разделитель только между соседними секциями, и на лету; узлы опций те же', () => {
		const fixture = draw(DataPage, (page) => {
			prepare(page)
			page.groupSeparators.set(false)
			page.opened.set(true)
		})

		expect(parts()).toEqual(SECTIONS)

		const before = [...document.querySelectorAll('.so-select-item')]

		fixture.componentInstance.groupSeparators.set(true)
		check()

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-select__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		fixture.componentInstance.groupSeparators.set(false)
		check()

		expect(parts()).toEqual(SECTIONS)
		expectNodes([...document.querySelectorAll('.so-select-item')], before)
	})

	it('стрелки подсвечивают опции порядком экрана', async () => {
		await render(DataPage, prepare)

		press('ArrowDown')
		await nextFrame()
		check()

		expect(active()).toBe('Яблоко')

		press('ArrowDown')

		expect(active()).toBe('Груша')

		press('ArrowDown')

		expect(active()).toBe('Морковь')
	})

	it('отбор убрал все опции группы — нет и её подписи', async () => {
		await render(DataPage, (page) => {
			prepare(page)
			page.editable.set(true)
			page.editableMode.set('filter')
		})

		type('Морковь')

		expect(parts()).toEqual([['Овощи', ['Морковь']]])
	})
})

/** Секции коротко: подпись группы (`null` — без группы) и значения опций. */
const brief = (sections: ReadonlyArray<TGroupSection<{ readonly value?: unknown }>>) =>
	sections.map(({ group, items }) => [
		group === null ? null : (group.label ?? ''),
		items.map((option) => option.value),
	])

/**
 * Группа разметки входит в группировку коллекции: ключ группы опции внутри
 * берут лифтом, подпись группа регистрирует сама. Панель увезена в `body`, а
 * лифт Select опции и группа читают там, где их написали: DI идёт по дереву
 * объявлений.
 */
describe('группы разметки', () => {
	@Component({
		selector: 'probe-select-groups',
		imports: [TSelectComponent, TSelectItemComponent, TSelectGroupComponent],
		template: `<div so-select [engine]="engine">
			<div so-select-item value="water" text="Вода"></div>
			<div so-select-group label="Фрукты">
				<div so-select-item value="apple" text="Яблоко"></div>
				<div so-select-item value="pear" text="Груша"></div>
			</div>
		</div>`,
	})
	class GroupsPage {
		readonly engine: TSelectCollection = createEngineSelect()
	}

	it('секции — группа разметки с подписью; стрелки — порядком экрана', async () => {
		const fixture = await render(GroupsPage)
		const { engine } = fixture.componentInstance

		expect(brief(engine.extensions.group.sections)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
		])

		const group = find(list(), '.so-select-group', HTMLElement)

		expect(group.getAttribute('role')).toBe('group')
		expect(find(group, '.so-select-group__label', HTMLElement).textContent?.trim()).toBe(
			'Фрукты',
		)

		const visited: unknown[] = []

		for (let step = 0; step < 3; step += 1) {
			press('ArrowDown')
			await nextFrame()
			check()
			visited.push(
				document
					.getElementById(field().getAttribute('aria-activedescendant') ?? '')
					?.textContent?.trim(),
			)
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша'])
	})
})

/**
 * Своё у Angular: опции разметки входят в коллекцию в своём `ngOnInit`, в
 * порядке шаблона, — и в увезённой панели тоже; поле и ряд тегов — компоненты
 * над экземплярами сборки Select (`field`, `tags`).
 */
describe('Angular', () => {
	it('опции разметки входят в коллекцию в порядке DOM', async () => {
		const fixture = await render(Page)
		const engine = await engineOf(fixture.componentInstance.engines)

		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual([
			'msk',
			'tver',
			'tula',
		])
	})

	/** Поле — компонент над экземпляром поля Select: внешний `ctrl` — его поле. */
	it('поле — над экземпляром поля Select', async () => {
		const ctrl = new TSelect({ placeholder: 'Выберите' })

		await render(Page, (page) => page.ctrl.set(ctrl))

		expect(field().placeholder).toBe('Выберите')

		ctrl.field.placeholder = 'Город'
		check()

		expect(field().placeholder).toBe('Город')
	})

	/**
	 * Снятый Select уносит панель из `body`, а опции — из коллекции: движок
	 * снаружи остаётся без них.
	 */
	it('снятый Select уносит панель из body', async () => {
		@Component({
			selector: 'probe-select-shown',
			imports: [TSelectComponent, TSelectItemComponent],
			template: `@if (shown()) {
				<div so-select>
					<div so-select-item value="a" text="A"></div>
				</div>
			}`,
		})
		class ShownPage {
			readonly shown = signal(true)
		}

		const fixture = await render(ShownPage)

		expect(document.querySelectorAll('.so-select__panel')).toHaveLength(1)

		fixture.componentInstance.shown.set(false)
		check()

		expect(document.querySelectorAll('.so-select__panel')).toHaveLength(0)
		expect(document.querySelectorAll('.so-select-item')).toHaveLength(0)
	})
})

describe('типы', () => {
	it('входы фасада — по типам пропсов ядра', () => {
		expectTypeOf<TSelectComponent['value']>().toEqualTypeOf<TSelectValue | undefined>()
		expectTypeOf<TSelectItemComponent['selected']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<NonNullable<TSelectComponent['items']>>().toExtend<readonly unknown[]>()
	})

	it('выходы — выходы компонента', () => {
		expectTypeOf<TSelectComponent['soChangeOpen']>().toEqualTypeOf<EventEmitter<boolean>>()
		expectTypeOf<TSelectComponent>().toHaveProperty('soOpen')
		expectTypeOf<TSelectComponent>().toHaveProperty('soClose')
		expectTypeOf<TSelectComponent>().toHaveProperty('soEngineCreate')
		expectTypeOf<TSelectItemComponent['soChangeSelected']>().toEqualTypeOf<
			EventEmitter<boolean>
		>()
		expectTypeOf<TSelectItemComponent>().toHaveProperty('soChangeOrder')
	})

	it('опция — элемент коллекции Select', () => {
		expectTypeOf<ISelectItem>().toHaveProperty('text')
	})
})
