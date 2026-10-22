/**
 * Tags под Angular — набор тегов с выбором по режиму, крестиками и
 * переполнением.
 *
 * Сценарии — те же, что у Vue (`tags-close`, `tags-keyboard`,
 * `tags-overflow`, `tags-select`, `tags-variant`) и React (`tags.spec.tsx`):
 * разметка крестика, роли и остановка Tab по режиму, клавиатура по APG
 * Listbox, выбор по `press` строки, свой вариант тега, своя раскладка
 * показанных тегов в шаблоне слота `default`. Движок, расширения и плагины
 * перенесены без правок.
 *
 * Своё у Angular — разметка. Корень набора — сам элемент компонента
 * (`<div so-tags>`), и всё, что на нём написано, — его: ряд с ролью и есть
 * набор. Тег — `<div so-tags-item>`: атрибуты потребителя у него делятся между
 * корнем-пилюлей и строкой. Тег разметки, закрытый крестиком, уходит из
 * коллекции, а его корень прячется (`rendered = false`): элемент написал
 * потребитель, и убрать его компонент не может. Своя раскладка — шаблон
 * `default` со scope `shown`: в ленте `Scroller` каждый тег рисуется один раз.
 * Крестик гасит всплытие клика, как `@click.stop` у Vue: до корней тега и
 * набора, где клик слушает `TActionPlugin`, он не доходит.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { Component, signal, type EventEmitter, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import {
	TTags,
	createEngineTags,
	type ITagsItem,
	type TComponentVariant,
	type TSelectionMode,
	type TTagsOverflow,
	type TTagsValue,
	type TValuePayload,
} from '@soldy-ui/core'
import {
	SlotDirective,
	TScrollerComponent,
	TTagsComponent,
	TTagsItemComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

/** Узел на виду: закрытый тег разметки — скрытый элемент потребителя. */
const shown = (node: Element): boolean =>
	!(node instanceof HTMLElement) || node.style.display !== 'none'

/** Показанные теги по порядку. */
const tags = (scope: ParentNode = document) =>
	[...scope.querySelectorAll('.so-tags-item')].filter(shown)

/** Строка тега — первый элемент тега: носитель роли, выбора и остановки Tab. */
const rows = (scope?: ParentNode) =>
	tags(scope).map((tag) => {
		const row = tag.firstElementChild

		if (!(row instanceof HTMLElement)) throw new Error('у тега нет строки')

		return row
	})

/** Тег по тексту строки; нет его — тест падает здесь. */
function item(text: string, scope?: ParentNode): HTMLElement {
	const found = tags(scope).find(
		(candidate) => candidate.firstElementChild?.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`тега «${text}» нет`)

	return found
}

/** Строка тега по тексту; нет её — тест падает здесь. */
function rowOf(text: string, scope?: ParentNode): HTMLElement {
	const row = item(text, scope).firstElementChild

	if (!(row instanceof HTMLElement)) throw new Error(`у тега «${text}» нет строки`)

	return row
}

/** Кнопка закрытия тега; нет её — тест падает здесь. */
const closeOf = (text: string, scope?: ParentNode): HTMLElement =>
	find(item(text, scope), '.so-tags-item__close', HTMLElement)

/** Тексты строк по порядку. */
const texts = (scope?: ParentNode) => rows(scope).map((row) => row.textContent?.trim())

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

/** `tabindex` строк по порядку текстов. */
const rowTabindex = (list: string[]) => list.map((text) => rowOf(text).getAttribute('tabindex'))

/** Корень набора: на нём роль ряда, режим переполнения и модификаторы набора. */
const set = () => find(document, '.so-tags', HTMLElement)

/** Модификаторы варианта узла: по ним видно и что встало, и что снялось. */
const variantsOf = (element: Element, block: string): string[] =>
	[...element.classList].filter((name) => name.startsWith(`${block}--variant-`))

/** Модификаторы варианта тега по тексту строки. */
const tagVariants = (text: string): string[] => variantsOf(item(text), 'so-tags-item')

/** Узлы сверяются по ссылке: `toEqual` сравнил бы узлы по разметке. */
function expectNodes(actual: readonly Element[], expected: readonly Element[]): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** Фокус на узел: `focusin` слушает клавиатура набора, и он меняет остановку. */
function focus(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.focus()
	fixture.detectChanges()
}

/**
 * Нажатие клавиши, как его шлёт браузер: keydown и keyup, всплывают и
 * отменяются. Пробел нажимает строку, когда его отпускают, — как `<button>`.
 */
function press(fixture: ComponentFixture<unknown>, target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/** Хост с сигналами, заданными до первой проверки. */
function mountWith<T>(host: Type<T>, prepare: (page: T) => void) {
	const fixture = TestBed.createComponent(host)

	prepare(fixture.componentInstance)
	fixture.detectChanges()

	return fixture
}

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/** Теги из данных — набор рисует их сам. */
@Component({
	selector: 'probe-tags-data',
	imports: [TTagsComponent],
	template: `<div
		so-tags
		[closable]="closable()"
		[mode]="mode()"
		[items]="items()"
		[value]="value()"
		[disabled]="disabled()"
		(soChangeValue)="changes.push($event)"
	></div>`,
})
class DataHost {
	readonly closable = signal(false)
	readonly mode = signal<TSelectionMode | undefined>(undefined)
	readonly items = signal<readonly TItem[]>(ITEMS)
	readonly value = signal<TTagsValue | undefined>(undefined)
	readonly disabled = signal(false)
	readonly changes: TValuePayload<TTagsValue>[] = []
}

/**
 * Теги разметкой — «Настройки» выбран в режиме выбора, без выбора его отметка
 * не записывается. Разметка крестика обязана быть одной в обоих режимах.
 */
@Component({
	selector: 'probe-tags-closable',
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags closable [mode]="mode()">
		<div
			so-tags-item
			value="settings"
			text="Настройки"
			[selected]="mode() === 'multiple'"
		></div>
		<div so-tags-item value="mail" text="Почта"></div>
	</div>`,
})
class ClosableHost {
	readonly mode = signal<TSelectionMode>('multiple')
}

const ROLES = { multiple: 'option', none: 'listitem' } as const

const MODES = ['multiple', 'none'] as const

/** «A», «B» (выбран) и «C» разметкой; режим и закрываемость — сигналы. */
@Component({
	selector: 'probe-tags-abc',
	imports: [TTagsComponent, TTagsItemComponent],
	template: `<div so-tags [closable]="closable()" [mode]="mode()">
		<div so-tags-item value="a" text="A"></div>
		<div so-tags-item value="b" text="B" selected></div>
		<div so-tags-item value="c" text="C"></div>
	</div>`,
})
class AbcHost {
	readonly closable = signal(false)
	readonly mode = signal<TSelectionMode>('none')
}

/**
 * Кнопка закрытия тега — сосед строки, а не её потомок: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Разметка одна на все режимы.
 */
describe.each(MODES)('кнопка закрытия: разметка, mode="%s"', (mode) => {
	const draw = () => mountWith(ClosableHost, (page) => page.mode.set(mode))

	it('у строки тега нет интерактивного потомка', () => {
		draw()

		expect(rows()).toHaveLength(2)

		for (const row of rows()) {
			expect(row.getAttribute('role')).toBe(ROLES[mode])
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в теге сразу после строки', () => {
		draw()

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row?.getAttribute('role')).toBe(ROLES[mode])
		expect(close?.tagName).toBe('BUTTON')
		expect(close?.classList.contains('so-tags-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое тега не входит', () => {
		draw()

		const row = rowOf('Настройки')

		expect(row.textContent?.trim()).toBe('Настройки')
		expect(row.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})
})

describe('кнопка закрытия: поведение', () => {
	it('без closable кнопки нет, в теге одна строка', () => {
		mountHost(DataHost)

		expect(document.querySelector('.so-tags-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('клик закрывает тег и не выбирает его', async () => {
		const fixture = mountWith(DataHost, (page) => {
			page.closable.set(true)
			page.mode.set('multiple')
		})

		// Крестик закрывает по своему клику, а строка выбирает по `press` её
		// TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		click(fixture, closeOf('B'))

		expect(texts()).toEqual(['A', 'C'])
		expect(selection()).toEqual(['false', 'false'])
	})

	/**
	 * Нажатие по крестику — не нажатие по тегу и не по набору: корни обоих
	 * слушают клик (`TActionPlugin`), и всплывший до них клик дал бы им
	 * `press`.
	 */
	it('клик по крестику не зовёт (soActionPress) ни у тега, ни у набора', async () => {
		@Component({
			selector: 'probe-tags-press',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags closable (soActionPress)="setPress()">
				<div so-tags-item value="a" text="A"></div>
				<div so-tags-item value="b" text="B" (soActionPress)="tagPress()"></div>
			</div>`,
		})
		class PressHost {
			readonly setPress = vi.fn()
			readonly tagPress = vi.fn()
		}

		const fixture = mountHost(PressHost)
		const { setPress, tagPress } = fixture.componentInstance

		await nextFrame()

		click(fixture, closeOf('B'))

		expect(texts()).toEqual(['A'])
		expect(tagPress).not.toHaveBeenCalled()
		expect(setPress).not.toHaveBeenCalled()

		// Клик по строке до корней доходит: слушатели на месте
		click(fixture, rowOf('A'))

		expect(setPress).toHaveBeenCalledTimes(1)
	})

	it('клик по строке по-прежнему выбирает тег', async () => {
		const fixture = mountWith(DataHost, (page) => {
			page.closable.set(true)
			page.mode.set('multiple')
		})

		await nextFrame()

		click(fixture, rowOf('B'))

		expect(rowOf('B').getAttribute('aria-selected')).toBe('true')
		expect(rows()).toHaveLength(3)
	})

	it('размер кнопки — размер тега: от него считается кегль иконки', () => {
		@Component({
			selector: 'probe-tags-size',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags closable size="lg">
				<div so-tags-item value="a" text="A"></div>
			</div>`,
		})
		class SizeHost {}

		mountHost(SizeHost)

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` тега трёхзначен: `undefined` значит «как у набора». Снятый
	 * вход обязан вернуть тег к значению набора.
	 */
	it('false у тега прячет кнопку, снятие возвращает её от набора', () => {
		@Component({
			selector: 'probe-tags-own-closable',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags closable>
				<div so-tags-item value="a" text="A" [closable]="own()"></div>
			</div>`,
		})
		class OwnHost {
			readonly own = signal<boolean | undefined>(false)
		}

		const fixture = mountHost(OwnHost)

		expect(item('A').querySelector('.so-tags-item__close')).toBeNull()

		fixture.componentInstance.own.set(undefined)
		fixture.detectChanges()

		expect(item('A').querySelector('.so-tags-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный тег не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного тега кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — `tagOff`, весь набор — `setOff`. */
	@Component({
		selector: 'probe-tags-disabled-close',
		imports: [TTagsComponent, TTagsItemComponent],
		template: `<div so-tags closable [disabled]="setOff()">
			<div so-tags-item value="a" text="A"></div>
			<div so-tags-item value="b" text="B" disabled></div>
			<div so-tags-item value="c" text="C" [disabled]="tagOff()"></div>
		</div>`,
	})
	class DisabledHost {
		readonly tagOff = signal(false)
		readonly setOff = signal(false)
	}

	/** Теги, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tags-item__close'))

	it('выключенный со старта', () => {
		mountHost(DisabledHost)

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const fixture = mountHost(DisabledHost)

		fixture.componentInstance.tagOff.set(true)
		fixture.detectChanges()

		expect(withClose()).toEqual(['A'])

		fixture.componentInstance.tagOff.set(false)
		fixture.detectChanges()

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного тега, включили — вернулись', () => {
		const fixture = mountHost(DisabledHost)

		fixture.componentInstance.setOff.set(true)
		fixture.detectChanges()

		expect(withClose()).toEqual([])

		// `disabled` набора распространяется на всех: включение включает и «B»
		fixture.componentInstance.setOff.set(false)
		fixture.detectChanges()

		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

/**
 * Пилюлю рисует тег целиком: строка — только содержимое, иначе фон и
 * состояния не покрыли бы кнопку закрытия. Вид тема читает с класса набора,
 * состояние — с `data-*` тега.
 */
describe('вид — у пилюли, а не у строки', () => {
	it('строка вида не рисует, вид набора — классом на наборе', () => {
		@Component({
			selector: 'probe-tags-view',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags closable view="ghost">
				<div so-tags-item value="a" text="A"></div>
			</div>`,
		})
		class ViewHost {}

		mountHost(ViewHost)

		expect(set().classList.contains('so-tags--view-ghost')).toBe(true)

		// Строке и крестику вид даёт тема по контексту, разметка его не передаёт
		for (const part of [rowOf('A'), closeOf('A')]) {
			expect([...part.classList].filter((name) => name.includes('--view-'))).toEqual([])
		}
	})

	it('выбор отмечен на теге, а строка его не несёт', () => {
		mountWith(ClosableHost, (page) => page.mode.set('multiple'))

		expect(item('Настройки').getAttribute('data-selected')).toBe('true')
		expect(rowOf('Настройки').hasAttribute('data-selected')).toBe(false)
		expect(rowOf('Настройки').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Клавиатура по APG Listbox на roving tabindex: ядро пишет `tabindex` строк и
 * крестика в наборы, `TTagsKeyboardPlugin` ловит клавиши и `focusin` на корне.
 * Здесь — что наборы доехали до своих элементов и перекрыли собственную
 * остановку строки-`Button` на `div`, а плагин ходит по настоящей разметке.
 */
describe('с выбором — одна остановка Tab на весь набор', () => {
	const draw = (mode: TSelectionMode) =>
		mountWith(AbcHost, (page) => {
			page.closable.set(true)
			page.mode.set(mode)
		})

	it('tabindex="0" ровно у одной строки — у выбранной', () => {
		draw('multiple')

		const stops = document.querySelectorAll('[role="option"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(rowOf('B'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '0', '-1'])
	})

	it('без выбранного — у первой строки', () => {
		@Component({
			selector: 'probe-tags-single',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags mode="single">
				<div so-tags-item value="a" text="A"></div>
				<div so-tags-item value="b" text="B"></div>
			</div>`,
		})
		class SingleHost {}

		mountHost(SingleHost)

		expect(rowTabindex(['A', 'B'])).toEqual(['0', '-1'])
	})

	it('кнопка закрытия — не остановка Tab: тег закрывает Delete', () => {
		draw('multiple')

		expect(['A', 'B', 'C'].map((text) => closeOf(text).getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		])
	})

	it('набор объявляет горизонтальный listbox с множественным выбором', () => {
		draw('multiple')

		expect(set().getAttribute('role')).toBe('listbox')
		expect(set().getAttribute('aria-orientation')).toBe('horizontal')
		expect(set().getAttribute('aria-multiselectable')).toBe('true')
	})
})

/**
 * Без выбора у строки нет действия: остановка ей не нужна, а крестик —
 * единственный путь закрыть тег с клавиатуры.
 */
describe('без выбора строки Tab не ловят, крестик ловит', () => {
	it('у строк -1, у крестика tabindex нет — он нативная остановка', () => {
		mountWith(AbcHost, (page) => page.closable.set(true))

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(['A', 'B', 'C'].map((text) => closeOf(text).hasAttribute('tabindex'))).toEqual([
			false,
			false,
			false,
		])
		expect(set().hasAttribute('aria-orientation')).toBe(false)
		expect(set().getAttribute('role')).toBe('list')
	})

	it('включили выбор — остановка появилась, выключили — ушла', () => {
		const fixture = mountWith(AbcHost, (page) => page.closable.set(true))

		fixture.componentInstance.mode.set('single')
		fixture.detectChanges()

		// `selected` у «B» пришёл, пока выбора не было, и не записался — выбранного нет
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
		expect(closeOf('A').getAttribute('tabindex')).toBe('-1')

		fixture.componentInstance.mode.set('none')
		fixture.detectChanges()

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(closeOf('A').hasAttribute('tabindex')).toBe(false)
	})
})

describe('клавиатура', () => {
	const draw = () => mountWith(AbcHost, (page) => page.mode.set('multiple'))

	it('→ переносит фокус на строку следующего тега и остановку вместе с ним', async () => {
		const fixture = draw()

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		focus(fixture, rowOf('B'))
		press(fixture, rowOf('B'), 'ArrowRight')

		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
		expect(rowOf('C').getAttribute('aria-selected')).toBe('false')
	})

	it('пробел выбирает тег под фокусом, остановка остаётся на нём', async () => {
		const fixture = draw()

		await nextFrame()

		focus(fixture, rowOf('B'))
		press(fixture, rowOf('B'), 'ArrowRight')
		press(fixture, rowOf('C'), ' ')

		expect(rowOf('C').getAttribute('aria-selected')).toBe('true')
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
	})

	it('фокус на строке — кликом или из кода — переносит остановку на неё', async () => {
		const fixture = draw()

		await nextFrame()

		focus(fixture, rowOf('A'))

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		const fixture = mountWith(DataHost, (page) => {
			page.closable.set(true)
			page.mode.set('multiple')
		})

		await nextFrame()

		focus(fixture, rowOf('B'))
		press(fixture, rowOf('B'), 'Delete')

		expect(tags()).toHaveLength(2)
		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'C'])).toEqual(['-1', '0'])
	})
})

/**
 * Строка выбирает тег по `press`, а не по `click`: `press` её `TActionPlugin`
 * приходит и на клик, и на Enter или пробел с фокусом на строке, и не
 * приходит на выключенный тег, а `TSelectionExtension.toggle` выключенность
 * не проверяет.
 */
describe('выбор: Enter и пробел на строке переключают его', () => {
	it.each([
		['Enter', 'Enter'],
		['пробел', ' '],
	] as const)('%s выбирает тег, повтор снимает выбор', async (_name, key) => {
		const fixture = mountWith(DataHost, (page) => page.mode.set('multiple'))

		await nextFrame()

		press(fixture, rowOf('B'), key)

		expect(selection()).toEqual(['false', 'true', 'false'])
		expect(fixture.componentInstance.changes.at(-1)?.newValue).toEqual(['b'])

		press(fixture, rowOf('B'), key)

		expect(selection()).toEqual(['false', 'false', 'false'])
	})
})

/**
 * Выключенный тег не выбирается ни кликом, ни клавишей — выключен ли он сам
 * или весь набор. Включённый обратно — выбирается тем же жестом: так видно, что
 * слушатели на месте и отказ даёт именно выключенность.
 */
describe('выключенный тег не выбирается', () => {
	@Component({
		selector: 'probe-tags-disabled-select',
		imports: [TTagsComponent, TTagsItemComponent],
		template: `<div so-tags mode="multiple" [disabled]="setOff()">
			<div so-tags-item value="a" text="A"></div>
			<div so-tags-item value="b" text="B" [disabled]="tagOff()"></div>
		</div>`,
	})
	class OffHost {
		readonly tagOff = signal(false)
		readonly setOff = signal(false)
	}

	type TGesture = (fixture: ComponentFixture<unknown>, row: HTMLElement) => void

	const GESTURES: ReadonlyArray<readonly [string, TGesture]> = [
		['клик', (fixture, row) => click(fixture, row)],
		['Enter', (fixture, row) => press(fixture, row, 'Enter')],
		['пробел', (fixture, row) => press(fixture, row, ' ')],
	]

	const WAYS = [
		['выключен сам', 'tagOff'],
		['выключен набор', 'setOff'],
	] as const

	describe.each(WAYS)('%s', (_way, off) => {
		it.each(GESTURES)('%s не выбирает, после включения — выбирает', async (_name, gesture) => {
			const fixture = mountWith(OffHost, (page) => page[off].set(true))

			await nextFrame()

			gesture(fixture, rowOf('B'))

			expect(selection()).toEqual(['false', 'false'])

			fixture.componentInstance[off].set(false)
			fixture.detectChanges()
			await nextFrame()

			gesture(fixture, rowOf('B'))

			expect(selection()).toEqual(['false', 'true'])
		})
	})
})

/**
 * У набора два режима, `wrap` и `scroll`, и оба — раскладка темы: разметка
 * отдаёт режим через `data-overflow` и рисует все показанные теги.
 */
describe('переполнение', () => {
	const TEXTS = ['Москва', 'Тверь', 'Тула']

	@Component({
		selector: 'probe-tags-overflow',
		imports: [TTagsComponent],
		template: `<div so-tags [ctrl]="ctrl" [engine]="engine"></div>`,
	})
	class OverflowHost {
		ctrl = new TTags({ closable: true })
		engine = createEngineTags({ owner: this.ctrl })
	}

	const draw = (overflow: TTagsOverflow) =>
		mountWith(OverflowHost, (page) => {
			page.ctrl = new TTags({ overflow, closable: true })
			page.engine = createEngineTags({
				owner: page.ctrl,
				items: TEXTS.map((text) => ({ value: text, text })),
			})
		})

	it.each(['wrap', 'scroll'] as const)('%s: все теги в ряду', (overflow) => {
		draw(overflow)

		expect(texts(set())).toEqual(TEXTS)
	})

	it('режим уезжает в тему через data-overflow', () => {
		draw('scroll')

		expect(set().dataset['overflow']).toBe('scroll')
	})
})

/**
 * Шаблон слота `default` получает показанные теги и заменяет петлю набора:
 * так их раскладывают в ленту или делят на ряд и панель, не трогая набор. Тег
 * в своей разметке — тот же элемент коллекции: закрывается и выбывает так же.
 * Раскладка — в слое набора: DI идёт по дереву объявлений, и тег, написанный
 * в шаблоне внутри набора, видит его коллекцию.
 */
describe('шаблон default: своя раскладка показанных тегов', () => {
	const CITIES = ['Москва', 'Тверь', 'Тула'].map((text) => ({ value: text, text }))

	@Component({
		selector: 'probe-tags-layout',
		imports: [TTagsComponent, TTagsItemComponent, SlotDirective],
		template: `<div so-tags closable [mode]="mode()" [items]="cities">
			<ng-template slot="default" let-shown="shown">
				<div class="own">
					@for (tag of shown; track tag.uid) {
						<div so-tags-item [ctrl]="tag"></div>
					}
				</div>
			</ng-template>
		</div>`,
	})
	class LayoutHost {
		readonly mode = signal<TSelectionMode | undefined>(undefined)
		readonly cities = CITIES
	}

	const own = () => find(document, '.own', HTMLElement)

	it('теги стоят в своей разметке, каждый — один раз', () => {
		mountHost(LayoutHost)

		expect(texts(own())).toEqual(['Москва', 'Тверь', 'Тула'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(3)
	})

	it('закрытый тег выбывает и из своей разметки; остальные — те же узлы', async () => {
		const fixture = mountHost(LayoutHost)

		await nextFrame()

		const kept = [item('Москва', own()), item('Тула', own())]

		click(fixture, closeOf('Тверь', own()))

		expect(texts(own())).toEqual(['Москва', 'Тула'])
		expectNodes([item('Москва', own()), item('Тула', own())], kept)
	})

	it('тег своей раскладки — в коллекции набора: выбор по клику', async () => {
		const fixture = mountWith(LayoutHost, (page) => page.mode.set('multiple'))

		await nextFrame()

		click(fixture, rowOf('Тверь', own()))

		expect(selection()).toEqual(['false', 'true', 'false'])
		expect(set().getAttribute('role')).toBe('listbox')
	})

	/**
	 * Лента со стрелками — `Scroller` в шаблоне: теги — её содержимое, каждый
	 * один раз, и в коллекции набора по разу.
	 */
	it('шаблон default в <div so-scroller>: каждый тег отрисован один раз', async () => {
		@Component({
			selector: 'probe-tags-scroller',
			imports: [TTagsComponent, TTagsItemComponent, TScrollerComponent, SlotDirective],
			template: `<div
				so-tags
				overflow="scroll"
				[items]="cities"
				(soEngineCreate)="engines.push($event)"
			>
				<ng-template slot="default" let-shown="shown">
					<div so-scroller>
						@for (tag of shown; track tag.uid) {
							<div so-tags-item [ctrl]="tag"></div>
						}
					</div>
				</ng-template>
			</div>`,
		})
		class ScrollerHost {
			readonly cities = CITIES
			readonly engines: { extensions: { batch: { items: readonly object[] } } }[] = []
		}

		const fixture = mountHost(ScrollerHost)
		const scroller = find(set(), '.so-scroller', HTMLElement)

		// Движок набор объявляет на микрозадаче после сборки
		await Promise.resolve()

		expect(texts(scroller)).toEqual(['Москва', 'Тверь', 'Тула'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(3)
		expect(fixture.componentInstance.engines.at(-1)?.extensions.batch.items).toHaveLength(3)
	})
})

/**
 * Вариант тега — свой, а не набора: в одном наборе теги бывают разного цвета.
 * Вариант набора остаётся модификатором корня набора: по нему тема красит тег
 * без своего варианта, а сам тег значения набора не получает.
 */
describe('вариант тега', () => {
	describe('тег из разметки', () => {
		/** У «A» вариант свой, у «B» — нет. */
		@Component({
			selector: 'probe-tags-variant',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags [variant]="owner()">
				<div so-tags-item value="a" text="A" [variant]="own()"></div>
				<div so-tags-item value="b" text="B"></div>
			</div>`,
		})
		class VariantHost {
			readonly owner = signal<TComponentVariant | undefined>(undefined)
			readonly own = signal<TComponentVariant | undefined>('danger')
		}

		it('несёт свой модификатор варианта', () => {
			mountHost(VariantHost)

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена входа меняет модификатор, прежний снимается', () => {
			const fixture = mountHost(VariantHost)

			fixture.componentInstance.own.set('brand')
			fixture.detectChanges()

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])

			// Снятый вход снимает модификатор: тег снова без своего варианта
			fixture.componentInstance.own.set(undefined)
			fixture.detectChanges()

			expect(tagVariants('A')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const fixture = mountWith(VariantHost, (page) => page.owner.set('danger'))

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-danger'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			fixture.componentInstance.owner.set('brand')
			fixture.detectChanges()

			// Вариант набора — на корне набора, и только там
			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			fixture.componentInstance.owner.set(undefined)
			fixture.detectChanges()

			expect(variantsOf(set(), 'so-tags')).toEqual([])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
		})
	})

	describe('тег из items', () => {
		type TVariantItem = { value: string; text: string; variant?: TComponentVariant }

		const VARIANT_ITEMS: TVariantItem[] = [
			{ value: 'a', text: 'A', variant: 'danger' },
			{ value: 'b', text: 'B' },
		]

		@Component({
			selector: 'probe-tags-variant-items',
			imports: [TTagsComponent],
			template: `<div
				so-tags
				[variant]="owner()"
				[items]="items()"
				[trackBy]="trackBy"
			></div>`,
		})
		class VariantItemsHost {
			readonly owner = signal<TComponentVariant | undefined>('brand')
			readonly items = signal<readonly TVariantItem[]>(VARIANT_ITEMS)
			readonly trackBy = (tag: object) => Reflect.get(tag, 'value')
		}

		it('несёт свой модификатор варианта, тег без своего — никакого', () => {
			mountHost(VariantItemsHost)

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта в items меняет модификатор того же тега', () => {
			const fixture = mountHost(VariantItemsHost)
			const before = item('A')

			fixture.componentInstance.items.set([
				{ value: 'a', text: 'A', variant: 'brand' },
				{ value: 'b', text: 'B' },
			])
			fixture.detectChanges()

			// Сверка по ключу обновила тот же тег, а не нарисовала новый
			expect(item('A')).toBe(before)
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const fixture = mountWith(VariantItemsHost, (page) => page.owner.set('danger'))

			fixture.componentInstance.owner.set('brand')
			fixture.detectChanges()

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			fixture.componentInstance.owner.set(undefined)
			fixture.detectChanges()

			expect(variantsOf(set(), 'so-tags')).toEqual([])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})
	})
})

/**
 * Проброс целиком: у каждого слота тега есть `item-<слот>`, и его scope —
 * scope слота тега плюс сам тег. Шаблон непрозрачен: заданный набору, он
 * рисуется у каждого тега вместо своего, как сниппет у Svelte.
 */
describe('слоты', () => {
	const TWO = ITEMS.slice(0, 2)

	it('item получает text и selected тега, selected следует за выбором', async () => {
		@Component({
			selector: 'probe-tags-item-slot',
			imports: [TTagsComponent, SlotDirective],
			template: `<div so-tags mode="multiple" [items]="items">
				<ng-template slot="item" let-item="item" let-text="text" let-selected="selected"
					>{{ item.value }}:{{ text }}:{{ selected }}</ng-template
				>
			</div>`,
		})
		class ItemSlotHost {
			readonly items = TWO
		}

		const fixture = mountHost(ItemSlotHost)

		await nextFrame()

		expect(texts()).toEqual(['a:A:false', 'b:B:false'])

		click(fixture, rowOf('b:B:false'))

		expect(texts()).toEqual(['a:A:false', 'b:B:true'])
	})

	it('default тега получает text и selected, без него — text', async () => {
		@Component({
			selector: 'probe-tags-own-default',
			imports: [TTagsComponent, TTagsItemComponent, SlotDirective],
			template: `<div so-tags mode="multiple">
				<div so-tags-item value="a" text="A">
					<ng-template slot="default" let-text="text" let-selected="selected"
						>{{ text }}:{{ selected }}</ng-template
					>
				</div>
				<div so-tags-item value="b" text="B"></div>
			</div>`,
		})
		class OwnDefaultHost {}

		const fixture = mountHost(OwnDefaultHost)

		await nextFrame()

		expect(texts()).toEqual(['A:false', 'B'])

		click(fixture, rowOf('A:false'))

		expect(texts()).toEqual(['A:true', 'B'])
	})

	/**
	 * Новый контекст вывод шаблона отдаёт тому же представлению: узлы слота
	 * переживают выбор, а текст в них новый — и у проброса набора тоже.
	 */
	it('item набора, читающий scope в разметке, — те же узлы после выбора', async () => {
		@Component({
			selector: 'probe-tags-item-nodes',
			imports: [TTagsComponent, SlotDirective],
			template: `<div so-tags mode="multiple" [items]="items">
				<ng-template slot="item" let-item="item" let-selected="selected">
					<b class="probe">{{ item.value }}:{{ selected }}</b>
				</ng-template>
			</div>`,
		})
		class NodesHost {
			readonly items = TWO
		}

		const fixture = mountHost(NodesHost)

		await nextFrame()

		const probes = [...document.querySelectorAll('.probe')]

		click(fixture, rowOf('b:false'))

		expectNodes([...document.querySelectorAll('.probe')], probes)
		expect(probes.map((probe) => probe.textContent)).toEqual(['a:false', 'b:true'])
	})

	/**
	 * Шаблон `item-close-icon` рисуется у каждого тега вместо своей иконки — и
	 * там, где ничего не нарисовал: пустоту шаблона тег не видит.
	 */
	it('item-close-icon подменяет иконку у каждого тега, scope — сам тег', () => {
		@Component({
			selector: 'probe-tags-close-icon',
			imports: [TTagsComponent, SlotDirective],
			template: `<div so-tags closable [items]="items">
				<ng-template slot="item-close-icon" let-item="item">
					@if (item.value === 'b') {
						<b class="probe">×</b>
					}
				</ng-template>
			</div>`,
		})
		class CloseIconHost {
			readonly items = TWO
		}

		mountHost(CloseIconHost)

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['empty', 'slot'])
	})

	it('без item-close-icon тег рисует свою иконку крестика', () => {
		@Component({
			selector: 'probe-tags-own-icon',
			imports: [TTagsComponent],
			template: `<div so-tags closable [items]="items"></div>`,
		})
		class OwnIconHost {
			readonly items = TWO
		}

		mountHost(OwnIconHost)

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map(
				(close) => close.querySelector('svg') !== null,
			),
		).toEqual([true, true])
	})

	it('item-leading и item-trailing получают тег через scope', () => {
		@Component({
			selector: 'probe-tags-edges',
			imports: [TTagsComponent, SlotDirective],
			template: `<div so-tags [items]="items">
				<ng-template slot="item-leading" let-item="item"
					><u class="lead">{{ item.value }}</u></ng-template
				>
				<ng-template slot="item-trailing" let-item="item"
					><s class="trail">{{ item.value }}</s></ng-template
				>
			</div>`,
		})
		class EdgesHost {
			readonly items = TWO
		}

		mountHost(EdgesHost)

		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		// Края — внутри строки тега, по сторонам её текста
		expect(document.querySelector('.lead')?.closest('.so-button')).toBe(rows()[0])
		expect(document.querySelector('.trail')?.closest('.so-button')).toBe(rows()[0])
	})
})

/**
 * Наборы ядра стоят на разных элементах: `attrs` и `dataset` — на корне тега,
 * `aria` — на строке. Строка — `div`: нативного `disabled` у неё нет, и
 * `aria-disabled` остаётся единственным способом сообщить состояние. Корень —
 * элемент потребителя, и его тег — тот, что написан.
 */
describe('Tags.Item · корень и строка', () => {
	@Component({
		selector: 'probe-tags-item-div',
		imports: [TTagsComponent, TTagsItemComponent],
		template: `<div so-tags><div so-tags-item value="a" text="A" disabled></div></div>`,
	})
	class DivHost {}

	@Component({
		selector: 'probe-tags-item-fieldset',
		imports: [TTagsComponent, TTagsItemComponent],
		template: `<div so-tags>
			<fieldset so-tags-item value="a" text="A" disabled></fieldset>
		</div>`,
	})
	class FieldsetHost {}

	it('нативного disabled на корне нет, состояние для темы — data-disabled', () => {
		mountHost(DivHost)

		expect(item('A').hasAttribute('disabled')).toBe(false)
		expect(item('A').getAttribute('data-disabled')).toBe('true')
	})

	it('корень — тег элемента: у fieldset нативный disabled появляется', () => {
		mountHost(FieldsetHost)

		expect(item('A').tagName).toBe('FIELDSET')
		expect(item('A').hasAttribute('disabled')).toBe(true)
	})

	it('строка несёт aria-disabled без нативного дубля, тег корня её не переписывает', () => {
		mountHost(FieldsetHost)

		expect(rowOf('A').tagName).toBe('DIV')
		expect(rowOf('A').getAttribute('aria-disabled')).toBe('true')
		expect(rowOf('A').hasAttribute('disabled')).toBe(false)
	})

	/**
	 * Входы фасада — `mode` у набора и `selected` у тега — съедает связка фасада,
	 * и атрибутами в DOM они не уходят. Что потребитель написал сверх входов,
	 * уходит: у набора — корню, у тега — строке.
	 */
	it('входы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		@Component({
			selector: 'probe-tags-facade-inputs',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags mode="multiple" title="Метки">
				<div so-tags-item value="z" text="Z" selected title="Тег"></div>
			</div>`,
		})
		class FacadeHost {}

		mountHost(FacadeHost)

		expect(set().hasAttribute('mode')).toBe(false)
		expect(set().getAttribute('title')).toBe('Метки')
		expect(item('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Тег')
		expect(item('Z').hasAttribute('title')).toBe(false)
	})

	/**
	 * Класс и стиль — вид пилюли, на корне тега; `title`, привязки и слушатель
	 * потребителя — на строке, где фокус и роль.
	 */
	it('класс и стиль — корню тега; title, [attr.x] и (click) — строке', async () => {
		@Component({
			selector: 'probe-tags-item-split',
			imports: [TTagsComponent, TTagsItemComponent],
			template: `<div so-tags>
				<div
					so-tags-item
					value="a"
					text="A"
					class="mine"
					style="color: red"
					title="Тег"
					[attr.data-probe]="probe()"
					(click)="clicks.push($event.currentTarget)"
				></div>
			</div>`,
		})
		class SplitHost {
			readonly probe = signal('x')
			readonly clicks: (EventTarget | null)[] = []
		}

		const fixture = mountHost(SplitHost)

		expect(item('A').classList.contains('mine')).toBe(true)
		expect(item('A').style.color).toBe('red')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
		expect(rowOf('A').getAttribute('title')).toBe('Тег')
		expect(rowOf('A').getAttribute('data-probe')).toBe('x')
		expect(item('A').hasAttribute('title')).toBe(false)
		expect(item('A').hasAttribute('data-probe')).toBe(false)

		await nextFrame()

		click(fixture, rowOf('A'))

		expect(fixture.componentInstance.clicks).toEqual([rowOf('A')])
	})
})

describe('Angular', () => {
	/** Значения тегов движка по порядку. */
	type TEngineView = { extensions: { batch: { items: readonly object[] } } }

	@Component({
		selector: 'probe-tags-order',
		imports: [TTagsComponent, TTagsItemComponent],
		template: `<div so-tags closable (soEngineCreate)="engines.push($event)">
			<div so-tags-item value="a" text="A"></div>
			<div so-tags-item value="b" text="B"></div>
			<div so-tags-item value="c" text="C"></div>
		</div>`,
	})
	class OrderHost {
		readonly engines: TEngineView[] = []
	}

	const values = (fixture: ComponentFixture<OrderHost>) =>
		(fixture.componentInstance.engines.at(-1)?.extensions.batch.items ?? []).map((tag) =>
			Reflect.get(tag, 'value'),
		)

	it('теги разметки входят в коллекцию в порядке DOM', async () => {
		const fixture = mountHost(OrderHost)

		await Promise.resolve()

		expect(values(fixture)).toEqual(['a', 'b', 'c'])
	})

	/**
	 * Закрытый крестиком тег разметки уходит из коллекции, а его корень
	 * прячется: элемент написал потребитель, и убрать его компонент не может.
	 */
	it('закрытый тег разметки — вне коллекции, его корень скрыт', async () => {
		const fixture = mountHost(OrderHost)

		await nextFrame()

		const closed = item('B')

		click(fixture, closeOf('B'))

		expect(values(fixture)).toEqual(['a', 'c'])
		expect(closed.isConnected).toBe(true)
		expect(closed.style.display).toBe('none')
		expect(texts()).toEqual(['A', 'C'])
	})

	it('корень набора — элемент потребителя, корень тега — тоже', () => {
		const fixture = mountHost(OrderHost)

		expect(findIn(fixture, '[so-tags]', HTMLDivElement)).toBe(set())
		expect(set().classList.contains('so-tags')).toBe(true)
		expect(item('A').hasAttribute('so-tags-item')).toBe(true)
	})
})

describe('типы', () => {
	it('входы фасада — по типам пропсов ядра', () => {
		expectTypeOf<TTagsComponent['value']>().toEqualTypeOf<TTagsValue | undefined>()
		expectTypeOf<TTagsItemComponent['selected']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<NonNullable<TTagsComponent['items']>>().toExtend<readonly unknown[]>()
	})

	it('выходы фасада — выходы компонента', () => {
		expectTypeOf<TTagsComponent['soChangeMode']>().toEqualTypeOf<EventEmitter<TSelectionMode>>()
		expectTypeOf<TTagsComponent>().toHaveProperty('soEngineCreate')
		expectTypeOf<TTagsItemComponent['soChangeSelected']>().toEqualTypeOf<
			EventEmitter<boolean>
		>()
		expectTypeOf<TTagsItemComponent>().toHaveProperty('soChangeClosable')
		expectTypeOf<TTagsItemComponent>().toHaveProperty('soChangeOrder')
	})

	it('тег набора — элемент коллекции', () => {
		expectTypeOf<ITagsItem>().toHaveProperty('text')
	})
})
