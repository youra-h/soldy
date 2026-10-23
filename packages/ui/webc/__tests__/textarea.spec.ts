/**
 * `<div is="so-textarea">` — многострочное поле, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у Vue (`textarea.spec.ts`), React и Angular, без
 * сервера и `act`. Свойства, `aria` и `data-limit` считает ядро, текст
 * счётчика и высоту — плагины, раскладку и настоящий ввод — браузер
 * (`playground/vue/browser/textarea.spec.ts`). Здесь важно, что они сходятся
 * в разметке: наборы на своих узлах, нативные атрибуты у `<textarea>`, ввод —
 * в ядро и событие `so:change:value`, счётчик по локали поддерева —
 * пояснением поля, — и подпись и справка поля формы.
 *
 * Угол зрения здесь свой, как у Input. Корень — элемент потребителя, и
 * статические атрибуты разметки на нём база переносит на `<textarea>`, кроме
 * класса, стиля и входов пропов. `id` — проп поля, а не вход корня.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTextarea } from '@soldy-ui/core'
import { ruRU, zhCN } from '@soldy-ui/plugins'
import { TextareaDescriptor } from '@soldy-ui/setup'
import {
	TLocaleProviderElement,
	TTextareaElement,
	type TTextareaElementProps,
} from '@soldy-ui/webc'
import { textareaTemplate } from '../src/components/textarea/textarea.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

function isTextarea(node: Element | null): node is TTextareaElementProps {
	return node instanceof TTextareaElement
}

/** Разметка в неподключённом узле: до вставки можно найти узлы и повесить слушатели. */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

/** Поле soldy в разметке. */
function textareaOf(root: ParentNode): TTextareaElementProps {
	const node = root.querySelector('[is="so-textarea"]')

	if (!isTextarea(node)) throw new Error('<div is="so-textarea"> нет')

	return node
}

/** Поле soldy из разметки, подключённое к документу; узел другой — тест падает здесь. */
function mount(html: string): TTextareaElementProps {
	const host = markup(html)

	document.body.appendChild(host)

	return textareaOf(host)
}

/** Поле над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(ctrl: TTextarea): TTextareaElementProps {
	const node = document.createElement('div', { is: 'so-textarea' })

	if (!isTextarea(node)) throw new Error('<div is="so-textarea"> нет')

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** `<textarea>` внутри корня. */
const field = (root: ParentNode = document) => find(root, 'textarea', HTMLTextAreaElement)

/** Счётчик символов; нет его — `null`. */
const counter = (root: ParentNode) => root.querySelector('.so-textarea__counter')

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(node: HTMLTextAreaElement, text: string): void {
	node.value = text
	node.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Textarea · разметка', () => {
	it('корень — div потребителя с классами и dataset, внутри — поле без класса', () => {
		const el = mount('<div is="so-textarea" size="lg" readonly required direction="rtl"></div>')

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect([...el.classList]).toEqual(
			expect.arrayContaining([
				'so-textarea',
				'so-textarea--size-lg',
				'so-textarea--readonly',
				'so-textarea--required',
			]),
		)
		expect(el.dataset['disabled']).toBe('false')
		expect(el.getAttribute('dir')).toBe('rtl')
		expect([...el.children].map((node) => node.localName)).toEqual(['textarea'])
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('dir')).toBe(false)
		expect(el.ctrl?.tag).toBe('div')
	})

	it('пробелы в разметке не приносят узлов', () => {
		const el = mount(`<div is="so-textarea">
		</div>`)

		expect(el.childNodes).toHaveLength(1)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — ни одного', () => {
		const root = document.createElement('div')
		const targets = textareaTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(TextareaDescriptor().slots.map((slot) => slot.name))
		expect(Object.keys(targets)).toEqual([])
	})
})

describe('Textarea · атрибуты', () => {
	it('нативные атрибуты — у <textarea>: id, name, rows, maxlength, placeholder', () => {
		const el = mount(
			'<div is="so-textarea" id="about" name="about" rows="4" maxlength="200" placeholder="О себе" value="Текст"></div>',
		)
		const node = field(el)

		expect([node.id, node.name, node.placeholder]).toEqual(['about', 'about', 'О себе'])
		expect([node.rows, node.maxLength]).toEqual([4, 200])
		expect(node.value).toBe('Текст')
	})

	it('без rows — две строки, как у браузера; без maxlength — атрибута нет', () => {
		const node = field(mount('<div is="so-textarea"></div>'))

		expect(node.getAttribute('rows')).toBe('2')
		expect(node.hasAttribute('maxlength')).toBe(false)
	})

	it('disabled, readonly, required — нативные, без ARIA-дублей; имя — у поля', () => {
		const el = mount(
			'<div is="so-textarea" disabled readonly required aria_label="О себе"></div>',
		)
		const node = field(el)

		expect([node.disabled, node.readOnly, node.required]).toEqual([true, true, true])
		expect(node.hasAttribute('aria-disabled')).toBe(false)
		expect(node.hasAttribute('aria-readonly')).toBe(false)
		// Поле только для чтения браузер не проверяет — обязательность скажет ARIA
		expect(node.getAttribute('aria-required')).toBe('true')
		expect(node.getAttribute('aria-label')).toBe('О себе')
		expect(el.dataset['disabled']).toBe('true')
	})

	/** У `div` своего `disabled` нет: ядро его на корень не пишет. */
	it('disabled из кода — на поле, на корне атрибута нет', async () => {
		const el = mount('<div is="so-textarea"></div>')

		el.disabled = true
		await flush()

		expect(field(el).disabled).toBe(true)
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	it('maxlength из кода — на поле, снятый — атрибута нет', async () => {
		const el = mount('<div is="so-textarea"></div>')

		el.maxlength = 10
		await flush()

		expect(field(el).maxLength).toBe(10)

		el.maxlength = undefined
		await flush()

		expect(field(el).hasAttribute('maxlength')).toBe(false)
	})
})

/**
 * Атрибуты потребителя делятся, как у Input: класс и стиль — корню,
 * статические атрибуты разметки — полю, поверх его `aria`. Входы пропов
 * остаются на корне: через них потребитель задаёт пропы.
 */
describe('Textarea · атрибуты разметки', () => {
	it('класс и стиль — на корне, autocomplete, aria-label и data-* — на поле', () => {
		const el = mount(
			'<div is="so-textarea" class="app-field" style="flex: 1" data-testid="field" autocomplete="off" aria-label="О себе" name="about"></div>',
		)
		const node = field(el)

		expect(el.classList.contains('so-textarea')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.flex).not.toBe('')
		expect(
			['data-testid', 'autocomplete', 'aria-label'].filter((name) => el.hasAttribute(name)),
		).toEqual([])

		expect(node.hasAttribute('class')).toBe(false)
		expect(node.hasAttribute('style')).toBe(false)
		expect(node.getAttribute('data-testid')).toBe('field')
		expect(node.getAttribute('autocomplete')).toBe('off')
		expect(node.getAttribute('aria-label')).toBe('О себе')
	})

	it('вход пропа остаётся на корне и доходит до ядра, а на поле — значение ядра', () => {
		const el = mount('<div is="so-textarea" name="about"></div>')

		expect(el.getAttribute('name')).toBe('about')
		expect(field(el).name).toBe('about')
	})

	it('id — только у <textarea>, ctrl.id совпадает с ним', () => {
		const el = mount('<div is="so-textarea" id="about"></div>')

		expect(el.hasAttribute('id')).toBe(false)
		expect(field(el).id).toBe('about')
		expect(el.ctrl?.id).toBe('about')
		expect(document.querySelectorAll('#about')).toHaveLength(1)
	})

	/** Всплывающее событие поля доходит до слушателя на корне само. */
	it('слушатель на корне слышит keydown поля', () => {
		const el = mount('<div is="so-textarea"></div>')
		const keys: string[] = []

		el.addEventListener('keydown', (event) => keys.push(event.key))
		field(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(keys).toEqual(['a'])
	})
})

describe('Textarea · ввод', () => {
	it('набранное — в ctrl.value и одним so:change:value', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const el = mountCtrl(ctrl)
		const changes = collect(el, 'so:change:value')

		await nextFrame()
		type(field(el), 'а\nб')
		await flush()

		expect(ctrl.value).toBe('а\nб')
		expect(field(el).value).toBe('а\nб')
		expect(changes).toEqual([{ newValue: 'а\nб', oldValue: 'а' }])
	})

	it('readonly — ввод в значение не уходит', async () => {
		const el = mount('<div is="so-textarea" value="а" readonly></div>')
		const changes = collect(el, 'so:change:value')

		await nextFrame()
		type(field(el), 'аб')
		await flush()

		expect(changes).toEqual([])
	})

	/**
	 * Узел уже держит набранное, и шаблон его не трогает: запись того же
	 * текста сбросила бы каретку в конец, а набор через IME — прервала бы.
	 */
	it('набор не переписывает поле', async () => {
		const el = mount('<div is="so-textarea"></div>')

		await nextFrame()

		const write = vi.spyOn(field(el), 'value', 'set')

		type(field(el), 'abc')
		await flush()

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	it('значение из кода — в поле, и после ввода тоже', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const el = mountCtrl(ctrl)

		await nextFrame()
		type(field(el), 'аб')

		ctrl.value = 'новое'
		await flush()

		expect(field(el).value).toBe('новое')
	})

	it('снятый атрибут value возвращает пустое поле', async () => {
		const el = mount('<div is="so-textarea" value="abc"></div>')

		el.removeAttribute('value')
		await flush()

		expect(field(el).value).toBe('')
	})
})

describe('Textarea · счётчик', () => {
	it('без counter счётчика нет', () => {
		expect(counter(mount('<div is="so-textarea" value="abc" maxlength="10"></div>'))).toBeNull()
	})

	it('без предела — одно число, с пределом — набрано / предел; следует за вводом', async () => {
		const el = mount('<div is="so-textarea" value="abc" counter></div>')

		expect(counter(el)?.textContent).toBe('3')

		el.maxlength = 200
		await flush()

		expect(counter(el)?.textContent).toBe('3 / 200')

		await nextFrame()
		type(field(el), 'abcd')
		await flush()

		expect(counter(el)?.textContent).toBe('4 / 200')
	})

	it('счётчик — под полем, в корне', () => {
		const el = mount('<div is="so-textarea" counter></div>')

		expect([...el.children].map((node) => `${node.localName}.${node.className}`)).toEqual([
			'textarea.',
			'div.so-textarea__counter',
		])
	})

	it('data-limit корня: ровно предел — reached, больше — exceeded, меньше — нет', async () => {
		const el = mount('<div is="so-textarea" value="abc" maxlength="3" counter></div>')

		expect(el.dataset['limit']).toBe('reached')

		el.value = 'abcd'
		await flush()

		expect(el.dataset['limit']).toBe('exceeded')
		expect(counter(el)?.textContent).toBe('4 / 3')

		el.value = 'ab'
		await flush()

		expect(el.hasAttribute('data-limit')).toBe(false)
	})

	it('счётчик — пояснение поля: aria-describedby на его id, без живого региона', async () => {
		const el = mount('<div is="so-textarea" value="abc" maxlength="200" counter></div>')
		const id = counter(el)?.id ?? ''

		expect(id).not.toBe('')
		expect(field(el).getAttribute('aria-describedby')).toBe(id)
		expect(counter(el)?.hasAttribute('aria-live')).toBe(false)

		el.counter = false
		await flush()

		expect(counter(el)).toBeNull()
		expect(field(el).hasAttribute('aria-describedby')).toBe(false)

		el.counter = true
		await flush()

		expect(field(el).getAttribute('aria-describedby')).toBe(counter(el)?.id)
	})

	it('своё пояснение — после счётчика', () => {
		const el = mount('<div is="so-textarea" counter aria_described-by="hint"></div>')

		expect(field(el).getAttribute('aria-describedby')).toBe(`${counter(el)?.id} hint`)
	})

	it('числа и шаблон — по локали поддерева, смена — без пересборки', async () => {
		const host = markup(
			'<so-locale-provider><div is="so-textarea" maxlength="5000" counter></div></so-locale-provider>',
		)
		const provider = host.firstElementChild
		const el = textareaOf(host)

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		el.value = 'x'.repeat(1234)
		provider.locale = ruRU
		document.body.appendChild(host)
		await flush()

		const node = counter(el)

		expect(node?.textContent).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)

		provider.locale = zhCN
		await flush()

		expect(counter(el)).toBe(node)
		expect(node?.textContent).toBe(
			`${(1234).toLocaleString('zh-CN')} / ${(5000).toLocaleString('zh-CN')}`,
		)
	})
})

describe('Textarea · авторост', () => {
	it('включён — ручки нет; выключили — стили автороста сняты', async () => {
		const el = mount('<div is="so-textarea" autoresize></div>')

		await nextFrame()

		expect(field(el).style.resize).toBe('none')

		el.autoresize = false
		await flush()
		await nextFrame()

		expect(field(el).style.resize).toBe('')
		expect(field(el).style.overflowY).toBe('')
		expect(field(el).style.height).toBe('')
	})

	it('без автороста инлайн-стилей у поля нет', async () => {
		const el = mount('<div is="so-textarea" value="текст"></div>')

		await nextFrame()

		expect(field(el).hasAttribute('style')).toBe(false)
	})
})

describe('Textarea · в поле формы', () => {
	it('подпись называет поле своим for — на id поля, ссылки нет', async () => {
		mount('<div is="so-field" label="О себе"><div is="so-textarea"></div></div>')
		await flush()

		const node = field()

		expect(node.id).not.toBe('')
		expect(find(document, '.so-field__label', HTMLLabelElement).htmlFor).toBe(node.id)
		expect(node.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('в aria-describedby поля — справка, за ней счётчик', async () => {
		mount(
			'<div is="so-field" label="О себе" helper="Подсказка"><div is="so-textarea" counter maxlength="200"></div></div>',
		)
		await flush()

		expect(refsOf(field(), 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
			find(document, '.so-textarea__counter', HTMLElement).id,
		])
	})
})

/**
 * Форма видит поле сама: `<textarea>` лежит в обычном DOM страницы, и
 * связанного с формой элемента не нужно.
 */
describe('Textarea · в форме', () => {
	it('FormData получает текст поля', () => {
		const host = markup(`<form>
			<div is="so-textarea" name="about" value="Текст"></div>
		</form>`)

		document.body.appendChild(host)

		expect([...new FormData(find(host, 'form', HTMLFormElement))]).toEqual([['about', 'Текст']])
	})
})
