/**
 * Rating во Vue — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Здесь важно, что они сходятся в разметке: звезда на каждую единицу шкалы с
 * долей заливки переменной, поле с ходом, шагом, значением и тем, как оно
 * звучит, слот значка в обоих слоях и `v-model`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TRating } from '@soldy-ui/core'
import type { IRatingProps } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import type { DescriptorSlots, RatingDescriptor } from '@soldy-ui/setup'
import { Label, LocaleProvider, Rating } from '@soldy-ui/vue'

type TIconScope = DescriptorSlots<typeof RatingDescriptor>['icon']

/** Плагины цепляют слушатели по `element:ready`, а оно приходит кадром. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Оценка в документе; `v-model` — по-настоящему: значение возвращается пропом. */
async function render(props: Partial<IRatingProps> & Record<string, unknown> = {}) {
	const mounted = mount(Rating, {
		props: {
			...props,
			'onUpdate:value': (value: number) => mounted.setProps({ value }),
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

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

function field(): HTMLInputElement {
	const node = document.querySelector('.so-rating__input')

	if (!(node instanceof HTMLInputElement)) throw new Error('поля нет')

	return node
}

/** Доли заливки звёзд — как их получает тема. */
const fractions = () =>
	all('.so-rating__star').map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Клавиша на поле, как у пользователя: всплывает до корня. */
async function press(key: string): Promise<void> {
	field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await nextTick()
}

/** Дорожка — пять звёзд по 40 px: левый край — 100, правый — 300. jsdom её не меряет. */
function measure(): void {
	vi.spyOn(find('.so-rating__track'), 'getBoundingClientRect').mockReturnValue(
		new DOMRect(100, 100, 200, 40),
	)
}

/** Указатель мыши над точкой `x` — со звезды, всплывает до корня. */
async function pointer(type: string, x: number): Promise<void> {
	find('.so-rating__star').dispatchEvent(
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
	await nextTick()
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; внутри — span, поле и значки', async () => {
		await render({ direction: 'rtl', size: 'lg', readonly: true })

		const root = find('.so-rating')

		expect(root.localName).toBe('span')
		expect(root.classList.contains('so-rating--size-lg')).toBe(true)
		expect(root.classList.contains('so-rating--readonly')).toBe(true)
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полю, не корню
		expect(root.hasAttribute('aria-readonly')).toBe(false)
		expect(
			all('.so-rating *').filter(
				(node) => !['span', 'input', 'svg', 'path'].includes(node.localName),
			),
		).toEqual([])
	})

	it('звезда на каждую единицу шкалы — под aria-hidden, с долей заливки', async () => {
		const mounted = await render({ value: 3.5, step: 0.5 })

		expect(all('.so-rating__star').map((star) => star.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
			'true',
			'true',
			'true',
		])
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])

		await mounted.setProps({ max: 7 })

		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', async () => {
		await render()

		const star = find('.so-rating__star')
		const layers = [star, find('.so-rating__star-fill')].map(
			(layer) => [...layer.children].find((node) => node.localName === 'svg')?.localName,
		)

		expect(layers).toEqual(['svg', 'svg'])
		expect(all('.so-rating svg')).toHaveLength(10)
	})

	it('поле: ход, шаг, значение, name, id, disabled и то, как звучит значение', async () => {
		await render({ value: 4, max: 10, step: 0.5, name: 'score', id: 'score' })

		const input = field()

		expect(input.type).toBe('range')
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '10', '0.5', '4'])
		expect([input.name, input.id]).toEqual(['score', 'score'])
		expect(input.getAttribute('aria-valuetext')).toBe('4 of 10')
		expect(input.parentElement?.className).toBe('so-rating__thumb')
	})

	it('имя — из aria_label; выключенная — нативный disabled, без ARIA-дублей', async () => {
		await render({ aria_label: 'Оценка', disabled: true })

		expect(field().getAttribute('aria-label')).toBe('Оценка')
		expect(field().disabled).toBe(true)
		expect(field().hasAttribute('aria-disabled')).toBe(false)
		expect(find('.so-rating').dataset.disabled).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', async () => {
		const mounted = await render({ readonly: true })

		expect(field().getAttribute('aria-readonly')).toBe('true')
		expect(field().hasAttribute('readonly')).toBe(false)

		await mounted.setProps({ readonly: false })

		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})
})

describe('слот icon', () => {
	it('рисуется в обоих слоях звезды: scope — номер звезды и залитый ли слой', async () => {
		wrapper = mount(Rating, {
			props: { max: 3 },
			slots: {
				icon: ({ value, filled }: TIconScope) =>
					h('b', { class: 'so-test-icon' }, `${value}:${filled}`),
			},
			attachTo: document.body,
		})
		await nextTick()

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

describe('v-model и commit', () => {
	it('клавиша — шаг, значение возвращается пропом, звёзды и поле — за ним', async () => {
		const mounted = await render({ value: 2 })

		await press('ArrowRight')

		expect(mounted.emitted('update:value')).toEqual([[3]])
		expect(field().value).toBe('3')
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
		expect(field().getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — событием компонента', async () => {
		const mounted = await render({ value: 2 })

		await press('End')

		expect(mounted.emitted('commit')).toEqual([[{ newValue: 5, oldValue: 2 }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TRating({ value: 1 })

		await render({ ctrl })

		ctrl.value = 4
		await nextTick()

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

		await press('ArrowRight')

		expect(field().validity.customError).toBe(false)
	})

	it('ошибка — на языке поддерева', async () => {
		wrapper = mount(
			() => h(LocaleProvider, { locale: ruRU }, () => h(Rating, { required: true })),
			{ attachTo: document.body },
		)
		await nextTick()
		await nextFrame()

		expect(field().validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const mounted = await render({ step: 0.5 })

		measure()
		await pointer('pointerdown', 185)
		await pointer('pointerup', 185)

		expect(mounted.emitted('update:value')).toEqual([[2.5]])
		expect(fractions()).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const mounted = await render({ value: 1 })

		measure()
		await pointer('pointermove', 250)

		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
		expect(mounted.emitted('change:preview')).toEqual([[4]])
		expect(mounted.emitted('update:value')).toBeUndefined()

		find('.so-rating').dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
		await nextTick()

		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', async () => {
		wrapper = mount(Label, {
			props: { text: 'Оценка' },
			slots: { default: () => h(Rating, { value: 3 }) },
			attachTo: document.body,
		})
		await nextTick()

		expect(document.querySelector('label')?.control).toBe(field())
	})

	it('значение звучит на языке поддерева', async () => {
		wrapper = mount(() =>
			h(LocaleProvider, { locale: ruRU }, () => h(Rating, { value: 3.5, step: 0.5 })),
		)
		await nextTick()

		expect(wrapper.find('.so-rating__input').attributes('aria-valuetext')).toBe('3,5 из 5')
	})
})
