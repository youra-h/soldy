/**
 * Rating в React — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Здесь важно, что они сходятся в разметке: звезда на каждую единицу шкалы с
 * долей заливки переменной, поле с ходом, шагом, значением и тем, как оно
 * звучит, слот значка в обоих слоях и управляемое значение. Сценарии — те же,
 * что у Vue (`rating.spec.ts`).
 *
 * Своё у React — поле. Значение `<input type="range">` ведёт ядро
 * (`NativeInput`): контролируемое поле React без `onChange` сочло бы ошибкой,
 * и сторож консоли уронил бы тест.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, useState } from 'react'
import { TRating } from '@soldy-ui/core'
import type { TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Label, LocaleProvider, Rating, type RatingProps } from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/**
 * Оценка, чьё значение возвращается пропом, — как `v-model` у Vue: значение
 * держит состояние родителя, а смена приходит `onChangeValue`.
 */
function Controlled(props: RatingProps) {
	const [value, setValue] = useState(props.value)

	return (
		<Rating
			{...props}
			value={value}
			onChangeValue={(payload) => {
				setValue(payload.newValue)
				props.onChangeValue?.(payload)
			}}
		/>
	)
}

/** Оценка в документе с управляемым значением; плагины встают кадром. */
async function render(props: RatingProps = {}): Promise<void> {
	mount(<Controlled {...props} />)
	await nextFrame()
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const field = () => find(document, '.so-rating__input', HTMLInputElement)

/** Доли заливки звёзд — как их получает тема. */
const fractions = () =>
	all('.so-rating__star').map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(key: string): void {
	act(() => {
		field().dispatchEvent(
			new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
		)
	})
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
	act(() => {
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
	})
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
		const { render: rerender } = mount(<Rating value={3.5} step={0.5} />)

		expect(all('.so-rating__star').map((star) => star.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
			'true',
			'true',
			'true',
		])
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])

		rerender(<Rating value={3.5} step={0.5} max={7} />)

		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', async () => {
		await render()

		const star = find(document, '.so-rating__star', HTMLElement)
		const layers = [star, find(document, '.so-rating__star-fill', HTMLElement)].map(
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
		expect(find(document, '.so-rating', HTMLElement).dataset.disabled).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', () => {
		const { render: rerender } = mount(<Rating readonly />)

		expect(field().getAttribute('aria-readonly')).toBe('true')
		expect(field().hasAttribute('readonly')).toBe(false)

		rerender(<Rating readonly={false} />)

		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	it('атрибуты потребителя — корню, а не полю', () => {
		mount(<Rating className="mine" title="Подсказка" data-probe="1" />)

		const root = find(document, '.so-rating', HTMLElement)

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.title).toBe('Подсказка')
		expect(root.dataset.probe).toBe('1')
		expect(field().hasAttribute('title')).toBe(false)
		expect(field().hasAttribute('data-probe')).toBe(false)
	})
})

describe('слот icon', () => {
	it('рисуется в обоих слоях звезды: scope — номер звезды и залитый ли слой', () => {
		mount(
			<Rating
				max={3}
				icon={({ value, filled }) => (
					<b className="so-test-icon">
						{value}:{String(filled)}
					</b>
				)}
			/>,
		)

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

describe('управляемое значение и commit', () => {
	it('клавиша — шаг, значение возвращается пропом, звёзды и поле — за ним', async () => {
		const onChangeValue = vi.fn<(payload: TValuePayload<number>) => void>()

		await render({ value: 2, onChangeValue })

		press('ArrowRight')

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 3, oldValue: 2 }]])
		expect(field().value).toBe('3')
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
		expect(field().getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — событием компонента', async () => {
		const onCommit = vi.fn()

		await render({ value: 2, onCommit })

		press('End')

		expect(onCommit.mock.calls).toEqual([[{ newValue: 5, oldValue: 2 }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TRating({ value: 1 })

		mount(<Rating ctrl={ctrl} />)
		await nextFrame()

		act(() => {
			ctrl.value = 4
		})

		expect(field().value).toBe('4')
		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
	})

	it('без значения в пропсах значение держит ядро: шаг клавишей — в поле', async () => {
		mount(<Rating />)
		await nextFrame()

		press('ArrowRight')
		press('ArrowRight')

		expect(field().value).toBe('2')
		expect(fractions()).toEqual(['1', '1', '0', '0', '0'])
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
		mount(
			<LocaleProvider locale={ruRU}>
				<Rating required />
			</LocaleProvider>,
		)
		await nextFrame()

		expect(field().validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const onChangeValue = vi.fn<(payload: TValuePayload<number>) => void>()

		await render({ step: 0.5, onChangeValue })

		measure()
		pointer('pointerdown', 185)
		pointer('pointerup', 185)

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 2.5, oldValue: 0 }]])
		expect(fractions()).toEqual(['1', '1', '0.5', '0', '0'])
		expect(field().value).toBe('2.5')
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const onChangeValue = vi.fn()
		const onChangePreview = vi.fn()

		await render({ value: 1, onChangeValue, onChangePreview })

		measure()
		pointer('pointermove', 250)

		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
		expect(onChangePreview.mock.calls).toEqual([[4]])
		expect(onChangeValue).not.toHaveBeenCalled()

		act(() => {
			find(document, '.so-rating', HTMLElement).dispatchEvent(
				new PointerEvent('pointerleave', { pointerType: 'mouse' }),
			)
		})

		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', () => {
		mount(
			<Label text="Оценка">
				<Rating value={3} />
			</Label>,
		)

		expect(find(document, 'label', HTMLLabelElement).control).toBe(field())
	})

	it('значение звучит на языке поддерева', () => {
		mount(
			<LocaleProvider locale={ruRU}>
				<Rating value={3.5} step={0.5} />
			</LocaleProvider>,
		)

		expect(field().getAttribute('aria-valuetext')).toBe('3,5 из 5')
	})
})
