/**
 * Textarea в настоящем браузере — то, чего jsdom не считает: перенос текста
 * по ширине поля, высота строк и полей темы и действия браузера.
 *
 * Авторост (`TTextareaAutoresizePlugin`) ставит полю высоту по тексту — от
 * `rows` до `maxRows` строк, — и на потолке поле прокручивается. Ввод
 * пересчитывает её сразу, значение из кода, ширина и размер — кадром. Без
 * автороста плагин поле не трогает. Замер на миг сжимает поле, и прокрутка
 * страницы, упёртая в её конец, после него остаётся на месте.
 *
 * Поля текста стоят так, что поле в одну строку (`rows="1"`) — высоты Input
 * того же размера (общий слой тем, `themes/base/src/components/textarea.css`,
 * толщина рамки — от темы), а Enter в поле — перевод строки, и форму он не
 * отправляет, как у нативной `<textarea>`.
 *
 * Высоты спек не знает — их решает тема. Знает отношения: высота — целое число
 * строк поля и его поля, у потолка — потолок.
 */

import { describe, it, expect, beforeEach, afterEach, onTestFinished } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { TTextarea } from '@soldy-ui/core'
import type { ITextareaProps } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Button, Input, Textarea } from '@soldy-ui/vue'

import { find } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Допуск на субпиксельное округление. */
const EPSILON = 0.5

/** Сцена шириной `width`: её ширину тест меняет, чтобы текст переносился иначе. */
async function show(content: () => VNode, width = 320): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { class: 'so-test-scene', style: `width: ${width}px` }, [content()]),
		}),
	)

	await nextTick()
	await nextFrame()
}

/** Поле многострочного поля. */
function field(): HTMLTextAreaElement {
	const node = document.querySelector('.so-textarea textarea')

	if (!(node instanceof HTMLTextAreaElement)) throw new Error('поля нет')

	return node
}

/** Строка и поля текста по оси блока — из вычисленного стиля поля. */
function metrics(): { line: number; padding: number } {
	const style = getComputedStyle(field())

	return {
		line: parseFloat(style.lineHeight),
		padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
	}
}

/** Высота поля в `count` строк: строки и поля текста (рамку рисует корень). */
function heightOf(count: number): number {
	const { line, padding } = metrics()

	return count * line + padding
}

/** Высота поля сейчас — дробная, как её раскладывает браузер. */
const height = (): number => field().getBoundingClientRect().height

/** Набор с клавиатуры в поле: фокус и клавиши, как у пользователя. */
async function type(keys: string): Promise<void> {
	field().focus()
	await userEvent.keyboard(keys)
}

/** Ввод и значение из кода пересчитываются не позже кадра — ждём его. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
	await nextFrame()
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
	window.scrollTo(0, 0)
})

describe('авторост', () => {
	const props: Partial<ITextareaProps> = { autoresize: true, rows: 2, maxRows: 4 }

	it('растёт по строкам до maxRows, на потолке прокручивается, сжимается обратно', async () => {
		await show(() => h(Textarea, props))

		expect(height(), 'пустое — rows').toBeCloseTo(heightOf(2), 0)

		await type('1{Enter}2{Enter}3')

		expect(height(), 'три строки').toBeCloseTo(heightOf(3), 0)
		expect(getComputedStyle(field()).overflowY).toBe('hidden')

		await type('{Enter}4{Enter}5{Enter}6')

		expect(height(), 'потолок').toBeCloseTo(heightOf(4), 0)
		expect(getComputedStyle(field()).overflowY).not.toBe('hidden')
		expect(field().scrollHeight).toBeGreaterThan(field().clientHeight)

		await userEvent.keyboard('{Control>}a{/Control}{Backspace}')

		expect(height(), 'снова rows').toBeCloseTo(heightOf(2), 0)
		expect(getComputedStyle(field()).overflowY).toBe('hidden')
	})

	it('ручки нет, пока авторост включён', async () => {
		await show(() => h(Textarea, props))

		expect(getComputedStyle(field()).resize).toBe('none')
	})

	it('значение из кода — кадром: высота по новому тексту', async () => {
		const ctrl = new TTextarea(props)

		await show(() => h(Textarea, { ctrl }))

		ctrl.value = 'один\nдва\nтри'
		await settle()

		expect(height()).toBeCloseTo(heightOf(3), 0)
	})

	/**
	 * Ширину поля задаёт приложение классом или стилем корня: своя — по `cols`
	 * поля, как у нативного. Её тест и меняет.
	 */
	it('ширина — кадром: суженное поле переносит строку и растёт', async () => {
		await show(() =>
			h(Textarea, {
				...props,
				style: 'width: 320px',
				value: 'Строка, которая в широком поле умещается в две строки',
			}),
		)

		const before = height()

		expect(before).toBeCloseTo(heightOf(2), 0)

		find('.so-textarea').style.width = '160px'
		await settle()

		expect(height()).toBeGreaterThan(before + EPSILON)
		expect(height()).toBeCloseTo(field().scrollHeight, 0)
	})

	it('size — кадром: высота по строкам и полям нового размера', async () => {
		const ctrl = new TTextarea({ ...props, value: 'один\nдва\nтри', size: 'sm' })

		await show(() => h(Textarea, { ctrl }))

		const small = height()

		expect(small).toBeCloseTo(heightOf(3), 0)

		ctrl.size = '2xl'
		await settle()

		expect(height()).toBeGreaterThan(small + EPSILON)
		expect(height()).toBeCloseTo(heightOf(3), 0)
	})

	/**
	 * Замер на миг сжимает поле до `rows`, и страница становится короче. Её
	 * прокрутку, упёртую в конец, браузер прижимает к новому концу — после
	 * замера страница уезжала бы на каждую клавишу у её низа. Chromium потом
	 * возвращает прокрутку сам, привязкой (`overflow-anchor`), но у
	 * приложения, которое привязку выключило, и у браузера без неё страница
	 * уезжала бы. Поэтому тест привязку выключает: так виден возврат прокрутки
	 * самим плагином.
	 */
	it('прокрутка страницы у её конца на вводе остаётся на месте', async () => {
		const anchored = [document.documentElement, document.body]

		for (const node of anchored) node.style.overflowAnchor = 'none'
		onTestFinished(() => {
			for (const node of anchored) node.style.overflowAnchor = ''
		})

		render(
			defineComponent({
				render: () =>
					h('div', [
						h('div', { style: 'height: 3000px' }),
						h(Textarea, { ...props, maxRows: 0, value: '1\n2\n3\n4\n5\n6\n7\n8' }),
					]),
			}),
		)
		await settle()

		field().focus({ preventScroll: true })
		field().setSelectionRange(field().value.length, field().value.length)
		window.scrollTo(0, document.documentElement.scrollHeight)
		await settle()

		// Конец страницы — и после кадров, в которых плагин мог мерить поле:
		// прижатую замером прокрутку он обязан вернуть и там
		const end = document.documentElement.scrollHeight - document.documentElement.clientHeight

		expect(end, 'страница длиннее окна').toBeGreaterThan(0)
		expect(window.scrollY, 'страница прокручена до конца').toBeCloseTo(end, 0)

		// Строка та же: высота поля не меняется, меняется только текст
		await userEvent.keyboard('{Backspace}')
		await settle()

		expect(window.scrollY).toBeCloseTo(end, 0)
	})
})

describe('без автороста', () => {
	it('инлайновых стилей у поля нет, высота — rows, длинный текст прокручивается', async () => {
		await show(() => h(Textarea, { rows: 2 }))

		await type('1{Enter}2{Enter}3{Enter}4')
		await settle()

		expect(field().getAttribute('style')).toBeNull()
		expect(height()).toBeCloseTo(heightOf(2), 0)
		expect(field().scrollHeight).toBeGreaterThan(field().clientHeight)
	})
})

describe('в форме', () => {
	it('Enter — перевод строки в поле, форма не отправляется', async () => {
		let submissions = 0

		const onSubmit = (event: Event) => {
			// Неотменённая отправка перезагрузила бы фрейм с тестами
			event.preventDefault()
			submissions++
		}

		await show(() =>
			h('form', { onSubmit }, [
				h(Textarea, { name: 'about' }),
				h(Button, { text: 'Отправить' }),
			]),
		)

		await type('а{Enter}б')

		expect(field().value).toBe('а\nб')
		expect(submissions).toBe(0)
	})
})

/**
 * Поля текста тема считает от строки поля размера: первая строка стоит по
 * центру этой строки, и поле в одну строку — ровно высоты Input того же
 * размера. Так оба стоят в одной форме вровень.
 */
describe.each(COMPONENT_SIZES)('размер %s', (size) => {
	it('rows="1" — высота Input того же размера', async () => {
		await show(() => h('div', [h(Input, { size }), h(Textarea, { size, rows: 1 })]))

		const input = find('.so-input').getBoundingClientRect().height
		const textarea = find('.so-textarea').getBoundingClientRect().height

		expect(Math.abs(textarea - input)).toBeLessThanOrEqual(EPSILON)
	})
})
