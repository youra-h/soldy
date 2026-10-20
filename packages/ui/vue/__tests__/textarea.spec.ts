/**
 * Textarea во Vue — проводка целиком, на настоящей разметке.
 *
 * Свойства, `aria` и `data-limit` считает ядро (`core/__tests__/textarea.spec.ts`),
 * текст счётчика и высоту — плагины (`plugins/__tests__/names.plugin.spec.ts`,
 * `textarea-autoresize.plugin.spec.ts`), раскладку и настоящий ввод — браузер
 * (`playground/vue/browser/textarea.spec.ts`). Здесь важно, что они сходятся
 * в разметке: наборы на своих узлах, нативные атрибуты у `<textarea>`, ввод —
 * в `v-model`, счётчик по локали поддерева — пояснением поля, — и подпись и
 * справка поля формы `Field`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { TTextarea } from '@soldy-ui/core'
import type { ITextareaProps } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Field, LocaleProvider, Textarea } from '@soldy-ui/vue'

/** Плагины цепляют слушатели по `element:ready`, а оно приходит кадром. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Поле в документе; `v-model` — по-настоящему: значение возвращается пропом. */
async function render(props: Partial<ITextareaProps> & Record<string, unknown> = {}) {
	const mounted = mount(Textarea, {
		props: {
			...props,
			'onUpdate:value': (value: string) => mounted.setProps({ value }),
		},
		attachTo: document.body,
	})

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function field(): HTMLTextAreaElement {
	const node = document.querySelector('.so-textarea textarea')

	if (!(node instanceof HTMLTextAreaElement)) throw new Error('поля нет')

	return node
}

/** Набор текста, как у пользователя: значение в узле, затем `input`. */
async function type(text: string): Promise<void> {
	field().value = text
	field().dispatchEvent(new Event('input', { bubbles: true }))
	await nextTick()
}

const counter = () => document.querySelector('.so-textarea__counter')

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

describe('разметка', () => {
	it('корень — div с классами и dataset, внутри — поле без класса', async () => {
		await render({ size: 'lg', readonly: true, required: true, direction: 'rtl' })

		const root = find('.so-textarea')

		expect(root.localName).toBe('div')
		expect([...root.classList]).toEqual(
			expect.arrayContaining([
				'so-textarea',
				'so-textarea--size-lg',
				'so-textarea--readonly',
				'so-textarea--required',
			]),
		)
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		expect([...root.children].map((node) => node.localName)).toEqual(['textarea'])
		expect(field().className).toBe('')
		expect(field().hasAttribute('dir')).toBe(false)
	})

	it('корень рисуется по tag', async () => {
		await render({ tag: 'section' })

		expect(find('.so-textarea').localName).toBe('section')
	})

	it('нативные атрибуты — у <textarea>: id, name, rows, maxlength, placeholder', async () => {
		await render({
			id: 'about',
			name: 'about',
			rows: 4,
			maxlength: 200,
			placeholder: 'О себе',
			value: 'Текст',
		})

		const textarea = field()

		expect([textarea.id, textarea.name, textarea.placeholder]).toEqual([
			'about',
			'about',
			'О себе',
		])
		expect([textarea.rows, textarea.maxLength]).toEqual([4, 200])
		expect(textarea.value).toBe('Текст')
	})

	it('без rows — две строки, как у браузера; без maxlength — атрибута нет', async () => {
		await render()

		expect(field().getAttribute('rows')).toBe('2')
		expect(field().hasAttribute('maxlength')).toBe(false)
	})

	it('disabled, readonly, required — нативные, без ARIA-дублей; имя — у поля', async () => {
		await render({ disabled: true, readonly: true, required: true, aria_label: 'О себе' })

		const textarea = field()

		expect([textarea.disabled, textarea.readOnly, textarea.required]).toEqual([
			true,
			true,
			true,
		])
		expect(textarea.hasAttribute('aria-disabled')).toBe(false)
		expect(textarea.hasAttribute('aria-readonly')).toBe(false)
		// Поле только для чтения браузер не проверяет — обязательность скажет ARIA
		expect(textarea.getAttribute('aria-required')).toBe('true')
		expect(textarea.getAttribute('aria-label')).toBe('О себе')
		expect(find('.so-textarea').hasAttribute('disabled')).toBe(false)
		expect(find('.so-textarea').dataset.disabled).toBe('true')
	})

	it('атрибуты потребителя: класс и стиль — корню, остальное — полю', async () => {
		await render({
			class: 'probe',
			style: 'width: 300px',
			'data-probe': 'x',
			autocomplete: 'off',
		})

		const root = find('.so-textarea')

		expect(root.classList.contains('probe')).toBe(true)
		expect(root.style.width).toBe('300px')
		expect(field().dataset.probe).toBe('x')
		expect(field().getAttribute('autocomplete')).toBe('off')
		expect(root.hasAttribute('data-probe')).toBe(false)
	})
})

describe('ввод', () => {
	it('набранное — в value и v-model', async () => {
		const mounted = await render({ value: 'а' })

		await type('а\nб')

		expect(mounted.emitted('update:value')?.at(-1)).toEqual(['а\nб'])
		expect(mounted.props('value')).toBe('а\nб')
	})

	it('readonly — ввод в значение не уходит', async () => {
		const mounted = await render({ value: 'а', readonly: true })

		await type('аб')

		expect(mounted.emitted('update:value')).toBeUndefined()
	})

	it('значение из кода — в поле', async () => {
		const ctrl = new TTextarea({ value: 'а' })

		await render({ ctrl })

		ctrl.value = 'новое'
		await nextTick()

		expect(field().value).toBe('новое')
	})
})

describe('счётчик', () => {
	it('без counter счётчика нет', async () => {
		await render({ value: 'abc', maxlength: 10 })

		expect(counter()).toBeNull()
	})

	it('без предела — одно число, с пределом — набрано / предел; следует за вводом', async () => {
		const mounted = await render({ value: 'abc', counter: true })

		expect(counter()?.textContent).toBe('3')

		await mounted.setProps({ maxlength: 200 })

		expect(counter()?.textContent).toBe('3 / 200')

		await type('abcd')

		expect(counter()?.textContent).toBe('4 / 200')
	})

	it('data-limit корня: ровно предел — reached, больше — exceeded, меньше — нет', async () => {
		const mounted = await render({ value: 'abc', maxlength: 3, counter: true })
		const root = find('.so-textarea')

		expect(root.dataset.limit).toBe('reached')

		await mounted.setProps({ value: 'abcd' })

		expect(root.dataset.limit).toBe('exceeded')
		expect(counter()?.textContent).toBe('4 / 3')

		await mounted.setProps({ value: 'ab' })

		expect(root.hasAttribute('data-limit')).toBe(false)
	})

	it('счётчик — пояснение поля: aria-describedby на его id, без живого региона', async () => {
		const mounted = await render({ value: 'abc', maxlength: 200, counter: true })
		const id = counter()?.id ?? ''

		expect(id).not.toBe('')
		expect(field().getAttribute('aria-describedby')).toBe(id)
		expect(counter()?.hasAttribute('aria-live')).toBe(false)

		await mounted.setProps({ counter: false })

		expect(counter()).toBeNull()
		expect(field().hasAttribute('aria-describedby')).toBe(false)

		await mounted.setProps({ counter: true })

		expect(field().getAttribute('aria-describedby')).toBe(counter()?.id)
	})

	it('своё пояснение — после счётчика', async () => {
		await render({ counter: true, aria_describedBy: 'hint' })

		expect(field().getAttribute('aria-describedby')).toBe(`${counter()?.id} hint`)
	})

	it('под провайдером — числа по его локали', async () => {
		wrapper = mount(() =>
			h(LocaleProvider, { locale: ruRU }, () =>
				h(Textarea, { value: 'x'.repeat(1234), maxlength: 5000, counter: true }),
			),
		)
		await nextTick()

		expect(wrapper.find('.so-textarea__counter').text()).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)
	})
})

describe('авторост', () => {
	it('включён — ручки нет; выключили — стили автороста сняты', async () => {
		const mounted = await render({ autoresize: true })

		expect(field().style.resize).toBe('none')

		await mounted.setProps({ autoresize: false })
		await nextFrame()

		expect(field().style.resize).toBe('')
		expect(field().style.overflowY).toBe('')
		expect(field().style.height).toBe('')
	})

	it('без автороста инлайн-стилей у поля нет', async () => {
		await render({ value: 'текст' })

		expect(field().getAttribute('style')).toBeNull()
	})
})

describe('в поле формы', () => {
	it('подпись называет поле своим for — на id поля, ссылки нет', async () => {
		wrapper = mount(() => h(Field, { label: 'О себе' }, () => h(Textarea)), {
			attachTo: document.body,
		})
		await nextTick()
		await nextFrame()

		const textarea = field()

		expect(textarea.id).not.toBe('')
		expect(find('.so-field__label').getAttribute('for')).toBe(textarea.id)
		expect(textarea.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('в aria-describedby поля — справка, за ней счётчик', async () => {
		wrapper = mount(
			() =>
				h(Field, { label: 'О себе', helper: 'Подсказка' }, () =>
					h(Textarea, { counter: true, maxlength: 200 }),
				),
			{ attachTo: document.body },
		)
		await nextTick()
		await nextFrame()

		expect(refsOf(field(), 'aria-describedby')).toEqual([
			find('.so-field__helper').id,
			find('.so-textarea__counter').id,
		])
	})

	it('ссылка на счётчик есть уже в серверной разметке', async () => {
		const app = createSSRApp({
			render: () =>
				h(Field, { label: 'О себе', helper: 'Подсказка' }, () =>
					h(Textarea, { counter: true, maxlength: 200 }),
				),
		})
		const host = document.createElement('div')

		host.innerHTML = await renderToString(app)

		const parts = ['.so-field__helper', '.so-textarea__counter'].map(
			(selector) => host.querySelector(selector)?.id ?? '',
		)
		const textarea = host.querySelector('textarea')

		expect(parts).not.toContain('')
		expect(textarea && refsOf(textarea, 'aria-describedby')).toEqual(parts)
	})
})
