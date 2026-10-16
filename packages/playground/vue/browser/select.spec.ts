/**
 * Select в настоящем браузере: появление и исчезание панели, форма кнопки
 * очистки и области стрелки.
 *
 * Панель — Frame, телепортированный в `body`, и открытость для темы ей пишет
 * её слой: `data-open` корня Select до телепортированной панели не доходит.
 * Переход держит тема (`themes/oren/src/mixins/_anchored.scss`), хуков под
 * анимацию у кода нет, а jsdom переходов не ведёт — увидеть их можно только
 * здесь, на самом узле. Раскладку поля с тегами сторожит `select-tags.spec.ts`,
 * сторону панели у края окна — `anchor.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Select, SelectItem } from '@soldy-ui/vue'

import { expectClearSquare } from './clear-button'
import { expectFadesInPlace, ownTransitionRuns, settled, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань']

/** Select на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async (props: Record<string, unknown> = {}) => {
	render(
		defineComponent({
			render: () =>
				h('div', { style: 'padding: 40px; width: 320px' }, [
					h(Select, props, {
						default: () =>
							CITIES.map((text, index) =>
								h(SelectItem, { key: text, value: String(index), text }),
							),
					}),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/**
 * Select с выбранным значением и кнопкой очистки: в слоте поля у конца стоят
 * очистка и стрелка.
 */
const showClearable = (
	size?: (typeof COMPONENT_SIZES)[number],
	props: Record<string, unknown> = {},
) => show({ clearable: true, size, value: '0', ...props })

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const field = () => find('.so-select__field input')
const panel = () => find('.so-select__panel')

/** Опции панели — по тексту. */
const options = (): HTMLElement[] => [...panel().querySelectorAll<HTMLElement>('.so-select-item')]

/**
 * Тексты опций, которые не спрятал отбор. Опцию из разметки отбор прячет её
 * `visible` (`display: none`), а не убирает из разметки, и у опции своё
 * значение `display` и тогда, когда пропала вся панель.
 */
const shownOptions = (): string[] =>
	options()
		.filter((option) => getComputedStyle(option).display !== 'none')
		.map((option) => option.textContent?.trim() ?? '')

/** Опция с текстом; нет её — тест падает здесь, а не на нажатии. */
const option = (text: string): HTMLElement => {
	const found = options().find((element) => element.textContent?.trim() === text)

	if (!found) throw new Error(`${text}: опции нет`)

	return found
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

/**
 * Появление и исчезание — переход темы по `data-open` панели, как у поповера у
 * триггера без жеста: панель проявляется и гаснет на месте, одной
 * прозрачностью, а закрытая, пока гаснет, нажатий не ловит.
 */
describe('появление и исчезание', () => {
	it('открытие — панель проявляется, закрытие — гаснет на месте и до конца нажатий не ловит', async () => {
		await show()

		const runs = ownTransitionRuns(panel())

		await userEvent.click(field())

		// `transitionrun` браузер шлёт кадром позже пересчёта стиля
		await expect.poll(() => runs).toContain('opacity')
		expect(panel().dataset.open).toBe('true')

		await settled(panel())

		// Фокус остаётся на поле — Escape закрывает панель с него
		expect(document.activeElement).toBe(field())

		await expectFadesInPlace(panel(), () => userEvent.keyboard('{Escape}'))
	})
})

/**
 * Набор с отбором обычно кончается закрытием панели — выбором в `single`, Tab
 * с поля, нажатием мимо, — и набранное плагин ввода снимает тем же действием.
 * Отбор он снимает, только когда закрытая панель догасла (`TEditablePlugin`):
 * иначе гаснущая панель на миг показала бы весь список и вытянулась бы до его
 * высоты — вспышка. Закрытая панель показывает то, что показывала.
 */
describe('отбор: гаснущая панель держит отобранное', () => {
	it.each<[string, () => Promise<unknown>]>([
		['выбор кликом', () => userEvent.click(option('Москва'))],
		['Tab с поля', () => userEvent.keyboard('{Tab}')],
	])(
		'%s — пока панель гаснет, в ней одна опция и высота прежняя, догасла — отбор снят',
		async (_, close) => {
			await show({ editable: true, editableMode: 'filter' })

			await userEvent.click(field())
			await userEvent.keyboard('Мо')
			await expect.poll(() => panel().dataset.open).toBe('true')
			await settled(panel())

			expect(shownOptions()).toEqual(['Москва'])

			const { height } = panel().getBoundingClientRect()

			await close()

			const seen = await whileLeaving(panel(), () => {
				expect(panel().dataset.open, 'закрыта').toBe('false')
				expect(shownOptions(), 'опции гаснущей панели').toEqual(['Москва'])
				expect(
					Math.abs(panel().getBoundingClientRect().height - height),
					'высота гаснущей панели',
				).toBeLessThan(1)
			})

			// Исчезни панель сразу, проверять было бы нечего, и сторож прошёл бы сам
			expect(seen, 'кадров на экране после закрытия').toBeGreaterThan(0)

			// Догасла — отбор снят уже закрытой, и открытая снова панель
			// показывает весь список
			await expect.poll(shownOptions).toEqual(CITIES)

			await userEvent.click(find('.so-select__arrow'))
			await expect.poll(() => panel().dataset.open).toBe('true')

			expect(shownOptions()).toEqual(CITIES)
		},
	)
})

/**
 * Кнопку очистки рисует поле — Input внутри Select, — и форма у неё та же:
 * квадрат со стороной в строку слота на любом размере (`clear-button.ts`).
 * Раньше Select рисовал кнопку сам, и на крупных размерах она выходила низкой
 * и широкой. Клик очищает поле и панель не открывает: до корня, который
 * тумблит панель, он не всплывает.
 */
describe('кнопка очистки', () => {
	it.each(COMPONENT_SIZES)('%s: квадрат высотой в строку слота, иконка внутри', async (size) => {
		await showClearable(size)

		expectClearSquare(
			find('.so-select__field .so-input__clear'),
			find('.so-select__field .so-input__trailing'),
			size,
		)
	})

	it('клик очищает поле и панель не открывает', async () => {
		await showClearable()

		const input = field()

		if (!(input instanceof HTMLInputElement)) throw new Error('поле — не <input>')

		await expect.poll(() => input.value).toBe('Москва')

		await userEvent.click(find('.so-select__field .so-input__clear'))

		await expect.poll(() => input.value).toBe('')
		expect(find('.so-select').dataset.open).not.toBe('true')
	})
})

/** Ширина и высота узла — те же, что у образца, с допуском на субпиксели. */
const expectSameSize = (element: Element, sample: Element, label: string) => {
	const own = element.getBoundingClientRect()
	const other = sample.getBoundingClientRect()

	expect(own.width, `${label}: ширина`).toBeCloseTo(other.width, 0)
	expect(own.height, `${label}: высота`).toBeCloseTo(other.height, 0)
}

/** Значок внутри узла; нет его — тест падает здесь, а не на замере. */
const glyph = (element: Element): SVGSVGElement => {
	const icon = element.querySelector('svg')

	if (!icon) throw new Error('значка нет')

	return icon
}

/**
 * Область нажатия стрелки — её обёртка целиком (`TSelectPointerPlugin` ищет
 * её от цели нажатия), а в `editable` по тексту поля панель не открывается, и
 * стрелка — единственное место, которое её открывает. Своей коробки у обёртки
 * не было: область совпадала со значком, а значок брал кегль страницы на любом
 * размере, и на `2xl` в поле 44px в стрелку надо было попасть 23px. Теперь
 * обёртка — квадрат очистки рядом, в строку слота, а значок — её значка: кегль
 * поля по размеру (`themes/oren/src/components/select/_select.scss`).
 */
describe('стрелка', () => {
	it.each(COMPONENT_SIZES)('%s: область — квадрат очистки, значок — её значка', async (size) => {
		await showClearable(size)

		const clear = find('.so-select__field .so-input__clear')
		const arrow = find('.so-select__arrow')

		expectClearSquare(clear, find('.so-select__field .so-input__trailing'), size)
		expectSameSize(arrow, clear, `${size}: область стрелки`)
		expectSameSize(glyph(arrow), glyph(clear), `${size}: значок стрелки`)
	})

	/**
	 * Область — вся строка слота по высоте: нажатие у верхнего края строки над
	 * серединой стрелки открывает панель. Пока областью был значок, он стоял
	 * посередине строки, такое нажатие доставалось слоту, и панель оставалась
	 * закрытой.
	 */
	it.each(COMPONENT_SIZES)(
		'%s: в editable нажатие у края строки над стрелкой открывает панель',
		async (size) => {
			await showClearable(size, { editable: true })

			const slot = find('.so-select__field .so-input__trailing')
			const arrow = find('.so-select__arrow').getBoundingClientRect()
			const row = slot.getBoundingClientRect()

			await userEvent.click(slot, {
				position: { x: arrow.left + arrow.width / 2 - row.left, y: 1 },
			})

			await expect.poll(() => panel().dataset.open).toBe('true')
		},
	)
})
