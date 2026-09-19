/**
 * Enter и пробел во вложенных полях и кнопках — в настоящем браузере.
 *
 * `TActionPlugin` стоит на каждом контроле и превращает Enter и пробел на
 * корне в `press`. Клавишу из вложенного поля или кнопки он не трогает: что с
 * ней делать, они знают сами. Раньше корень-`div` отменял и её
 * (`preventDefault`), и браузер не делал своего: не печатал пробел в Input,
 * не переключал CheckBox и Switch, не нажимал заголовок Accordion, таб и
 * крестик тега.
 *
 * Кнопку очистки и крестик тега в поле Select глушила ещё и клавиатура Select:
 * она слушает свой корень и на их Enter и пробел открывала панель. Теперь она
 * берёт клавиши только с поля, в jsdom это сторожит
 * `setup/__tests__/select-keyboard.spec.ts`.
 *
 * Спек браузерный, потому что проверяет действия браузера по умолчанию: ввод
 * символа, переключение чекбокса, клик из Enter или пробела на `<button>`.
 * jsdom их не выполняет, и баг проходил там зелёным. Что корень не отменяет
 * чужую клавишу и не выдаёт её за свой `press`, проверяет
 * `ui/vue/__tests__/action.spec.ts`.
 *
 * Обратная сторона — клавиша на самом корне-`div`: клика из неё браузер не
 * делает, активацию даёт только `press`. Так устроена строка тега — `div` с
 * `tabindex="0"`, которая сама держит фокус. Пока выбор тега висел на
 * `click`, Enter и пробел на строке не делали ничего; теперь он идёт по
 * `press` строки (`ui/vue/__tests__/tags-select.spec.ts`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import type { VNode } from 'vue'
import {
	Accordion,
	AccordionItem,
	Button,
	CheckBox,
	Input,
	Select,
	SelectItem,
	Switch,
	Tabs,
	TabsItem,
	Tags,
} from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Клавиши активации: имя для заголовка теста и запись для `userEvent.keyboard`. */
const KEYS = [
	['Enter', '{Enter}'],
	['пробел', ' '],
] as const

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Разметка на странице, слушатели плагинов — на узлах.
 *
 * `TActionPlugin` вешает `keydown` по `ready` узла, а `TElementPlugin`
 * объявляет узел через кадр после привязки; элементы коллекции привязываются
 * позже владельца. Клавиша, нажатая раньше, прошла бы мимо плагина, и
 * проверка была бы зелёной и с багом.
 */
const show = async (content: () => VNode) => {
	render(defineComponent({ render: content }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Поле по селектору: проверкам нужны его `value` и `checked`. */
const field = (selector: string): HTMLInputElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLInputElement)) throw new Error(`${selector}: поля нет`)

	return element
}

/** Узел по тексту среди найденных селектором. */
const byText = (selector: string, text: string): HTMLElement => {
	const element = [...document.querySelectorAll(selector)].find(
		(candidate) => candidate.textContent?.trim() === text,
	)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector} «${text}»: узла нет`)

	return element
}

/** Тексты тегов на странице — по их строкам. */
const tagTexts = () =>
	[...document.querySelectorAll('.s-tags-item > .s-button:first-child')].map((row) =>
		row.textContent?.trim(),
	)

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('текстовое поле: пробел печатается', () => {
	it('в Input', async () => {
		await show(() => h(Input))

		const input = field('.s-input input')

		input.focus()
		await userEvent.keyboard('a b')

		expect(input.value).toBe('a b')
	})

	it('в Select с editable', async () => {
		await show(() =>
			h(Select, { editable: true }, () => [h(SelectItem, { value: 'msk', text: 'Москва' })]),
		)

		const input = field('.s-select__field input')

		input.focus()
		await userEvent.keyboard('a b')

		expect(input.value).toBe('a b')
	})

	it('Enter в Input внутри формы отправляет её, как голый <input>', async () => {
		// Неотменённая отправка перезагрузила бы фрейм с тестами
		const submit = vi.fn((event: Event) => event.preventDefault())

		await show(() => h('form', { onSubmit: submit }, [h(Input)]))

		field('.s-input input').focus()
		await userEvent.keyboard('{Enter}')

		expect(submit).toHaveBeenCalledTimes(1)
	})
})

describe('флажок: пробел переключает', () => {
	const toggles = async (selector: string) => {
		const input = field(selector)

		input.focus()
		await userEvent.keyboard(' ')

		expect(input.checked).toBe(true)
	}

	it('CheckBox', async () => {
		await show(() => h(CheckBox))

		await toggles('.s-check-box input')
	})

	it('Switch', async () => {
		await show(() => h(Switch))

		await toggles('.s-switch input')
	})
})

/** Нативная `<button>` превращает Enter и пробел в клик сама, если их не отменить. */
describe('вложенная кнопка нажимается', () => {
	it.each(KEYS)('%s раскрывает секцию Accordion', async (_name, key) => {
		await show(() =>
			h(Accordion, null, () => [
				h(AccordionItem, { value: 'delivery', text: 'Доставка' }),
				h(AccordionItem, { value: 'payment', text: 'Оплата' }),
			]),
		)

		const header = byText('.s-accordion-item__header', 'Доставка')

		header.focus()
		await userEvent.keyboard(key)

		await expect.poll(() => header.getAttribute('aria-expanded')).toBe('true')
	})

	it.each(KEYS)('%s активирует неактивный таб', async (_name, key) => {
		await show(() =>
			h(Tabs, null, () => [
				h(TabsItem, { value: 'settings', text: 'Настройки', active: true }),
				h(TabsItem, { value: 'mail', text: 'Почта' }),
			]),
		)

		const tab = byText('[role="tab"]', 'Почта')

		tab.focus()
		await userEvent.keyboard(key)

		await expect.poll(() => tab.getAttribute('aria-selected')).toBe('true')
	})

	it.each(KEYS)('%s на крестике закрывает тег', async (_name, key) => {
		await show(() =>
			h(Tags, {
				closable: true,
				items: [
					{ value: 'settings', text: 'Настройки' },
					{ value: 'mail', text: 'Почта' },
				],
			}),
		)

		find('.s-tags-item__close[aria-label="Close Почта"]').focus()
		await userEvent.keyboard(key)

		await expect.poll(tagTexts).toEqual(['Настройки'])
	})

	it.each(KEYS)('%s на кнопке очистки очищает Select, панель закрыта', async (_name, key) => {
		await show(() =>
			h(Select, { clearable: true, value: 'msk' }, () => [
				h(SelectItem, { value: 'msk', text: 'Москва' }),
				h(SelectItem, { value: 'spb', text: 'Петербург' }),
			]),
		)

		const input = field('.s-select__field input')

		// Без значения пустое поле ниже ничего бы не доказало
		await expect.poll(() => input.value).toBe('Москва')

		find('.s-select__clear').focus()
		await userEvent.keyboard(key)

		await expect.poll(() => input.value).toBe('')
		expect(find('.s-select').dataset.open).not.toBe('true')
	})

	it.each(KEYS)(
		'%s на крестике тега в поле Select закрывает тег, панель закрыта',
		async (_name, key) => {
			await show(() =>
				h(Select, { mode: 'multiple', value: ['msk', 'spb'] }, () => [
					h(SelectItem, { value: 'msk', text: 'Москва' }),
					h(SelectItem, { value: 'spb', text: 'Петербург' }),
				]),
			)

			// Теги в поле появляются, когда опции зарегистрировались
			await expect.poll(tagTexts).toEqual(['Москва', 'Петербург'])

			find('.s-tags-item__close[aria-label="Close Петербург"]').focus()
			await userEvent.keyboard(key)

			await expect.poll(tagTexts).toEqual(['Москва'])
			expect(find('.s-select').dataset.open).not.toBe('true')
		},
	)
})

/**
 * Клавиша на самом корне — по-прежнему `press`, ровно один: у корня-`div` его
 * даёт плагин, у `<button>` — клик, который браузер делает из клавиши.
 */
describe.each(['div', 'button'] as const)('Button с корнем <%s>: press на клавишу', (tag) => {
	it.each(KEYS)('%s — один press', async (_name, key) => {
		const press = vi.fn()

		await show(() => h(Button, { tag, text: 'Сохранить', 'onAction:press': press }))

		find('.s-button').focus()
		await userEvent.keyboard(key)
		await nextFrame()

		expect(press).toHaveBeenCalledTimes(1)
	})
})

/**
 * Строка тега — корень-`div` своего `Button`: клика из клавиши браузер тут не
 * сделает, тег выбирает `press` строки.
 */
describe('строка тега: клавиша переключает выбор', () => {
	it.each(KEYS)('%s выбирает тег, повтор снимает выбор', async (_name, key) => {
		await show(() =>
			h(Tags, {
				mode: 'multiple',
				items: [
					{ value: 'settings', text: 'Настройки' },
					{ value: 'mail', text: 'Почта' },
				],
			}),
		)

		const row = byText('[role="option"]', 'Почта')

		row.focus()
		await userEvent.keyboard(key)

		await expect.poll(() => row.getAttribute('aria-selected')).toBe('true')

		await userEvent.keyboard(key)

		await expect.poll(() => row.getAttribute('aria-selected')).toBe('false')
	})
})
