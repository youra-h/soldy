/**
 * Строка тега выбирает тег по `press`, а не по `click`.
 *
 * Строка — `Button tag="div"`: фокус держит она сама (с выбором — одна
 * остановка Tab на весь набор, см. `tags-keyboard.spec.ts`), а клика из
 * Enter и пробела на `div` браузер не делает. Пока выбор висел на
 * `click`, выбрать тег с клавиатуры было нельзя. `press` её `TActionPlugin`
 * приходит и на клик, и на Enter или пробел с фокусом на строке, и не приходит
 * на выключенный тег. На `click` выключенный тег выбирался:
 * `TSelectionExtension.toggle` выключенность не проверяет — программный выбор
 * выключенного элемента остаётся правом приложения.
 *
 * Слушатели `TActionPlugin` цепляются по `element:ready`, а он приходит через
 * кадр: перед кликом и клавишей ждём кадр, а не только `nextTick`.
 *
 * Что клавиша выбирает тег в настоящем браузере, проверяет
 * `playground/vue/browser/keyboard-activation.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Tags, TagsItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Теги отрисованы, слушатели `TActionPlugin` строк — на узлах. */
const settle = async () => {
	await nextTick()
	await nextFrame()
}

/** Клавиши активации: имя для заголовка теста и `key` события. */
const KEYS = [
	['Enter', 'Enter'],
	['пробел', ' '],
] as const

/** keydown, как его шлёт браузер: всплывает и отменяется. */
const keydown = (target: Element, key: string): void => {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/** Строка тега — носитель его роли и `aria-selected`. */
const rows = () => [...document.querySelectorAll('.s-tags-item > .s-button:first-child')]

/** Строка тега по тексту; нет её — тест падает здесь. */
const rowOf = (text: string): HTMLElement => {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки тега «${text}» нет`)

	return row
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

describe('Enter и пробел на строке переключают выбор', () => {
	const mountItems = async () => {
		wrapper = mount(Tags, {
			props: {
				mode: 'multiple',
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
					{ value: 'c', text: 'C' },
				],
			},
			attachTo: document.body,
		})

		await settle()
	}

	it.each(KEYS)('%s выбирает тег, повтор снимает выбор', async (_name, key) => {
		await mountItems()

		keydown(rowOf('B'), key)
		await nextTick()

		expect(selection()).toEqual(['false', 'true', 'false'])

		keydown(rowOf('B'), key)
		await nextTick()

		expect(selection()).toEqual(['false', 'false', 'false'])
	})
})

/**
 * Выключенный тег не выбирается ни кликом, ни клавишей — выключен ли он сам
 * или весь набор. Включённый обратно — выбирается тем же жестом: так видно, что
 * слушатели на месте и отказ даёт именно выключенность.
 */
describe('выключенный тег не выбирается', () => {
	/** «B» выключается пропом `tagOff`, весь набор — пропом `setOff`. */
	const Harness = {
		components: { Tags, TagsItem },
		props: { tagOff: Boolean, setOff: Boolean },
		template: `
			<Tags mode="multiple" :disabled="setOff">
				<TagsItem value="a" text="A" />
				<TagsItem value="b" text="B" :disabled="tagOff" />
			</Tags>
		`,
	}

	const GESTURES = [
		['клик', (row: HTMLElement) => row.click()],
		['Enter', (row: HTMLElement) => keydown(row, 'Enter')],
		['пробел', (row: HTMLElement) => keydown(row, ' ')],
	] as const

	type THarnessProps = { tagOff?: boolean; setOff?: boolean }

	/** Как выключить и как включить обратно. */
	const WAYS: ReadonlyArray<readonly [string, THarnessProps, THarnessProps]> = [
		['выключен сам', { tagOff: true }, { tagOff: false }],
		['выключен набор', { setOff: true }, { setOff: false }],
	]

	describe.each(WAYS)('%s', (_way, off, on) => {
		it.each(GESTURES)('%s не выбирает, после включения — выбирает', async (_name, press) => {
			const mounted = mount(Harness, { props: off, attachTo: document.body })

			wrapper = mounted
			await settle()

			press(rowOf('B'))
			await nextTick()

			expect(selection()).toEqual(['false', 'false'])

			await mounted.setProps(on)
			await settle()

			press(rowOf('B'))
			await nextTick()

			expect(selection()).toEqual(['false', 'true'])
		})
	})
})
