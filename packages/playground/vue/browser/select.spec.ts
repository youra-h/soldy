/**
 * Select в настоящем браузере: появление и исчезание панели, форма кнопки
 * очистки.
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
import { expectFadesInPlace, ownTransitionRuns, settled } from './transitions'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань']

/** Select на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async () => {
	render(
		defineComponent({
			render: () =>
				h('div', { style: 'padding: 40px; width: 320px' }, [
					h(Select, null, {
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

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const field = () => find('.s-select__field input')
const panel = () => find('.s-select__panel')

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
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
 * Кнопку очистки рисует поле — Input внутри Select, — и форма у неё та же:
 * квадрат со стороной в строку слота на любом размере (`clear-button.ts`).
 * Раньше Select рисовал кнопку сам, и на крупных размерах она выходила низкой
 * и широкой. Клик очищает поле и панель не открывает: до корня, который
 * тумблит панель, он не всплывает.
 */
describe('кнопка очистки', () => {
	/** Select с выбранным значением и кнопкой очистки. */
	const showClearable = async (size?: (typeof COMPONENT_SIZES)[number]) => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px; width: 320px' }, [
						h(
							Select,
							{ clearable: true, size, value: '0' },
							{
								default: () =>
									CITIES.map((text, index) =>
										h(SelectItem, { key: text, value: String(index), text }),
									),
							},
						),
					]),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	it.each(COMPONENT_SIZES)('%s: квадрат высотой в строку слота, иконка внутри', async (size) => {
		await showClearable(size)

		expectClearSquare(
			find('.s-select__field .s-input__clear'),
			find('.s-select__field .s-input__trailing'),
			size,
		)
	})

	it('клик очищает поле и панель не открывает', async () => {
		await showClearable()

		const input = field()

		if (!(input instanceof HTMLInputElement)) throw new Error('поле — не <input>')

		await expect.poll(() => input.value).toBe('Москва')

		await userEvent.click(find('.s-select__field .s-input__clear'))

		await expect.poll(() => input.value).toBe('')
		expect(find('.s-select').dataset.open).not.toBe('true')
	})
})
