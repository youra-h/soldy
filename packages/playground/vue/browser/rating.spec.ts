/**
 * Оценка звёздами в настоящем браузере: раскладка ряда и настоящий ввод.
 *
 * jsdom не считает раскладку — у дорожки там нет ни ширины, ни положения, — и
 * не выполняет действий браузера: нативный сдвиг поля от стрелки он не делает
 * вовсе. Поэтому нажатие, наведение и касание здесь — настоящим вводом
 * Playwright (`userEvent` с позицией, команда `tap`), а не синтетическим
 * `PointerEvent`: только так видно, что точка указателя ложится на звёзды по
 * коробке дорожки, касание не оставляет предпросмотра, а стрелка делает ровно
 * один шаг — ядра, без нативного.
 *
 * Позиции — от левого верхнего угла дорожки: её коробка — ряд звёзд встык, 0
 * и 1 доли — её края (контракт темы с плагинами указателя и наведения).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { TRating } from '@soldy-ui/core'
import type { IRatingProps } from '@soldy-ui/core'
import { Label, Rating } from '@soldy-ui/vue'

import { hue, style } from './colors'
import { reducedMotion } from './media'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type THarness = {
	/** Направление письма страницы */
	dir?: 'ltr' | 'rtl'
	/** Оценка в подписи `Label` */
	label?: boolean
	/** Кнопка «До» перед оценкой — чтобы было откуда прийти по Tab */
	before?: boolean
}

/** Оценка на странице. Значение держит экземпляр ядра: по нему тест читает результат. */
async function mount(
	props: Partial<IRatingProps> = {},
	{ dir = 'ltr', label = false, before = false }: THarness = {},
) {
	const ctrl = new TRating(props)
	const rating = () => h(Rating, { ctrl })

	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'padding: 24px' }, [
					before ? h('button', { class: 'so-test-before' }, 'До') : null,
					label ? h(Label, { text: 'Оценка', position: 'top' }, rating) : rating(),
				]),
		}),
	)

	// Плагины получают корень кадром
	await nextFrame()
	await nextFrame()

	return ctrl
}

/**
 * Оценка в форме с именем `score`. Отправку тест перехватывает и запоминает,
 * что ушло в форму. Подложка — поверхность места: на ней тема кладёт вуаль
 * пустой звезды.
 */
async function mountForm(props: Partial<IRatingProps> = {}) {
	const ctrl = new TRating({ name: 'score', ...props })
	const submitted: FormData[] = []

	const onSubmit = (event: Event) => {
		event.preventDefault()

		if (event.target instanceof HTMLFormElement) submitted.push(new FormData(event.target))
	}

	render(
		defineComponent({
			render: () =>
				h(
					'form',
					{
						class: 'so-test-form',
						style: 'padding: 24px; background: var(--so-place-surface)',
						onSubmit,
					},
					[h(Rating, { ctrl })],
				),
		}),
	)

	await nextFrame()
	await nextFrame()

	const form = document.querySelector('.so-test-form')

	if (!(form instanceof HTMLFormElement)) throw new Error('формы нет')

	/** Оценки, ушедшие в форму, — по отправкам. */
	const scores = () => submitted.map((data) => data.get('score'))

	return { ctrl, form, scores }
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const track = () => find('.so-rating__track')
const stars = () => all('.so-rating__star')

function field(): HTMLInputElement {
	const node = document.querySelector('.so-rating__input')

	if (!(node instanceof HTMLInputElement)) throw new Error('поля нет')

	return node
}

/** Точка у доли ряда `fraction` — от левого верхнего угла дорожки, по середине высоты. */
function along(fraction: number) {
	const box = track().getBoundingClientRect()

	return { x: box.width * fraction, y: box.height / 2 }
}

/** Доли заливки звёзд — как их получила тема. */
const fractions = () => stars().map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Ширина залитой части звезды — доля её коробки, как её видит глаз. */
const filled = (star: HTMLElement) => {
	const fill = star.querySelector('.so-rating__star-fill')

	if (!(fill instanceof HTMLElement)) throw new Error('слоя заливки нет')

	return fill.getBoundingClientRect().width / star.getBoundingClientRect().width
}

/**
 * Курсор — в угол страницы, мимо оценки: в отступ вокруг неё. Не `unhover`:
 * тот уводит указатель в центр `body`, а он бывает и над рядом.
 */
const away = () => userEvent.hover(document.body, { position: { x: 1, y: 1 } })

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'

	// Мышь у страницы прогона одна на все файлы и стоит там, где её оставил
	// прошлый тест или файл. Оценка встаёт у левого верхнего угла, и звезда под
	// забытым курсором монтировалась бы уже поднятой — тема поднимает звезду под
	// указателем, — а замер раскладки застал бы её крупнее соседей. Наведение
	// задаёт тест, поэтому курсор уходит с места оценки до монтирования:
	// уведённый после, он оставил бы звезде обратный переход.
	await away()
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

describe('раскладка', () => {
	it('звёзды — равные ячейки встык: доля дорожки ложится на них без остатка', async () => {
		await mount()

		const box = track().getBoundingClientRect()
		const cells = stars().map((star) => star.getBoundingClientRect())
		const width = box.width / 5

		expect(cells).toHaveLength(5)
		cells.forEach((cell, index) => {
			expect(Math.abs(cell.width - width)).toBeLessThan(0.5)
			expect(Math.abs(cell.left - (box.left + width * index))).toBeLessThan(0.5)
		})
	})

	it('RTL: первая звезда — у правого края', async () => {
		await mount({}, { dir: 'rtl' })

		const box = track().getBoundingClientRect()
		const [first] = stars()

		expect(Math.abs(first.getBoundingClientRect().right - box.right)).toBeLessThan(0.5)
	})

	it('заливка — доля коробки звезды: половина — ровно половина, от начала строки', async () => {
		await mount({ value: 2.5, step: 0.5 })

		const [, second, third, fourth] = stars()

		expect(filled(second)).toBeCloseTo(1, 2)
		expect(filled(third)).toBeCloseTo(0.5, 2)
		expect(filled(fourth)).toBe(0)

		cleanup()
		await mount({ value: 2.5, step: 0.5 }, { dir: 'rtl' })

		const half = stars()[2]
		const fill = half.querySelector('.so-rating__star-fill')?.getBoundingClientRect()

		// В RTL слой заливки стоит у правого края звезды — у начала строки
		expect(Math.abs((fill?.right ?? 0) - half.getBoundingClientRect().right)).toBeLessThan(0.5)
	})
})

describe('нажатие ставит оценку', () => {
	it('в любом месте звезды — её целиком', async () => {
		const ctrl = await mount()

		await userEvent.click(track(), { position: along(0.41) })
		expect(ctrl.value).toBe(3)

		await userEvent.click(track(), { position: along(0.59) })
		expect(ctrl.value).toBe(3)

		await userEvent.click(track(), { position: along(0.95) })
		expect(ctrl.value).toBe(5)
	})

	it('шаг 0,5: левая половина звезды — половина, правая — целая', async () => {
		const ctrl = await mount({ step: 0.5 })

		await userEvent.click(track(), { position: along(0.45) })
		expect(ctrl.value).toBe(2.5)

		await userEvent.click(track(), { position: along(0.55) })
		expect(ctrl.value).toBe(3)
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
	})

	it('RTL: ряд растёт справа налево', async () => {
		const ctrl = await mount({ step: 0.5 }, { dir: 'rtl' })

		await userEvent.click(track(), { position: along(0.95) })
		expect(ctrl.value).toBe(0.5)

		await userEvent.click(track(), { position: along(0.15) })
		expect(ctrl.value).toBe(4.5)
	})

	it('протяжка по звёздам ведёт оценку, commit — один', async () => {
		const ctrl = await mount()
		const commits: unknown[] = []

		ctrl.events.on('commit', (payload) => commits.push(payload))

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.1),
			targetPosition: along(0.7),
		})

		expect(ctrl.value).toBe(4)
		expect(commits).toEqual([{ newValue: 4, oldValue: 0 }])
	})

	it('касание ставит оценку и не оставляет предпросмотра', async () => {
		const ctrl = await mount({ value: 1 })

		await commands.tap('.so-rating__star:nth-child(3)')

		expect(ctrl.value).toBe(3)
		expect(ctrl.preview).toBeUndefined()
	})

	it('только для показа нажатие оценку не меняет', async () => {
		const ctrl = await mount({ value: 2, readonly: true })

		await userEvent.click(track(), { position: along(0.9) })

		expect(ctrl.value).toBe(2)
		expect(fractions()).toEqual(['1', '1', '0', '0', '0'])
	})
})

describe('предпросмотр наведением', () => {
	it('звёзды показывают оценку под указателем, ушёл указатель — значение', async () => {
		const ctrl = await mount({ value: 1, step: 0.5 })

		await userEvent.hover(track(), { position: along(0.65) })

		expect(ctrl.preview).toBe(3.5)
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])
		expect(ctrl.value).toBe(1)

		await away()

		expect(ctrl.preview).toBeUndefined()
		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})

	it('RTL: под указателем у правого края — первая звезда', async () => {
		const ctrl = await mount({}, { dir: 'rtl' })

		await userEvent.hover(track(), { position: along(0.9) })

		expect(ctrl.preview).toBe(1)
	})

	it('звезда под указателем поднята; у оценки только для показа — нет', async () => {
		await reducedMotion('reduce')
		await mount()

		await userEvent.hover(stars()[3])

		expect(getComputedStyle(stars()[3]).scale).not.toBe('none')
		expect(getComputedStyle(stars()[0]).scale).toBe('none')

		cleanup()
		await mount({ readonly: true })

		await userEvent.hover(stars()[3])

		expect(getComputedStyle(stars()[3]).scale).toBe('none')
	})
})

describe('клавиши, имя и фокус', () => {
	it('стрелка — один шаг ядра, без нативного; End — наибольшая', async () => {
		const ctrl = await mount({ value: 2, step: 0.5 })

		field().focus()
		await userEvent.keyboard('{ArrowRight}')

		expect(ctrl.value).toBe(2.5)
		expect(field().value).toBe('2.5')

		await userEvent.keyboard('{End}')

		expect(ctrl.value).toBe(5)
	})

	it('в подписи Label поле названо подписью и звучит «4 of 5»', async () => {
		await mount({ value: 4 }, { label: true })

		const slider = page.getByRole('slider', { name: 'Оценка', exact: true }).query()

		expect(slider).toBe(field())
		expect(field().getAttribute('aria-valuetext')).toBe('4 of 5')
	})

	it('фокус с клавиатуры — кольцо вокруг всего ряда', async () => {
		await mount({ value: 3 }, { before: true })

		find('.so-test-before').focus()
		await userEvent.keyboard('{Tab}')

		const thumb = find('.so-rating__thumb')
		const ring = getComputedStyle(thumb)
		const box = thumb.getBoundingClientRect()
		const row = track().getBoundingClientRect()

		expect(document.activeElement).toBe(field())
		expect(ring.outlineStyle).not.toBe('none')
		expect(Math.abs(box.width - row.width)).toBeLessThan(0.5)
	})
})

/**
 * Обязательная оценка в настоящей форме. `required` range браузер не знает,
 * и ошибку полю ставит плагин обязательности — дальше всё делает браузер:
 * не отправляет форму, ставит фокус на поле, показывает сообщение, а после
 * попытки отправить включает `:user-invalid`, по которому тема красит звёзды.
 */
describe('обязательная оценка в форме', () => {
	it('без оценки форма не уходит: сообщение — строка локали, фокус — на поле', async () => {
		const { form, scores } = await mountForm({ required: true })

		form.requestSubmit()

		expect(scores()).toEqual([])
		expect(field().validationMessage).toBe('Please select a rating')
		expect(document.activeElement).toBe(field())
	})

	it('поставили оценку нажатием — форма уходит с ней', async () => {
		const { form, scores } = await mountForm({ required: true })

		await userEvent.click(track(), { position: along(0.5) })
		await nextFrame()

		form.requestSubmit()

		expect(scores()).toEqual(['3'])
	})

	it('только для показа с 0 форма уходит: такую оценку не спрашивают', async () => {
		const { form, scores } = await mountForm({ required: true, readonly: true })

		form.requestSubmit()

		expect(scores()).toEqual(['0'])
	})

	it('после неудачной отправки пустые звёзды — тона ошибки, поставили оценку — прежние', async () => {
		const { form } = await mountForm({ required: true })

		const backdrop = style(form).backgroundColor
		const empty = () => style(stars()[4]).color
		const resting = empty()

		// Тон ошибки — семейства `negative`: проба его ступени на той же подложке
		const probe = document.createElement('span')

		probe.style.color = 'var(--so-negative-500)'
		form.append(probe)

		const negative = hue([backdrop, style(probe).color])

		probe.remove()

		form.requestSubmit()

		const failed = hue([backdrop, empty()])
		const apart = Math.abs(((failed.angle - negative.angle + 540) % 360) - 180)

		// Нетронутая оценка не горела: пустая звезда — серая вуаль
		expect(hue([backdrop, resting]).chroma).toBeLessThan(0.02)
		expect(failed.chroma).toBeGreaterThan(0.04)
		expect(apart).toBeLessThan(30)

		await userEvent.click(track(), { position: along(0.5) })
		await nextFrame()

		expect(empty()).toBe(resting)
	})
})
