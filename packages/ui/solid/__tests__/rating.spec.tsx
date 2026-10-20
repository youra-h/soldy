/**
 * Rating в Solid — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Здесь важно, что они сходятся в разметке: звезда на каждую единицу шкалы с
 * долей заливки переменной, поле с ходом, шагом, значением и тем, как оно
 * звучит, слот значка в обоих слоях и значение колбэком. Сценарии — те же, что
 * у Vue (`rating.spec.ts`); `v-model` Vue здесь — `value` с `onChangeValue`.
 *
 * Своё у Solid — петля звёзд по месту (`Index`): предпросмотр наведением
 * меняет доли, а узлы ряда остаются теми же.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { batch, createSignal } from 'solid-js'
import { TRating } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Label, LocaleProvider, Rating, type RatingProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Все узлы по селектору в документе. */
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

/** Поле оценки; нет его — тест падает здесь. */
const field = () => find(document, '.so-rating__input', HTMLInputElement)

/** Корень оценки в документе. */
const root = () => find(document, '.so-rating', HTMLElement)

/** Доли заливки звёзд — как их получает тема. */
const fractions = () =>
	all('.so-rating__star').map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(key: string): void {
	field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
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
}

/**
 * Оценка в документе со значением в сигнале: смена приходит колбэком
 * `onChangeValue` и возвращается пропом — как `v-model` у Vue. Слушатели
 * плагинов встают по `ready` — кадром позже.
 */
async function render(initial: number | undefined, props: RatingProps = {}) {
	const [value, setValue] = createSignal(initial)
	const changes: number[] = []

	mount(() => (
		<Rating
			{...props}
			value={value()}
			onChangeValue={({ newValue }) => {
				changes.push(newValue)
				setValue(newValue)
			}}
		/>
	))
	await nextFrame()

	return { changes }
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; внутри — span, поле и значки', async () => {
		await render(undefined, { direction: 'rtl', size: 'lg', readonly: true })

		expect(root().localName).toBe('span')
		expect(root().classList.contains('so-rating--size-lg')).toBe(true)
		expect(root().classList.contains('so-rating--readonly')).toBe(true)
		expect(root().dataset.disabled).toBe('false')
		expect(root().getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полю, не корню
		expect(root().hasAttribute('aria-readonly')).toBe(false)
		expect(
			all('.so-rating *').filter(
				(node) => !['span', 'input', 'svg', 'path'].includes(node.localName),
			),
		).toEqual([])
	})

	it('части — прямыми детьми: дорожка у корня, звёзды и ручка у дорожки, поле у ручки', async () => {
		await render(2)

		const track = find(root(), ':scope > .so-rating__track', HTMLElement)

		expect([...track.children].map((node) => node.className)).toEqual([
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__thumb',
		])
		expect(field().parentElement?.className).toBe('so-rating__thumb')
	})

	it('звезда на каждую единицу шкалы — под aria-hidden, с долей заливки', async () => {
		const [max, setMax] = createSignal<number | undefined>(undefined)

		mount(() => <Rating value={3.5} step={0.5} max={max()} />)

		expect(all('.so-rating__star').map((star) => star.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
			'true',
			'true',
			'true',
		])
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])

		setMax(7)

		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', () => {
		mount(() => <Rating />)

		const star = find(document, '.so-rating__star', HTMLElement)
		const layers = [star, find(document, '.so-rating__star-fill', HTMLElement)].map((layer) =>
			[...layer.children].find((node) => node.localName === 'svg'),
		)

		expect(layers.map((icon) => icon?.getAttribute('class'))).toEqual([
			'so-rating__icon',
			'so-rating__icon',
		])
		expect(all('.so-rating svg')).toHaveLength(10)
	})

	it('поле: ход, шаг, значение, name, id, disabled и то, как звучит значение', async () => {
		await render(4, { max: 10, step: 0.5, name: 'score', id: 'score' })

		const input = field()

		expect(input.type).toBe('range')
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '10', '0.5', '4'])
		expect([input.name, input.id]).toEqual(['score', 'score'])
		expect(input.getAttribute('aria-valuetext')).toBe('4 of 10')
		expect(input.parentElement?.className).toBe('so-rating__thumb')
	})

	it('имя — из aria_label; выключенная — нативный disabled, без ARIA-дублей', async () => {
		await render(undefined, { aria_label: 'Оценка', disabled: true })

		expect(field().getAttribute('aria-label')).toBe('Оценка')
		expect(field().disabled).toBe(true)
		expect(field().hasAttribute('aria-disabled')).toBe(false)
		expect(root().dataset.disabled).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', () => {
		const [readonly, setReadonly] = createSignal(true)

		mount(() => <Rating readonly={readonly()} />)

		expect(field().getAttribute('aria-readonly')).toBe('true')
		expect(field().hasAttribute('readonly')).toBe(false)

		setReadonly(false)

		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	it('атрибуты потребителя — корню: указатель поле не ловит', () => {
		mount(() => <Rating class="mine" title="Оценка" data-probe="1" />)

		expect([...root().classList].at(-1)).toBe('mine')
		expect(root().title).toBe('Оценка')
		expect(root().dataset.probe).toBe('1')
		expect(field().hasAttribute('title')).toBe(false)
	})
})

describe('слот icon', () => {
	it('рисуется в обоих слоях звезды: scope — номер звезды и залитый ли слой', () => {
		mount(() => (
			<Rating
				max={3}
				icon={({ value, filled }) => (
					<b class="so-test-icon">
						{value}:{String(filled)}
					</b>
				)}
			/>
		))

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

	it('слот вернул пустое — в слое значок по умолчанию', () => {
		mount(() => (
			<Rating max={2} icon={({ filled }) => (filled ? <b class="so-test-icon" /> : null)} />
		))

		expect(all('.so-rating__star > svg')).toHaveLength(2)
		expect(all('.so-rating__star-fill > .so-test-icon')).toHaveLength(2)
	})
})

describe('значение и commit', () => {
	it('клавиша — шаг, значение возвращается пропом, звёзды и поле — за ним', async () => {
		const { changes } = await render(2)

		press('ArrowRight')

		expect(changes).toEqual([3])
		expect(field().value).toBe('3')
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
		expect(field().getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — колбэком компонента', async () => {
		const onCommit = vi.fn()

		await render(2, { onCommit })

		press('End')

		expect(onCommit.mock.calls).toEqual([[{ newValue: 5, oldValue: 2 }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TRating({ value: 1 })

		mount(() => <Rating ctrl={ctrl} />)
		await nextFrame()

		ctrl.value = 4

		expect(field().value).toBe('4')
		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
	})

	/**
	 * Значение поля браузер прижимает к ходу: записанное раньше нового `max`,
	 * оно встало бы на прежний край. Поэтому значение пишет `ref` поля — после
	 * атрибутов хода.
	 */
	it('шкала и значение сменились разом — значение поля по новой шкале', () => {
		const [max, setMax] = createSignal(5)
		const [value, setValue] = createSignal(2)

		mount(() => <Rating value={value()} max={max()} />)

		batch(() => {
			setMax(10)
			setValue(8)
		})

		expect([field().max, field().value]).toEqual(['10', '8'])
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
		await render(undefined, { required: true })

		expect(field().validity.customError).toBe(true)
		expect(field().validationMessage).toBe('Please select a rating')
		// Атрибутов, которых у range нет, разметка не ставит
		expect(field().hasAttribute('required')).toBe(false)
		expect(field().hasAttribute('aria-required')).toBe(false)

		press('ArrowRight')

		expect(field().validity.customError).toBe(false)
	})

	it('ошибка — на языке поддерева', async () => {
		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Rating required />
			</LocaleProvider>
		))
		await nextFrame()

		expect(field().validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const { changes } = await render(undefined, { step: 0.5 })

		measure()
		pointer('pointerdown', 185)
		pointer('pointerup', 185)

		expect(changes).toEqual([2.5])
		expect(fractions()).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const onChangePreview = vi.fn()
		const { changes } = await render(1, { onChangePreview })

		measure()
		pointer('pointermove', 250)

		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
		expect(onChangePreview.mock.calls).toEqual([[4]])
		expect(changes).toEqual([])

		root().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))

		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})

	/**
	 * Выход `stars` — новые записи на каждую смену, и петля по ссылке
	 * пересоздавала бы ряд на каждое движение указателя вместе со слотами
	 * значков.
	 */
	it('предпросмотр не пересоздаёт звёзды и их значки', async () => {
		await render(1)

		const stars = all('.so-rating__star')
		const icons = all('.so-rating__icon')

		measure()
		pointer('pointermove', 250)

		expect(all('.so-rating__star')).toEqual(stars)
		expect(all('.so-rating__icon')).toEqual(icons)
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', () => {
		mount(() => (
			<Label text="Оценка">
				<Rating value={3} />
			</Label>
		))

		expect(find(document, 'label', HTMLLabelElement).control).toBe(field())
	})

	it('значение звучит на языке поддерева', () => {
		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Rating value={3.5} step={0.5} />
			</LocaleProvider>
		))

		expect(field().getAttribute('aria-valuetext')).toBe('3,5 из 5')
	})
})
