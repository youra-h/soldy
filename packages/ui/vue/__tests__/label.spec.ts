/**
 * Label во Vue: подпись вокруг контрола.
 *
 * Корень — `label`, внутри две части: контрол (слот `default`) и текст (слот
 * `content`, без него — проп `text`). Связи через `for` и `id` нет: контрол —
 * первый labelable-потомок `label`, поэтому клик по тексту переключает его, а
 * текст становится его доступным именем.
 *
 * Раскладку сторон и выравнивание по первой строке jsdom не считает — их
 * проверяет `playground/vue/browser/label.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type Component } from 'vue'
import { CheckBox, Label, RadioGroup, Switch } from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

/** Смонтировать разметку в документ: клик по подписи браузер доводит до поля. */
async function render(content: () => unknown): Promise<ReturnType<typeof mount>> {
	const mounted = mount(defineComponent({ render: content }), { attachTo: document.body })

	wrapper = mounted

	// Слушатели поля плагины вешают кадром позже, по `ready` узла
	await nextTick()
	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find<T extends Element>(selector: string, type: new () => T): T {
	const element = document.querySelector(selector)

	if (!(element instanceof type)) throw new Error(`${selector}: нужного узла нет`)

	return element
}

describe('разметка', () => {
	it('корень — label, внутри контрол, потом текст', () => {
		const label = mount(Label, {
			props: { text: 'Согласен' },
			slots: { default: () => h(CheckBox) },
		})

		expect(label.element.localName).toBe('label')
		expect(label.classes()).toEqual([
			's-label',
			's-label--size-normal',
			's-label--position-end',
		])
		expect([...label.element.children].map((part) => part.className)).toEqual([
			's-label__control',
			's-label__text',
		])
		expect(label.find('.s-label__control > .s-check-box input').exists()).toBe(true)
		expect(label.find('.s-label__text').text()).toBe('Согласен')
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(Label, { props: { tag: 'span' } }).element.localName).toBe('span')
	})

	it('смена position меняет модификатор стороны', async () => {
		const label = mount(Label, { props: { position: 'start' } })

		expect(label.classes()).toContain('s-label--position-start')

		await label.setProps({ position: 'top' })

		expect(label.classes()).toContain('s-label--position-top')
		expect(label.classes()).not.toContain('s-label--position-start')
	})

	it('direction: rtl — dir на корне подписи', () => {
		expect(mount(Label, { props: { direction: 'rtl' } }).attributes('dir')).toBe('rtl')
	})
})

describe('текст: проп и слот', () => {
	it('без слота — проп text', () => {
		const label = mount(Label, { props: { text: 'Проп' } })

		expect(label.find('.s-label__text').text()).toBe('Проп')
	})

	it('слот content переопределяет проп', () => {
		const label = mount(Label, {
			props: { text: 'Проп' },
			slots: { content: () => h('b', 'Слот') },
		})

		expect(label.find('.s-label__text').html()).toBe(
			'<span class="s-label__text"><b>Слот</b></span>',
		)
	})

	it('смена пропа доходит до текста', async () => {
		const label = mount(Label, { props: { text: 'До' } })

		await label.setProps({ text: 'После' })

		expect(label.find('.s-label__text').text()).toBe('После')
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или узел
	 * вокруг слота этот селектор выключили бы: рядом с одиноким контролом
	 * остался бы зазор.
	 */
	it('без текста обёртка пуста — ни пробела, ни элемента', () => {
		const text = mount(Label).find('.s-label__text').element

		expect(text.textContent).toBe('')
		expect(text.children).toHaveLength(0)
	})
})

/** Слушатель v-model контрола. */
type TOnValue = (value: boolean | undefined) => void

/** CheckBox и Switch устроены одинаково: корень-`span` и `<input type="checkbox">`. */
const CHECKABLES = [
	['CheckBox', (onValue?: TOnValue) => h(CheckBox, { 'onUpdate:value': onValue })],
	['Switch', (onValue?: TOnValue) => h(Switch, { 'onUpdate:value': onValue })],
] as const

describe.each(CHECKABLES)('%s в подписи', (_name, control) => {
	it('у поля одна подпись — сама Label', async () => {
		await render(() => h(Label, { text: 'Согласен' }, () => control()))

		const input = find('.s-label input', HTMLInputElement)

		expect([...(input.labels ?? [])]).toEqual([find('.s-label', HTMLLabelElement)])
	})

	it('клик по тексту переключает контрол один раз', async () => {
		const updates: unknown[] = []

		await render(() =>
			h(Label, { text: 'Согласен' }, () => control((value) => updates.push(value))),
		)

		find('.s-label__text', HTMLElement).click()
		await nextTick()

		expect(find('.s-label input', HTMLInputElement).checked).toBe(true)
		expect(updates).toEqual([true])
	})
})

describe('радио в подписи', () => {
	/** Группа с одним радио внутри подписи; `tag` радио — из аргумента. */
	const radioIn = (tag?: string) => () =>
		h(RadioGroup as Component, null, () =>
			h(Label, { text: 'Первый' }, () =>
				h(RadioGroup.Item, { value: 'a', ...(tag ? { tag } : {}) }),
			),
		)

	/** Тексты предупреждений подписи о вложенном `label`. */
	const nestedWarnings = (calls: readonly unknown[][]): string[] =>
		calls.map(([message]) => String(message)).filter((text) => text.includes('[soldy] Label'))

	it('без tag="span" — предупреждение о вложенном label', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await render(radioIn())

		const warnings = nestedWarnings(warn.mock.calls)

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('tag="span"')
	})

	it('с tag="span" — тишина, у радио одна подпись, клик по тексту его отмечает', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await render(radioIn('span'))

		const input = find('.s-label input', HTMLInputElement)

		expect(nestedWarnings(warn.mock.calls)).toEqual([])
		expect([...(input.labels ?? [])]).toEqual([find('.s-label', HTMLLabelElement)])

		find('.s-label__text', HTMLElement).click()
		await nextTick()

		expect(input.checked).toBe(true)
	})
})
