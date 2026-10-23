/**
 * Rating в Svelte — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Здесь важно, что они сходятся в разметке: звезда на каждую единицу шкалы с
 * долей заливки переменной, поле с ходом, шагом, значением и тем, как оно
 * звучит, слот значка в обоих слоях и значение, которое возвращается пропом.
 * Сценарии — те же, что у Vue (`rating.spec.ts`).
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushSync } from 'svelte'
import { TRating, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Rating, type RatingProps } from '@soldy-ui/svelte'
import Surround from './Surround.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { scopeMarkup } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/** События оценки, которые получил потребитель, — по порядку. */
type TLog = {
	readonly values: number[]
	readonly commits: TValuePayload<number>[]
	readonly previews: (number | undefined)[]
}

/**
 * Оценка в документе; значение — по-настоящему: потребитель возвращает его
 * пропом, как привязка. Слушатели встают по `ready` узла — кадром позже.
 */
async function render(initial: RatingProps = {}): Promise<{ props: RatingProps; log: TLog }> {
	const log: TLog = { values: [], commits: [], previews: [] }
	const props = reactiveProps<RatingProps>({
		...initial,
		onChangeValue: ({ newValue }) => {
			log.values.push(newValue)
			props.value = newValue
		},
		onCommit: (payload) => {
			log.commits.push(payload)
		},
		onChangePreview: (value) => {
			log.previews.push(value)
		},
	})

	mount(Rating, props)
	await nextFrame()

	return { props, log }
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

const field = () => find(document, '.so-rating__input', HTMLInputElement)

/** Доли заливки звёзд — как их получает тема. */
const fractions = () =>
	all('.so-rating__star').map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(key: string): void {
	field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

/** Дорожка — пять звёзд по 40 px: левый край — 100, правый — 300. jsdom её не меряет. */
function measure(): void {
	vi.spyOn(
		find(document, '.so-rating__track', HTMLElement),
		'getBoundingClientRect',
	).mockReturnValue(new DOMRect(100, 100, 200, 40))
}

/** Указатель мыши над точкой `x` — со звезды, всплывает до корня. */
function pointer(type: string, x: number): void {
	find(document, '.so-rating__star', HTMLElement).dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: 120,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
		}),
	)
	flushSync()
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; внутри — span, поле и значки', async () => {
		await render({ direction: 'rtl', size: 'lg', readonly: true })

		const root = find(document, '.so-rating', HTMLElement)

		expect(root.localName).toBe('span')
		expect(root.classList.contains('so-rating--size-lg')).toBe(true)
		expect(root.classList.contains('so-rating--readonly')).toBe(true)
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полю, не корню
		expect(root.hasAttribute('aria-readonly')).toBe(false)
		// Внутри — span, поле и значки; что внутри значка, решает пакет иконок
		expect(
			all('.so-rating *').filter(
				(node) =>
					!['span', 'input', 'svg'].includes(node.localName) && !node.closest('svg'),
			),
		).toEqual([])
	})

	it('звезда на каждую единицу шкалы — под aria-hidden, с долей заливки', async () => {
		const { props } = await render({ value: 3.5, step: 0.5 })

		expect(all('.so-rating__star').map((star) => star.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
			'true',
			'true',
			'true',
		])
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])

		props.max = 7
		flushSync()

		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', async () => {
		await render()

		const star = find(document, '.so-rating__star', HTMLElement)
		const fill = find(star, '.so-rating__star-fill', HTMLElement)
		const layers = [star, fill].map(
			(layer) => [...layer.children].find((node) => node.localName === 'svg')?.localName,
		)

		expect(layers).toEqual(['svg', 'svg'])
		expect(all('.so-rating svg')).toHaveLength(10)
		expect(
			all('.so-rating svg').every((icon) => icon.getAttribute('class') === 'so-rating__icon'),
		).toBe(true)
	})

	it('поле: ход, шаг, значение, name, id, disabled и то, как звучит значение', async () => {
		await render({ value: 4, max: 10, step: 0.5, name: 'score', id: 'score' })

		const input = field()

		expect(input.type).toBe('range')
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '10', '0.5', '4'])
		expect([input.name, input.id]).toEqual(['score', 'score'])
		expect(input.getAttribute('aria-valuetext')).toBe('4 of 10')
		expect(input.parentElement?.className).toBe('so-rating__thumb')
		expect(input.parentElement?.parentElement?.className).toBe('so-rating__track')
	})

	it('имя — из aria_label; выключенная — нативный disabled, без ARIA-дублей', async () => {
		await render({ aria_label: 'Оценка', disabled: true })

		expect(field().getAttribute('aria-label')).toBe('Оценка')
		expect(field().disabled).toBe(true)
		expect(field().hasAttribute('aria-disabled')).toBe(false)
		expect(find(document, '.so-rating', HTMLElement).dataset.disabled).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', async () => {
		const { props } = await render({ readonly: true })

		expect(field().getAttribute('aria-readonly')).toBe('true')
		expect(field().hasAttribute('readonly')).toBe(false)

		props.readonly = false
		flushSync()

		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	it('атрибуты потребителя — корню, а не полю', async () => {
		await render({ title: 'Оценка товара', class: 'mine' })

		const root = find(document, '.so-rating', HTMLElement)

		expect(root.title).toBe('Оценка товара')
		expect([...root.classList].at(-1)).toBe('mine')
		expect(field().hasAttribute('title')).toBe(false)
	})
})

describe('слот icon', () => {
	it('рисуется в обоих слоях звезды: scope — номер звезды и залитый ли слой', () => {
		mount(Rating, {
			max: 3,
			icon: scopeMarkup<{ value: number; filled: boolean }>(
				({ value, filled }) => `<b class="so-test-icon">${value}:${filled}</b>`,
			),
		})

		const icons = all('.so-test-icon')

		expect(icons.map((node) => node.textContent)).toEqual([
			'1:false',
			'1:true',
			'2:false',
			'2:true',
			'3:false',
			'3:true',
		])
		expect(icons.map((node) => node.parentElement?.className)).toEqual([
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
		])
		expect(all('.so-rating svg')).toEqual([])
	})
})

describe('значение и commit', () => {
	it('клавиша — шаг, значение возвращается пропом, звёзды и поле — за ним', async () => {
		const { log } = await render({ value: 2 })

		press('ArrowRight')

		expect(log.values).toEqual([3])
		expect(field().value).toBe('3')
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
		expect(field().getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — событием компонента', async () => {
		const { log } = await render({ value: 2 })

		press('End')

		expect(log.commits).toEqual([{ newValue: 5, oldValue: 2 }])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TRating({ value: 1 })

		await render({ ctrl })

		ctrl.value = 4
		flushSync()

		expect(field().value).toBe('4')
		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
	})
})

/**
 * `required` у range браузер не знает — у ползунка значение есть всегда, —
 * и ошибку полю ставит плагин обязательности. Узел он получает кадром, как
 * все плагины, поэтому ошибка есть после `ready`. Отправку формы проверяет
 * браузер (`playground/vue/browser/rating.spec.ts`).
 */
describe('обязательность', () => {
	it('обязательная оценка с 0 — поле неверно; поставили оценку — верно', async () => {
		await render({ required: true })

		expect(field().validity.customError).toBe(true)
		expect(field().validationMessage).toBe('Please select a rating')
		// Атрибутов, которых у range нет, разметка не ставит
		expect(field().hasAttribute('required')).toBe(false)
		expect(field().hasAttribute('aria-required')).toBe(false)

		press('ArrowRight')

		expect(field().validity.customError).toBe(false)
	})

	it('ошибка — на языке поддерева', async () => {
		mount(Surround, {
			around: 'locale',
			control: 'rating',
			locale: ruRU,
			rating: { required: true },
		})
		await nextFrame()

		expect(field().validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const { log } = await render({ step: 0.5 })

		measure()
		pointer('pointerdown', 185)
		pointer('pointerup', 185)

		expect(log.values).toEqual([2.5])
		expect(fractions()).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const { log } = await render({ value: 1 })

		measure()
		pointer('pointermove', 250)

		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
		expect(log.previews).toEqual([4])
		expect(log.values).toEqual([])

		find(document, '.so-rating', HTMLElement).dispatchEvent(
			new PointerEvent('pointerleave', { pointerType: 'mouse' }),
		)
		flushSync()

		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', () => {
		mount(Surround, {
			around: 'label',
			control: 'rating',
			text: 'Оценка',
			rating: { value: 3 },
		})

		expect(document.querySelector('label')?.control).toBe(field())
	})

	it('значение звучит на языке поддерева', () => {
		mount(Surround, {
			around: 'locale',
			control: 'rating',
			locale: ruRU,
			rating: { value: 3.5, step: 0.5 },
		})

		expect(field().getAttribute('aria-valuetext')).toBe('3,5 из 5')
	})
})
