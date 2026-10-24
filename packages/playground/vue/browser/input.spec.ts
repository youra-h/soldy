/**
 * Поле ввода Input в настоящем браузере — то, что рисует тема: рамка под
 * курсором, стороны слотов и форма кнопки очистки, — и поле в форме: кнопка
 * очистки не отправляет её.
 *
 * Рамку под курсором тема красит только включённому полю. Корень Input —
 * `div`, и `:not(:disabled)` у него истинно всегда: выключено вложенное поле,
 * и выключенность тема читает с него
 * (`themes/oren/src/components/input/_input.scss`). Раньше рамка выключенного
 * поля под курсором темнела, как у включённого. Слоты стоят по краям поля, и
 * их отступ от рамки — логическая сторона: в RTL `leading` справа, и отступ у
 * него справа (общий слой тем, `themes/base/src/components/input.css`). Ни
 * каскада с указателем, ни раскладки сторон в jsdom нет —
 * поэтому спек браузерный.
 *
 * Цвета спек не знает — их решает дизайн (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Знает отношения: под курсором рамка включённого
 * поля меняется, выключенного — нет; в RTL поле — зеркало поля в LTR.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { COMPONENT_SIZES, COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'
import { Button, Input } from '@soldy-ui/vue'

import { expectClearSquare } from './clear-button'
import { find, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Место, куда уводится указатель: он остаётся там, где его бросил прошлый тест. */
const AWAY = '.so-test-away'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Варианты со своим цветом рамки: `normal` — та же нейтраль, что и без варианта. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/** Нейтраль — блок без варианта — и каждый вариант со своим цветом. */
const COLORS = [
	{ name: 'нейтраль', variant: undefined },
	...COLORED.map((variant) => ({ name: variant, variant })),
]

/** Навести указатель и дождаться, пока доиграет переход цвета. */
async function hover(selector: string): Promise<void> {
	await userEvent.hover(find(selector))
	// Кадр — чтобы браузер успел разобрать движение указателя: ввод он
	// обрабатывает до отрисовки, а перехода до этого ещё нет.
	await nextFrame()
	await settled(document.body)
}

/** Разметка в сцене заданного направления, указатель уведён с поля. */
async function show(content: () => VNode, dir: 'ltr' | 'rtl' = 'ltr'): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'padding: 16px' }, [
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					content(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await hover(AWAY)
}

/** Цвет рамки поля. */
const border = (): string => style(find('.so-input')).borderTopColor

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COLORS)('$name: рамка под курсором', ({ variant }) => {
	/**
	 * Сначала — что наведение рамку красит вообще: иначе проверка
	 * выключенного поля ниже прошла бы вхолостую.
	 */
	it('у включённого поля меняется', async () => {
		await show(() => h(Input, { variant }))

		const rest = border()

		await hover('.so-input')

		expect(border()).not.toBe(rest)
	})

	/** Выключенное поле кликом не оживить — и откликаться ему нечем. */
	it('у выключенного поля та же', async () => {
		await show(() => h(Input, { variant, disabled: true }))

		const rest = border()

		await hover('.so-input')

		expect(border()).toBe(rest)
	})
})

describe('стороны слотов', () => {
	/** Поле с содержимым в обоих слотах — меряется содержимое, а не сам слот. */
	const field = () =>
		h(
			Input,
			{},
			{
				leading: () => h('span', { class: 'so-test-leading' }, 'A'),
				trailing: () => h('span', { class: 'so-test-trailing' }, 'B'),
			},
		)

	/**
	 * Отступы содержимого слотов от краёв поля: `start` — от края начала
	 * строки до `leading`, `end` — от `trailing` до края её конца. Край —
	 * внешний край рамки поля.
	 */
	const insets = (dir: 'ltr' | 'rtl'): { start: number; end: number } => {
		const box = find('.so-input').getBoundingClientRect()
		const leading = find('.so-test-leading').getBoundingClientRect()
		const trailing = find('.so-test-trailing').getBoundingClientRect()

		return dir === 'ltr'
			? { start: leading.left - box.left, end: box.right - trailing.right }
			: { start: box.right - leading.right, end: trailing.left - box.left }
	}

	/**
	 * Отступ слота — у края поля, по направлению строки. Левым и правым он
	 * был у `leading` и `trailing` в любом направлении, и в RTL содержимое
	 * `leading` прилипало к рамке справа, а у `trailing` отступ уходил внутрь
	 * поля.
	 */
	it('в RTL — зеркально LTR: отступ слота у края поля', async () => {
		await show(field, 'ltr')

		const ltr = insets('ltr')

		cleanup()
		await show(field, 'rtl')

		const rtl = insets('rtl')

		// Слоты в RTL — у своих краёв: `leading` справа, `trailing` слева
		expect(
			find('.so-test-leading').getBoundingClientRect().left,
			'leading правее trailing',
		).toBeGreaterThan(find('.so-test-trailing').getBoundingClientRect().right)

		expect(Math.abs(rtl.start - ltr.start), 'отступ leading').toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(rtl.end - ltr.end), 'отступ trailing').toBeLessThanOrEqual(EPSILON)
	})
})

/**
 * Кнопка очистки — квадрат со стороной в строку слота на любом размере
 * (`clear-button.ts`). Своего размера у кнопки в разметке нет: высоту строки
 * слоту даёт коробка поля по шкале размера.
 */
describe.each(COMPONENT_SIZES)('размер %s: кнопка очистки', (size) => {
	it('квадрат высотой в строку слота, иконка внутри', async () => {
		await show(() => h(Input, { clearable: true, size }))

		expectClearSquare(find('.so-input__clear'), find('.so-input__trailing'), size)
	})
})

/**
 * Кнопка очистки — деталь разметки поля, а не кнопка отправки: у неё
 * `type="button"`. У `<button>` без `type` тип `submit`, и клик по очистке
 * отправлял форму, а Enter в поле — неявная отправка — нажимал первую такую
 * кнопку формы, то есть её же: поле очищалось вместо отправки. Неявную
 * отправку jsdom не выполняет — поэтому спек браузерный, как
 * `keyboard-activation.spec.ts`.
 *
 * Button потребителя без `type` остаётся кнопкой отправки, как нативная
 * `<button>`: Enter в поле нажимает его.
 */
describe('в форме', () => {
	/** Отправка формы: кнопка, которая её отправила, и данные формы в этот момент. */
	type TSubmission = {
		readonly submitter: HTMLElement | null
		readonly data: [string, FormDataEntryValue][]
	}

	/** Форма с полем `clearable` и кнопкой потребителя; отправки — в журнал. */
	async function showForm(): Promise<TSubmission[]> {
		const submissions: TSubmission[] = []

		const onSubmit = (event: Event) => {
			// Неотменённая отправка перезагрузила бы фрейм с тестами
			event.preventDefault()

			if (event instanceof SubmitEvent && event.target instanceof HTMLFormElement) {
				submissions.push({
					submitter: event.submitter,
					data: [...new FormData(event.target)],
				})
			}
		}

		await show(() =>
			h('form', { onSubmit }, [
				h(Input, { name: 'q', value: 'текст', clearable: true }),
				h(Button, { text: 'Найти' }),
			]),
		)

		return submissions
	}

	/** Поле Input: проверкам нужен его `value`. */
	const field = (): HTMLInputElement => {
		const element = find('.so-input input')

		if (!(element instanceof HTMLInputElement)) throw new Error('поля нет')

		return element
	}

	it('Enter в поле отправляет форму кнопкой потребителя, значение прежнее', async () => {
		const submissions = await showForm()

		field().focus()
		await userEvent.keyboard('{Enter}')

		expect(submissions).toHaveLength(1)
		expect(submissions[0].submitter).toBe(find('form > .so-button'))
		expect(submissions[0].data).toEqual([['q', 'текст']])
		expect(field().value).toBe('текст')
	})

	it('клик по кнопке очистки очищает поле и форму не отправляет', async () => {
		const submissions = await showForm()

		await userEvent.click(find('.so-input__clear'))

		await expect.poll(() => field().value).toBe('')
		expect(submissions).toEqual([])
	})
})
