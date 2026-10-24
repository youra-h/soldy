/**
 * Select в Svelte — проводка целиком, на настоящей разметке.
 *
 * Юнит-тесты ядра и плагинов проверяют механизмы по отдельности; здесь важно,
 * что они сходятся: опции входят в коллекцию лифтом, панель телепортирована и
 * связана с полем, ARIA собирается в один набор. Сценарии — те же, что у Vue
 * (`select.spec`, `select-filter`, Select из `list-groups`, `list-indicator`,
 * `item-slots`, `item-control-attrs`, `styling-state`, `engine-prop` и слот
 * `tags` из `tags-overflow`); `v-model` Vue здесь — колбэки `onChange*`.
 *
 * Своё у Svelte — панель. Своего портала у Svelte нет, и `Teleport` монтирует
 * её отдельным корнем в `body` эффектом, со всеми контекстами места: опции в
 * ней читают лифт Select и входят в его коллекцию при своей инициализации —
 * после эффекта, то есть после `flushSync()`, которым монтирование
 * кончается. Сервер панели не рисует — `collections.server.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { createRawSnippet, flushSync, type ComponentProps, type Snippet } from 'svelte'
import {
	TSelect,
	createEngine,
	createEngineSelect,
	type IInput,
	type ISelectItem,
	type TGroupSection,
	type TSelectCollection,
	type TSelectPlacement,
} from '@soldy-ui/core'
import { TAnchorPlugin, ruRU } from '@soldy-ui/plugins'
import {
	Select,
	SelectGroup,
	SelectItem,
	type SelectGroupProps,
	type SelectItemProps,
	type SelectProps,
} from '@soldy-ui/svelte'
import Harness from './Select.test.svelte'
import Slots from './SelectSlots.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup, scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

type THarnessProps = ComponentProps<typeof Harness>

/** Scope слотов: строки опции, проброса строки и проброса без своего scope. */
type TRowScope = { text: string; selected: boolean }
type TItemRowScope = TRowScope & { item: ISelectItem }
type TItemScope = { item: ISelectItem }

/** Движок так, как его видит тест: состав, отбор и выбор. */
type TEngineView = {
	extensions: {
		batch: { items: ReadonlyArray<{ readonly value: unknown }> }
		filter: { query: string; fields: readonly string[]; clear(): void }
		selection: { selectedCount: number; isSelected(item: object): boolean }
	}
}

/** Поле комбобокса — `<input>` внутри Select; фокус всегда на нём. */
const field = (scope: ParentNode = document) =>
	find(scope, '.so-select__field input', HTMLInputElement)

/** Панель телепортирована в `body` — ищется по документу. */
const panel = () => find(document, '.so-select__panel', HTMLElement)

/** Открыта ли панель: она всегда в документе и скрывается через `display: none`. */
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Список панели — узел с `role="listbox"`. */
const list = () => find(document, '.so-select__list', HTMLElement)

/** Строки опций — носители роли, выбора и `id`. */
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')]

const texts = () => options().map((option) => option.textContent?.trim())

/** Показанные опции разметки — те, что не скрыты `visible` на корне опции. */
const visibleTexts = () =>
	[...document.querySelectorAll<HTMLElement>('.so-select-item')]
		.filter((option) => option.style.display !== 'none')
		.map((option) => option.textContent?.trim())

const selection = () => options().map((option) => option.getAttribute('aria-selected'))

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

/** Клавиша на поле — как её шлёт браузер: всплывает и отменяется. */
function press(key: string, target: Element = field()): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	target.dispatchEvent(event)
	flushSync()

	return event
}

/** Набрать текст в поле так, как это делает пользователь. */
function type(value: string): void {
	field().value = value
	field().dispatchEvent(new Event('input', { bubbles: true }))
	flushSync()
}

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/**
 * Смонтировать Select и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, и клик, клавиши и «мимо» слушаются с него.
 */
async function render(props: THarnessProps = {}) {
	const mounted = mount(Harness, props)

	await nextFrame()

	return mounted
}

/** Открыть кликом по полю: select-only тумблит панель кликом по корню. */
async function open(): Promise<void> {
	click(field())
	await nextFrame()
}

/** Движок из `engine:create`: его колбэк — проп компонента. */
function engineProbe(): {
	readonly onEngineCreate: (engine: TEngineView) => void
	readonly engine: () => TEngineView
} {
	let created: TEngineView | undefined

	return {
		onEngineCreate: (engine) => {
			created = engine
		},
		engine: () => {
			if (!created) throw new Error('engine:create не пришёл')

			return created
		},
	}
}

/** Микрозадачи: `engine:create` и `anchor:create` движок и плагин объявляют на них. */
async function flush(): Promise<void> {
	await Promise.resolve()
	flushSync()
}

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
	{ value: 'd', text: 'Четвёртый' },
]

describe('составной компонент', () => {
	it('Select.Item — это SelectItem, Select.Group — SelectGroup', () => {
		expect(Select.Item).toBe(SelectItem)
		expect(Select.Group).toBe(SelectGroup)
		expectTypeOf(Select.Item).toEqualTypeOf<typeof SelectItem>()
		expectTypeOf(Select.Group).toEqualTypeOf<typeof SelectGroup>()
	})
})

describe('поле', () => {
	it('объявлено как combobox и свёрнуто', () => {
		mount(Harness, {})

		expect(field().getAttribute('role')).toBe('combobox')
		expect(field().getAttribute('aria-expanded')).toBe('false')
		expect(field().getAttribute('aria-haspopup')).toBe('listbox')
	})

	it('required пробрасывается в aria-required на combobox, без required атрибута нет', () => {
		mount(Harness, { select: { required: true } })

		expect(field().getAttribute('aria-required')).toBe('true')
	})

	it('без required aria-required нет', () => {
		mount(Harness, {})

		expect(field().hasAttribute('aria-required')).toBe(false)
	})

	it('select-only: поле readonly нативно, aria-readonly рядом не дублирует', () => {
		mount(Harness, {})

		expect(field().hasAttribute('readonly')).toBe(true)
		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	it('editable: поле не readonly, aria-autocomplete="list"', () => {
		mount(Harness, { select: { editable: true } })

		expect(field().hasAttribute('readonly')).toBe(false)
		expect(field().getAttribute('aria-autocomplete')).toBe('list')
	})

	it('editableMode: none тоже объявляет aria-autocomplete="list"', () => {
		mount(Harness, { select: { editable: true, editableMode: 'none' } })

		expect(field().getAttribute('aria-autocomplete')).toBe('list')
	})

	/**
	 * Убери панель через `{#if}` — и закрытие вычистило бы опции из коллекции,
	 * а вместе с ними значение поля.
	 */
	it('пока закрыто, панель скрыта — но остаётся в документе', () => {
		mount(Harness, {})

		expect(document.querySelector('[role="listbox"]')).not.toBeNull()
		expect(isOpen()).toBe(false)
	})

	it('клик открывает панель', async () => {
		await render()
		await open()

		expect(field().getAttribute('aria-expanded')).toBe('true')
		expect(isOpen()).toBe(true)
	})

	it('ссылается на список — и список этот id носит', async () => {
		await render()
		await open()

		expect(field().getAttribute('aria-controls')).toBe(list().id)
		expect(list().id).not.toBe('')
	})

	it('id по умолчанию нет, заданный — доходит до поля', () => {
		mount(Harness, {})

		expect(field().hasAttribute('id')).toBe(false)

		document.body.innerHTML = ''
		mount(Harness, { select: { id: 'city' } })

		expect(field().id).toBe('city')
	})

	/** Корень и поле стоят вплотную к панели: пробел Svelte оставил бы текстом. */
	it('в корне — поле и место панели, без текста между ними', () => {
		const { root } = mount(Harness, {})

		const stray = [...root().childNodes].filter(
			(child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '',
		)

		expect(stray).toEqual([])
		expect(root().firstElementChild?.classList.contains('so-select__field')).toBe(true)
	})
})

describe('опции', () => {
	it('входят в коллекцию лифтом и получают роль', async () => {
		await render()
		await open()

		expect(options()).toHaveLength(3)
		expect(texts()).toEqual(['Москва', 'Тверь', 'Тула'])
	})

	/**
	 * Поле ссылается на подсвеченную опцию по `id`, а стоит он на строке опции
	 * вместе со всей её ARIA: ссылка обязана находить узел с ролью.
	 */
	it('aria-activedescendant указывает на узел с role="option"', async () => {
		await render()

		press('ArrowDown')

		const id = field().getAttribute('aria-activedescendant')

		expect(id).toBeTruthy()
		expect(document.getElementById(id ?? '')?.getAttribute('role')).toBe('option')
	})

	it('aria-selected стоит на всех, а не только на выбранной', async () => {
		await render()
		await open()

		expect(options().every((option) => option.hasAttribute('aria-selected'))).toBe(true)
	})

	it('клик по опции выбирает её и закрывает панель', async () => {
		await render()
		await open()

		click(options()[1] as HTMLElement)

		expect(field().value).toBe('Тверь')
		expect(field().getAttribute('aria-expanded')).toBe('false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('выключенная опция кликом не выбирается', async () => {
		await render()
		await open()

		click(options()[2] as HTMLElement)

		expect(field().value).toBe('')
		expect(selection()).toEqual(['false', 'false', 'false'])
	})

	/**
	 * Фон подсветки и выбора тема рисует на `.so-button` опции и читает
	 * `data-*` с неё: набор доезжает и до корня опции, и до её строки.
	 */
	it('состояние для темы — data-* на корне опции и на её строке, вида в разметке нет', async () => {
		await render()
		await open()

		click(options()[0] as HTMLElement)

		const roots = [...document.querySelectorAll('.so-select-item')]

		expect(roots.map((root) => root.getAttribute('data-selected'))).toEqual([
			'true',
			'false',
			'false',
		])
		expect(options()[0]?.getAttribute('data-selected')).toBe('true')
		expect(options()[0]?.className).not.toMatch(/--view-/)
		expect(roots.map((root) => root.getAttribute('data-disabled'))).toEqual([
			'false',
			'false',
			'true',
		])
		expect(options()[2]?.getAttribute('data-disabled')).toBe('true')
	})

	/**
	 * Строка Select — сама опция: набор опции ложится поверх того, что
	 * `Button` пишет себе сам. Узел с ролью один — корень ничего не объявляет,
	 * строка не объявляет себя кнопкой; строка — `span` без нативного
	 * `disabled`, и `aria-disabled` у неё единственный способ сказать о
	 * выключенности.
	 */
	it('строка и есть опция: роль, id и aria-selected — на ней, корень без ARIA', () => {
		mount(Harness, { items: [{ value: 'a', text: 'A', disabled: true }] })

		const row = find(document, '.so-select-item .so-button', HTMLElement)
		const root = find(document, '.so-select-item', HTMLElement)

		expect(row.tagName).toBe('SPAN')
		expect(row.getAttribute('role')).toBe('option')
		expect(row.id).toMatch(/-option$/)
		expect(row.getAttribute('aria-selected')).toBe('false')
		expect(row.getAttribute('aria-disabled')).toBe('true')
		expect(row.hasAttribute('disabled')).toBe(false)
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(document.querySelectorAll('.so-select-item [role="button"]')).toHaveLength(0)

		for (const name of ['role', 'id', 'aria-selected', 'aria-disabled', 'disabled']) {
			expect(root.hasAttribute(name), name).toBe(false)
		}
	})

	it('корень опции рисуется по tag, строка остаётся span', () => {
		mount(Harness, { items: [{ value: 'a', text: 'A', disabled: true, tag: 'fieldset' }] })

		const root = find(document, '.so-select-item', HTMLElement)
		const row = find(root, '.so-button', HTMLElement)

		expect(root.tagName).toBe('FIELDSET')
		expect(root.hasAttribute('disabled')).toBe(true)
		expect(row.tagName).toBe('SPAN')
		expect(row.getAttribute('aria-disabled')).toBe('true')
	})

	it('класс и стиль потребителя — корню опции, остальное — строке; клик потребителя выбора не отменяет', async () => {
		const onclick = vi.fn()

		await render({
			items: [
				{
					value: 'a',
					text: 'A',
					class: 'mine',
					style: 'color: red',
					title: 'Строка',
					onclick,
				},
			],
		})
		await open()

		const root = find(document, '.so-select-item', HTMLElement)
		const row = find(root, '[role="option"]', HTMLElement)

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(row.classList.contains('mine')).toBe(false)
		expect(row.getAttribute('title')).toBe('Строка')

		click(row)

		expect(onclick).toHaveBeenCalledTimes(1)
		expect(field().value).toBe('A')
	})

	it('клик потребителя по опции — после выбора, как у ListBox; stopPropagation выбор не отменяет', async () => {
		const order: string[] = []

		await render({
			select: { onChangeValue: () => order.push('выбор') },
			items: [
				{
					value: 'a',
					text: 'A',
					onclick: (event: MouseEvent) => {
						order.push('клик')
						event.stopPropagation()
					},
				},
			],
		})
		await open()

		click(find(document, '[role="option"]', HTMLElement))

		expect(order).toEqual(['выбор', 'клик'])
		expect(field().value).toBe('A')
	})
})

/**
 * Кнопку очистки рисует поле — `Input` внутри Select (`.so-input__clear`):
 * `clearable` Select отдаёт полю, имя кнопке пишет плагин имён самого поля,
 * и своей кнопки у Select нет.
 */
describe('кнопка очистки', () => {
	it('без clearable её нет', () => {
		mount(Harness, {})

		expect(document.querySelector('.so-input__clear')).toBeNull()
	})

	it('кнопка — поля, первой в его слоте у конца, перед стрелкой', () => {
		mount(Harness, { select: { clearable: true } })

		const slot = find(document, '.so-select__field > .so-input__trailing', HTMLElement)
		const parts = ['.so-input__clear', '.so-select__arrow']

		expect([...slot.children].map((node) => parts.find((part) => node.matches(part)))).toEqual(
			parts,
		)
		expect(document.querySelector('.so-select__clear')).toBeNull()
	})

	it('имя собрано с именем поля', () => {
		mount(Harness, { select: { clearable: true } })

		expect(find(document, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Clear Город',
		)
	})

	it('строку имени поле берёт от локали поддерева — через Select она не идёт', () => {
		mount(Slots, { case: 'locale', locale: ruRU })

		expect(find(document, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Очистить Город',
		)
	})

	it('клик сбрасывает выбранное значение и панель не открывает', async () => {
		await render({ select: { clearable: true } })
		await open()

		click(options()[1] as HTMLElement)

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
	 * Своя кнопка вместо встроенной берёт `clear` из scope слота и зовёт его
	 * голой функцией: метод, оторванный от поля, не падает.
	 */
	it('своя кнопка в слоте clear снимает выбор функцией из scope', async () => {
		const clear = createRawSnippet((scope: () => { clear: () => void }) => ({
			render: () => '<button class="probe-clear"></button>',
			setup(node) {
				node.addEventListener('click', () => scope().clear())
			},
		}))

		await render({
			select: { value: 'tver', clear },
			items: [
				{ value: 'msk', text: 'Москва' },
				{ value: 'tver', text: 'Тверь' },
			],
		})

		expect(field().value).toBe('Тверь')
		expect(selection()).toEqual(['false', 'true'])

		click(find(document, '.probe-clear', HTMLElement))

		expect(field().value).toBe('')
		expect(selection()).toEqual(['false', 'false'])
	})

	/** Слот Select уходит полю: своя кнопка встаёт на место встроенной и при `clearable`. */
	it('своя кнопка заменяет встроенную целиком и стоит на её месте', () => {
		mount(Harness, {
			select: { clearable: true, clear: markup('<button class="probe-clear"></button>') },
		})

		expect(document.querySelector('.so-input__clear')).toBeNull()
		expect(
			document.querySelector('.so-select__field .so-input__trailing > .probe-clear'),
		).not.toBeNull()
	})
})

describe('множественный выбор', () => {
	it('список помечен как multiselectable, в одиночном режиме пометки нет', async () => {
		await render({ select: { mode: 'multiple' } })

		expect(list().getAttribute('aria-multiselectable')).toBe('true')

		document.body.innerHTML = ''
		await render()

		expect(list().hasAttribute('aria-multiselectable')).toBe(false)
	})

	/**
	 * Теги — второй компонент внутри поля (`TSelectTagsExtension`), а не
	 * разметка: связка «опция ⇄ тег» иначе повторилась бы в шести адаптерах.
	 */
	it('выбор рисует тег в поле, а не текст', async () => {
		await render({ select: { mode: 'multiple' } })
		await open()

		click(options()[0] as HTMLElement)

		expect(field().value).toBe('')

		const tags = document.querySelectorAll('.so-select__tags .so-tags-item')

		expect(tags).toHaveLength(1)
		expect(tags[0]?.textContent).toContain('Москва')
	})

	it('закрытие тега снимает выбор с опции', async () => {
		await render({ select: { mode: 'multiple' } })
		await open()

		click(options()[0] as HTMLElement)
		await nextFrame()

		click(find(document, '.so-tags-item__close', HTMLElement))

		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(0)
		expect(options()[0]?.getAttribute('aria-selected')).toBe('false')
	})

	it('в single тегов в поле нет', () => {
		mount(Harness, {})

		expect(document.querySelector('.so-select__tags')).toBeNull()
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(0)
	})

	/**
	 * Значение — новый массив того же содержимого на перерисовке родителя.
	 * Вход сверяет его с прошлым по содержимому, и снятый пользователем выбор
	 * перерисовка не возвращает.
	 */
	it('тот же по содержимому массив в value не откатывает выбор', async () => {
		const props = reactiveProps<THarnessProps>({
			select: { mode: 'multiple', value: ['msk', 'tver'] },
		})

		await render(props)

		expect(selection()).toEqual(['true', 'true', 'false'])

		await open()
		click(options()[1] as HTMLElement)

		expect(selection()).toEqual(['true', 'false', 'false'])

		props.select = { mode: 'multiple', value: ['msk', 'tver'] }
		flushSync()

		expect(selection()).toEqual(['true', 'false', 'false'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(1)
	})

	/** Чужому движку фасад умолчание не пишет: режим переполнения остаётся движка. */
	it('движок снаружи сохраняет режим переполнения тегов', async () => {
		const engine = createEngineSelect()

		engine.extensions.selection.mode = 'multiple'
		engine.extensions.tags.overflow = 'scroll'

		await render({ select: { engine }, items: [{ value: 'msk', text: 'Москва' }] })

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
		await render({
			select: { mode: 'multiple', value: ['msk', 'tver'] },
			items: [
				{ value: 'msk', text: 'Москва' },
				{ value: 'tver', text: 'Тверь' },
			],
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
 * Слот `tags` отдаёт инстанс тегов и его коллекцию — то, что встроенный
 * `Tags` берёт `ctrl` и `engine`. Свой ряд получает связку «опция ⇄ тег»
 * готовой.
 */
describe('слот tags', () => {
	const own = () => find(document, '.own', HTMLElement)
	const ownTexts = () =>
		[...own().querySelectorAll('.so-tags-item')].map((node) => node.textContent?.trim())

	it('свой ряд встаёт на место встроенного и получает выбранное тегами', () => {
		mount(Slots, { case: 'own-tags' })

		expect(document.querySelector('.so-select__tags')).toBeNull()
		expect(find(document, '.so-select__field .own-tags', HTMLElement).contains(own())).toBe(
			true,
		)
		expect(ownTexts()).toEqual(['Москва', 'Тверь'])
	})

	it('закрытый в своём ряду тег снимает выбор опции', async () => {
		const values: unknown[] = []

		mount(Slots, { case: 'own-tags', onChangeValue: (value) => values.push(value) })
		await nextFrame()

		click(find(own(), '.so-tags-item:first-child .so-tags-item__close', HTMLElement))

		expect(ownTexts()).toEqual(['Тверь'])
		expect(values.at(-1)).toEqual(['tver'])
	})

	it('без множественного выбора слота нет: тегов в поле не бывает', () => {
		mount(Slots, { case: 'own-tags', mode: 'single' })

		expect(document.querySelector('.own-tags')).toBeNull()
	})
})

describe('панель как телепортированный Frame', () => {
	it('класс и пометка владельцем доезжают до узла в body', () => {
		const { container } = mount(Harness, {})

		expect(document.body.contains(panel())).toBe(true)
		expect(panel().hasAttribute('data-owner')).toBe(true)
		expect(container.querySelector('.so-select__panel')).toBeNull()
	})

	it('нажатие внутрь панели её не закрывает', async () => {
		await render()
		await open()

		pointerDown(options()[0] as HTMLElement)
		flushSync()

		expect(isOpen()).toBe(true)
	})

	it('нажатие мимо закрывает', async () => {
		await render()
		await open()

		pointerDown(document.body)
		flushSync()

		expect(isOpen()).toBe(false)
	})

	it('корень несёт data-open для темы, aria-expanded — у поля, а не у корня', async () => {
		const { root } = await render()

		expect(root().getAttribute('data-open')).toBe('false')
		expect(root().hasAttribute('aria-expanded')).toBe(false)

		click(root())

		expect(root().getAttribute('data-open')).toBe('true')
		expect(field().getAttribute('aria-expanded')).toBe('true')
	})

	/** Frame по умолчанию не навязывает панели пиксельную высоту. */
	it('панель без инлайнового height в пикселях, высота списка — за темой', async () => {
		await render()
		await nextFrame()

		expect(panel().style.height).toBe('auto')
		expect(list().style.maxHeight).toBe('')
	})

	it('панель — ниже нижнего края поля', async () => {
		const { root } = await render()

		await open()

		expect(parseFloat(panel().style.top || '0')).toBeGreaterThanOrEqual(
			root().getBoundingClientRect().bottom,
		)
	})
})

describe('слоты поля', () => {
	it('leading и trailing пробрасываются в Input', () => {
		mount(Harness, {
			select: {
				leading: markup('<i class="probe-leading"></i>'),
				trailing: markup('<i class="probe-trailing"></i>'),
			},
		})

		expect(document.querySelector('.so-input__leading .probe-leading')).not.toBeNull()
		expect(document.querySelector('.so-input__trailing .probe-trailing')).not.toBeNull()
	})

	/** Слоты поля Select отдаёт всегда, как Vue свои шаблоны: обёртки стоят и без тегов. */
	it('обёртки поля по сторонам — и в single без слотов', () => {
		mount(Harness, {})

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
		mount(Harness, { select: { 'arrow-icon': markup('<i class="probe-arrow"></i>') } })

		expect(document.querySelector('.so-select__arrow .probe-arrow')).not.toBeNull()
		expect(document.querySelector('.so-select__arrow svg')).toBeNull()
	})

	it('trailing дополняет кнопку очистки и стрелку, а не заменяет их', () => {
		mount(Harness, {
			select: { clearable: true, trailing: markup('<i class="probe-trailing"></i>') },
		})

		expect(document.querySelector('.so-input__clear')).not.toBeNull()
		expect(document.querySelector('.so-select__arrow')).not.toBeNull()
		expect(document.querySelector('.probe-trailing')).not.toBeNull()
	})

	it('переопределённый field получает экземпляр TInput с role combobox в aria', () => {
		mount(Harness, {
			select: {
				field: scopeMarkup<{ field: IInput }>(
					({ field: input }) =>
						`<div class="probe-field">${String(input.aria.get('role'))}</div>`,
				),
			},
		})

		expect(find(document, '.probe-field', HTMLElement).textContent).toBe('combobox')
		expect(document.querySelector('.so-select__field')).toBeNull()
	})
})

/**
 * Атрибуты потребителя делятся, как у поля: класс и стиль — корню, остальное
 * и attachment-ы — `<input>` поля, поверх набора комбобокса.
 */
describe('атрибуты', () => {
	it('aria-label, title и data-* потребителя — на поле, класс и стиль — на корне', () => {
		const { root } = mount(Harness, {
			select: {
				class: 'mine',
				style: 'color: red',
				'aria-label': 'Город доставки',
				title: 'Подсказка',
				'data-probe': 'yes',
			},
		})

		expect([...root().classList].at(-1)).toBe('mine')
		expect(root().style.color).toBe('red')
		expect(field().getAttribute('aria-label')).toBe('Город доставки')
		expect(field().getAttribute('title')).toBe('Подсказка')
		expect(field().getAttribute('data-probe')).toBe('yes')
		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().hasAttribute('title')).toBe(false)
		expect(field().hasAttribute('class')).toBe(false)
	})

	/**
	 * Пропсы фасада — `mode`, `items`, `engine` — съедает связка фасада, и
	 * атрибутами в DOM они не уходят.
	 */
	it('пропсы фасада — не атрибуты', () => {
		const { root } = mount(Select, {
			mode: 'multiple',
			items: ITEMS,
			engine: createEngineSelect(),
		})

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(field().hasAttribute(name), name).toBe(false)
		}
	})
})

/**
 * Списочные свойства Select — та же тройка, что у ListBox: проп в разметке
 * доезжает до DOM панели и опций.
 */
describe('списочные свойства', () => {
	it('contentFit доезжает до data-content-fit каждой опции, по умолчанию — truncate', async () => {
		await render({ select: { contentFit: 'wrap' } })

		expect(options().map((option) => option.getAttribute('data-content-fit'))).toEqual([
			'wrap',
			'wrap',
			'wrap',
		])

		document.body.innerHTML = ''
		await render()

		expect(options()[0]?.getAttribute('data-content-fit')).toBe('truncate')
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

		mount(Harness, {})
		await flush()

		expect(plugin().placement).toBe('bottom-start')
		expect(plugin().flip).toBe(true)
		expect(plugin().matchWidth).toBe(true)
		expect(plugin().offset).toBe(4)
	})

	it('contentFit="expand" отвязывает ширину панели от поля', async () => {
		const plugin = anchorProbe()

		mount(Harness, { select: { contentFit: 'expand' } })
		await flush()

		expect(plugin().matchWidth).toBe(false)
	})

	it('смена placement на лету доходит до плагина', async () => {
		const plugin = anchorProbe()
		const props = reactiveProps<THarnessProps>({ select: { placement: 'top' } })

		mount(Harness, props)
		await flush()

		const steps: [TSelectPlacement, string, boolean][] = [
			['bottom', 'bottom-start', false],
			['auto', 'bottom-start', true],
			['top', 'top-start', false],
		]

		expect(plugin().placement).toBe('top-start')
		expect(plugin().flip).toBe(false)

		for (const [placement, side, flip] of steps) {
			props.select = { placement }
			flushSync()

			expect(plugin().placement, placement).toBe(side)
			expect(plugin().flip, placement).toBe(flip)
		}
	})

	it('якорь панели — корень Select', async () => {
		const plugin = anchorProbe()
		const { root } = mount(Harness, {})

		await flush()

		expect(plugin().anchor).toBe(root())
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин,
 * раскладку и настоящую мышь — браузер. Здесь — проводка: полоса и признак
 * «тянут» на телепортированной панели, а закрытие жестом доходит до
 * `onChangeOpen`.
 */
describe('жест', () => {
	const handle = () => document.querySelector('.so-select__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (kind: string, target: Element, y: number) =>
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

	it('без жеста полосы нет; с жестом — первая в панели, вне списка и немая для скринридера', () => {
		const ctrl = new TSelect()

		mount(Harness, { select: { ctrl } })

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')

		ctrl.swipe = 'handle'
		flushSync()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
		expect(handle()?.closest('[role="listbox"]')).toBeNull()

		ctrl.swipe = 'panel'
		flushSync()

		expect(handle()).not.toBeNull()
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после
	 * flip плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по
	 * полосе вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от поля — закрыта, onChangeOpen видит закрытие, признак «тянут» на панели', async () => {
		const opens: boolean[] = []
		const props = reactiveProps<THarnessProps>({})

		props.select = {
			swipe: 'handle',
			onChangeOpen: (value) => {
				opens.push(value)
				props.select = { ...props.select, open: value }
			},
		}

		await render(props)
		await open()

		expect(isOpen()).toBe(true)
		expect(panel().dataset['placement']).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 160))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 125)
		flushSync()

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('80px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 130)
		flushSync()

		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
		expect(opens).toEqual([true, false])
	})
})

/**
 * Отбор: скрытая опция размонтируется в DOM и при этом остаётся в коллекции —
 * составом владеют данные, а не разметка.
 */
describe('отбор опций из items', () => {
	async function renderSelect(props: SelectProps = {}) {
		const probe = engineProbe()

		mount(Select, { items: ITEMS, onEngineCreate: probe.onEngineCreate, ...props })
		await flush()
		await nextFrame()

		return probe.engine()
	}

	it('сужает список на экране, хранилище не трогает', async () => {
		const engine = await renderSelect()

		expect(options()).toHaveLength(4)

		engine.extensions.filter.query = 'тре'
		flushSync()

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('снятие отбора возвращает весь список', async () => {
		const engine = await renderSelect()

		engine.extensions.filter.query = 'тре'
		flushSync()
		engine.extensions.filter.clear()
		flushSync()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('отбор по тексту, а не по значению — поле сравнения ставит Select', async () => {
		const engine = await renderSelect()

		expect(engine.extensions.filter.fields).toEqual(['text'])

		// 'a' — это value первой опции, но по значению не ищем
		engine.extensions.filter.query = 'a'
		flushSync()

		expect(options()).toHaveLength(0)
	})

	it('пустой отбор показывает слот empty внутри списка', async () => {
		const engine = await renderSelect({ empty: markup('<p class="probe-empty">Пусто</p>') })

		expect(document.querySelector('.probe-empty')).toBeNull()

		engine.extensions.filter.query = 'ничего такого нет'
		flushSync()

		expect(options()).toHaveLength(0)
		expect(find(document, '.probe-empty', HTMLElement).parentElement).toBe(list())
	})

	it('выбор скрытой опции не теряется', async () => {
		const engine = await renderSelect({ value: 'a' })

		engine.extensions.filter.query = 'тре'
		flushSync()

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.clear()
		flushSync()

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
	async function renderSelect(props: SelectProps = {}) {
		const probe = engineProbe()

		mount(Select, { items: ITEMS, onEngineCreate: probe.onEngineCreate, ...props })
		await flush()
		await nextFrame()

		return probe.engine()
	}

	it('editableMode: filter — набранное сужает список', async () => {
		const engine = await renderSelect({ editable: true, editableMode: 'filter' })

		type('тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.filter.query).toBe('тре')
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('editableMode: search — список остаётся целым', async () => {
		const engine = await renderSelect({ editable: true, editableMode: 'search' })

		type('тре')

		expect(options()).toHaveLength(4)
		expect(engine.extensions.filter.query).toBe('')
	})

	it('без editable ввод не слушается вовсе', async () => {
		const engine = await renderSelect({ editableMode: 'filter' })

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
		const engine = await renderSelect({ editable: true, editableMode: 'filter', value: 'a' })

		type('тре')

		expect(texts()).toEqual(['Третий'])

		press('Escape')

		expect(engine.extensions.filter.query).toBe('тре')
		expect(field().value).toBe('тре')

		press('Escape')

		expect(field().value).toBe('Первый')
		expect(engine.extensions.filter.query).toBe('тре')

		await nextFrame()

		expect(engine.extensions.filter.query).toBe('')
		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect(field().value).toBe('Первый')
	})

	it('несовпавший текст, Esc, Esc, ↓ — поле остаётся пустым', async () => {
		await renderSelect({ editable: true })

		type('несуществующий текст')
		press('Escape')
		press('Escape')

		expect(field().value).toBe('')

		press('ArrowDown')

		expect(field().value).toBe('')
	})

	it('multiple: Enter добавляет тег и очищает поле, включая перерисовку', async () => {
		await renderSelect({ editable: true, mode: 'multiple' })

		type('Пер')
		press('Enter')

		expect(field().value).toBe('')
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(1)
	})

	it('single: Enter на уже выбранной опции возвращает её текст в поле', async () => {
		const engine = await renderSelect({ editable: true, value: 'c' })

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
 * `visible` (`TSelectExtension`).
 */
describe('опции разметки под отбором', () => {
	async function renderMarkup(select: SelectProps = {}) {
		const probe = engineProbe()

		await render({
			select: { onEngineCreate: probe.onEngineCreate, ...select },
			items: ITEMS,
		})
		await flush()

		return probe.engine()
	}

	it('отбор из кода прячет несовпавшие опции, из коллекции они не уходят', async () => {
		const engine = await renderMarkup()

		expect(visibleTexts()).toHaveLength(4)

		engine.extensions.filter.query = 'вто'
		flushSync()

		expect(visibleTexts()).toEqual(['Второй'])
		expect(engine.extensions.batch.items).toHaveLength(4)

		engine.extensions.filter.clear()
		flushSync()

		expect(visibleTexts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('ввод в поле прячет несовпавшие опции', async () => {
		const engine = await renderMarkup({ editable: true, editableMode: 'filter' })

		type('вто')

		expect(engine.extensions.filter.query).toBe('вто')
		expect(visibleTexts()).toEqual(['Второй'])
	})
})

describe('готовая коллекция', () => {
	it('рисует опции движка уровня 1, добавленное в него — тоже', () => {
		const engine = createEngine<{ value: string; text: string }>({ items: ITEMS.slice(0, 2) })

		mount(Select, { engine })

		expect(options()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		flushSync()

		expect(options()).toHaveLength(3)
	})

	/**
	 * Фасад собирается конструктором из тех же пропсов, и `items` он уже
	 * записал: связка, получив те же пропсы в эффекте, второй раз их не пишет.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<{ value: string; text: string }>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		mount(Select, { engine, items: ITEMS })

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
		mount(Harness, {})

		expect(document.querySelectorAll('.so-select-item__indicator')).toHaveLength(0)
	})

	it('обёртка у каждой опции, иконка — у выбранной, обёртка немая', async () => {
		await render({ select: { indicator: 'start' } })

		expect(document.querySelectorAll('.so-select-item__indicator')).toHaveLength(3)
		expect(marked()).toEqual([false, false, false])
		expect(
			document.querySelector('.so-select-item__indicator')?.getAttribute('aria-hidden'),
		).toBe('true')

		await open()
		click(options()[1] as HTMLElement)

		expect(marked()).toEqual([false, true, false])
	})

	it('end уносит отметку в конец строки, start — в начало', async () => {
		/** Сторона отметки относительно текста строки. */
		const sideOf = (option: Element) => {
			const parts = [...option.children]
			const indicator = parts.findIndex((node) =>
				node.classList.contains('so-select-item__indicator'),
			)
			const text = parts.findIndex((node) => node.classList.contains('so-button__text'))

			return indicator < text ? 'start' : 'end'
		}

		mount(Harness, { select: { indicator: 'end' } })

		expect(sideOf(options()[0] as HTMLElement)).toBe('end')

		document.body.innerHTML = ''
		mount(Harness, { select: { indicator: 'start' } })

		expect(sideOf(options()[0] as HTMLElement)).toBe('start')
	})
})

/**
 * Проброс целиком: у каждого слота опции есть `item-<слот>`, и его scope —
 * scope слота опции плюс сама опция.
 */
describe('слоты опций', () => {
	it('item получает text и selected опции, selected следует за выбором', async () => {
		mount(Select, {
			items: ITEMS.slice(0, 2),
			item: scopeText<TItemRowScope>(
				({ item, text, selected }) => `${String(item.value)}:${text}:${String(selected)}`,
			),
		})
		await nextFrame()

		expect(texts()).toEqual(['a:Первый:false', 'b:Второй:false'])

		click(options()[1] as HTMLElement)

		expect(texts()).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	it('item-leading и item-trailing получают опцию через scope', () => {
		mount(Select, {
			items: ITEMS.slice(0, 2),
			'item-leading': scopeMarkup<TItemScope>(
				({ item }) => `<u class="lead">${String(item.value)}</u>`,
			),
			'item-trailing': scopeMarkup<TItemScope>(
				({ item }) => `<s class="trail">${String(item.value)}</s>`,
			),
		})

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
	 * Сниппет непрозрачен: заданный Select проброс отметки стоит у каждой
	 * опции вместо своей иконки, даже где сниппет пуст.
	 */
	it('item-indicator-icon задан — у каждой опции вместо своей иконки', async () => {
		mount(Slots, { case: 'indicator' })
		await nextFrame()

		click(options()[0] as HTMLElement)
		click(options()[1] as HTMLElement)

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

	it('children опции разметки получает text и selected, без него — text', async () => {
		await render({
			items: [
				{
					value: 'a',
					text: 'A',
					children: scopeText<TRowScope>(
						({ text, selected }) => `${text}:${String(selected)}`,
					),
				},
				{ value: 'b', text: 'B' },
			],
		})

		expect(texts()).toEqual(['A:false', 'B'])

		await open()
		click(options()[0] as HTMLElement)

		expect(texts()).toEqual(['A:true', 'B'])
	})
})

/**
 * Группы из данных — метка `_.group` в `items` или `groupBy`, порядок и
 * подписи — `groups`: список рисует секциями, группа — `Select.Group` с
 * `role="group"` и именем от подписи.
 */
describe('группы из данных', () => {
	/** В данных «Морковь» стоит между фруктами, у «Воды» группы нет. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']

	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

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

	it('группы с подписью, без группы — последними; разделителей по умолчанию нет', async () => {
		mount(Select, { items: MIXED, groups: GROUPS })
		await nextFrame()

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

	it('groupSeparators — немой разделитель только между соседними секциями, и на лету', () => {
		const props = reactiveProps<SelectProps>({ items: MIXED, groups: GROUPS })

		mount(Select, props)

		expect(parts()).toEqual(SECTIONS)

		props.groupSeparators = true
		flushSync()

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-select__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		props.groupSeparators = false
		flushSync()

		expect(parts()).toEqual(SECTIONS)
	})

	it('стрелки подсвечивают опции порядком экрана', async () => {
		mount(Select, { items: MIXED, groups: GROUPS })
		await nextFrame()

		press('ArrowDown')

		expect(active()).toBe('Яблоко')

		press('ArrowDown')

		expect(active()).toBe('Груша')

		press('ArrowDown')

		expect(active()).toBe('Морковь')
	})

	it('отбор убрал все опции группы — нет и её подписи', async () => {
		mount(Select, { items: MIXED, groups: GROUPS, editable: true, editableMode: 'filter' })
		await nextFrame()

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
 * берут лифтом, подпись группа регистрирует сама. Панель телепортирована, и
 * лифт Select опции и группа читают в ней из контекстов места `Teleport`.
 */
describe('группы разметки', () => {
	it('секции — группа разметки с подписью; стрелки — порядком экрана', async () => {
		const engine: TSelectCollection = createEngineSelect()

		mount(Slots, { case: 'groups', engine })
		await nextFrame()

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
			visited.push(
				document
					.getElementById(field().getAttribute('aria-activedescendant') ?? '')
					?.textContent?.trim(),
			)
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша'])
	})
})

describe('типы', () => {
	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[TItemRowScope]>>().toExtend<NonNullable<SelectProps['item']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<SelectProps['item-leading']>>()
		expectTypeOf<Snippet<[TItemScope & { selected: boolean }]>>().toExtend<
			NonNullable<SelectProps['item-indicator-icon']>
		>()
		expectTypeOf<Snippet<[{ field: IInput }]>>().toExtend<NonNullable<SelectProps['field']>>()
		expectTypeOf<Snippet<[{ clear: () => void }]>>().toExtend<
			NonNullable<SelectProps['clear']>
		>()
		expectTypeOf<Snippet<[TRowScope]>>().toExtend<NonNullable<SelectItemProps['children']>>()
		expectTypeOf<SelectGroupProps['children']>().toEqualTypeOf<Snippet | undefined>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<SelectProps>().toHaveProperty('onChangeValue')
		expectTypeOf<SelectProps>().toHaveProperty('onChangeOpen')
		expectTypeOf<SelectProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<SelectItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<SelectItemProps>().toHaveProperty('onChangeOrder')
	})
})
