/**
 * RadioGroup в настоящем браузере: клавиатура группы — нативная.
 *
 * Радио — `input[type=radio]` с общим `name`, который считает ядро. Своей
 * клавиатуры у группы нет: одну остановку Tab, стрелки по кругу с пропуском
 * выключенных и пробел даёт браузер. jsdom этого не выполняет, поэтому спек
 * браузерный: без общего `name` или с лишним `tabindex` все проверки здесь
 * покраснеют, а в jsdom остались бы зелёными.
 *
 * Отметку группа получает событием `change`, которое браузер шлёт на каждый
 * такой переход, — `v-model` потребителя проверяется тем же ходом.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Button, RadioGroup, RadioGroupItem } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Что отметил пользователь — `v-model:value` потребителя. */
const picked = ref<string | number | undefined>()

/**
 * Кнопка до и после группы — чтобы видеть, куда уводит Tab. «B» можно
 * выключить, подписи у радио — слотом.
 */
const show = async (options: { value?: string; offB?: boolean } = {}) => {
	picked.value = options.value

	render(
		defineComponent({
			render: () => [
				h(Button, { text: 'До' }),
				h(
					RadioGroup,
					{
						value: picked.value,
						'onUpdate:value': (value: string | number | undefined) => {
							picked.value = value
						},
					},
					() => [
						h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
						h(RadioGroupItem, { value: 'b', disabled: options.offB }, () => 'Второй'),
						h(RadioGroupItem, { value: 'c' }, () => 'Третий'),
					],
				),
				h(Button, { text: 'После' }),
			],
		}),
	)

	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Радио по значению. */
const radio = (value: string): HTMLInputElement => {
	const element = document.querySelector(`.s-radio-group-item__input[value="${value}"]`)

	if (!(element instanceof HTMLInputElement)) throw new Error(`радио «${value}» нет`)

	return element
}

/** Значение радио в фокусе; фокус не на радио — `null`. */
const focusedRadio = (): string | null => {
	const active = document.activeElement

	return active instanceof HTMLInputElement && active.type === 'radio' ? active.value : null
}

/** Кнопка с фокусом — по тексту. */
const focusedText = (): string | undefined => document.activeElement?.textContent?.trim()

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('одна остановка Tab на группу', () => {
	it('без отметки Tab заходит на первое радио и следующим уходит из группы', async () => {
		await show()

		find('.s-button').focus()
		await userEvent.tab()

		expect(focusedRadio()).toBe('a')

		await userEvent.tab()

		expect(focusedText()).toBe('После')
	})

	it('с отметкой Tab заходит на отмеченное радио', async () => {
		await show({ value: 'b' })

		find('.s-button').focus()
		await userEvent.tab()

		expect(focusedRadio()).toBe('b')

		// Обратный Tab из группы тоже одна остановка
		await userEvent.tab({ shift: true })

		expect(focusedText()).toBe('До')
	})
})

describe('стрелки переносят отметку', () => {
	it('↓ отмечает следующее радио и пишет v-model', async () => {
		await show({ value: 'a' })

		radio('a').focus()
		await userEvent.keyboard('{ArrowDown}')

		expect(focusedRadio()).toBe('b')
		expect(radio('b').checked).toBe(true)
		await expect.poll(() => picked.value).toBe('b')
	})

	it('по кругу: ↓ с последнего — на первое, ↑ с первого — на последнее', async () => {
		await show({ value: 'c' })

		radio('c').focus()
		await userEvent.keyboard('{ArrowDown}')

		await expect.poll(() => picked.value).toBe('a')

		await userEvent.keyboard('{ArrowUp}')

		await expect.poll(() => picked.value).toBe('c')
	})

	it('выключенное радио пропускается', async () => {
		await show({ value: 'a', offB: true })

		radio('a').focus()
		await userEvent.keyboard('{ArrowDown}')

		expect(focusedRadio()).toBe('c')
		await expect.poll(() => picked.value).toBe('c')
		expect(radio('b').checked).toBe(false)
	})
})

describe('пробел и клик по подписи', () => {
	it('пробел отмечает радио в фокусе', async () => {
		await show()

		find('.s-button').focus()
		await userEvent.tab()
		await userEvent.keyboard(' ')

		expect(radio('a').checked).toBe(true)
		await expect.poll(() => picked.value).toBe('a')
	})

	/** Корень радио — `label`: подпись выбирает, как у голой пары «радио + текст». */
	it('клик по подписи отмечает радио', async () => {
		await show({ value: 'a' })

		await userEvent.click(find('.s-radio-group-item:nth-child(3) .s-radio-group-item__text'))

		expect(radio('c').checked).toBe(true)
		await expect.poll(() => picked.value).toBe('c')
	})
})

/**
 * Подписи может не быть — она лежит в соседнем элементе. Тема прячет пустую
 * обёртку по `:empty`, и в разметке Vue вокруг слота не должно быть ни
 * пробельного текста, ни узлов: иначе рядом с одиноким кольцом остался бы
 * зазор.
 */
describe('пустая подпись места не занимает', () => {
	it('без слота обёртка подписи скрыта, со слотом — видна', async () => {
		render(
			defineComponent({
				render: () =>
					h(RadioGroup, null, () => [
						h(RadioGroupItem, { value: 'bare', aria_label: 'Без подписи' }),
						h(RadioGroupItem, { value: 'text' }, () => 'С подписью'),
					]),
			}),
		)

		await nextTick()

		const text = (value: string) => {
			const element = radio(value)
				.closest('.s-radio-group-item')
				?.querySelector('.s-radio-group-item__text')

			if (!(element instanceof HTMLElement)) throw new Error(`подписи «${value}» нет`)

			return element
		}

		expect(getComputedStyle(text('bare')).display).toBe('none')
		expect(getComputedStyle(text('text')).display).not.toBe('none')
	})
})
