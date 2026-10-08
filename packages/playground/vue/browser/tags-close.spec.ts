/**
 * Кнопка закрытия тега в настоящем браузере: вид закрываемого тега прежний.
 *
 * Крестик был последней частью строки-Button: перед ним зазор строки, после —
 * её паддинг, высота — контент строки, кегль — строки. Фон, рамка, наведение,
 * выбор и выключенность строки покрывали его вместе с текстом. Теперь крестик
 * — сосед строки в элементе тега (иначе он вложенная кнопка в `role="option"`,
 * см. `ui/vue/__tests__/tags-close.spec.ts`), пилюлю рисует сам элемент, и
 * всё это тема держит сама. Проверки не знают, как именно: каждая сверяет
 * крестик со строкой, а пилюлю — с её же состояниями, а не с числами темы. В
 * jsdom раскладки нет.
 *
 * Последний раздел — зона нажатия крестика: минимум цели указателя по WCAG
 * 2.5.8 при прежнем виде крестика.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Select, SelectItem, Tags, TagsItem } from '@soldy-ui/vue'
import type { TTagsOverflow } from '@soldy-ui/core'

import '@soldy-ui/theme-oren'

/**
 * Набор с крестиком: обычный, выбранный и выключенный тег. У выключенного
 * крестика нет — его не закрыть (см. `ui/vue/__tests__/tags-close.spec.ts`).
 */
const harness = (tags: Record<string, unknown>, dir: 'ltr' | 'rtl' = 'ltr') =>
	defineComponent({
		render() {
			return h('div', { dir }, [
				h('div', { class: 's-test-away', style: 'height: 24px' }),
				h('div', { style: 'width: 640px' }, [
					h(Tags, { closable: true, mode: 'multiple', ...tags }, () => [
						h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
						h(TagsItem, { key: 'b', value: 'b', text: 'Почта', selected: true }),
						h(TagsItem, { key: 'c', value: 'c', text: 'Архив', disabled: true }),
					]),
				]),
			])
		},
	})

/** Select с тегами в поле — их размеры задаёт слот поля, а не шкала Button. */
const selectHarness = (size: (typeof COMPONENT_SIZES)[number], overflow?: TTagsOverflow) =>
	defineComponent({
		render() {
			return h('div', { style: 'width: 460px' }, [
				h(
					Select,
					{
						mode: 'multiple',
						editable: true,
						value: ['0'],
						size,
						tags_overflow: overflow,
					},
					{ default: () => [h(SelectItem, { key: '0', value: '0', text: 'Москва' })] },
				),
			])
		},
	})

/** Узел по селектору внутри корня; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Элемент тега по месту в наборе. */
const itemOf = (value: 'a' | 'b' | 'c'): HTMLElement => {
	const item = [...document.querySelectorAll('.s-tags-item')][['a', 'b', 'c'].indexOf(value)]

	if (!(item instanceof HTMLElement)) throw new Error(`тега ${value} нет`)

	return item
}

/** Строка тега — соседка крестика в элементе. */
const rowOf = (item: HTMLElement) => find(':scope > .s-button:not(.s-tags-item__close)', item)

/** Закрываемый тег и его части. У выключенного «c» крестика нет. */
const tag = (value: 'a' | 'b') => {
	const item = itemOf(value)

	return {
		item,
		row: rowOf(item),
		text: find('.s-button__text', item),
		close: find(':scope > .s-tags-item__close', item),
	}
}

const box = (element: Element) => element.getBoundingClientRect()

const px = (value: string) => parseFloat(value)

const style = (element: Element) => getComputedStyle(element)

/**
 * Переходы цвета у пилюли и строки — 200мс: значение читаем, когда они
 * доиграли. `getAnimations()` сам пересчитывает стили, поэтому переход,
 * запущенный наведением или фокусом, в списке уже есть.
 */
const settled = (element: Element) =>
	Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))

/** Увести указатель с тегов: тесты монтируют разметку на одном месте. */
const away = () => userEvent.hover(find('.s-test-away'))

/**
 * Прозрачность, с которой узел виден на странице: своя, умноженная на
 * прозрачность предков до набора тегов.
 */
const visibleOpacity = (element: Element) => {
	let opacity = 1

	for (
		let node: Element | null = element;
		node && !node.classList.contains('s-tags');
		node = node.parentElement
	) {
		opacity *= px(style(node).opacity)
	}

	return opacity
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COMPONENT_SIZES)('размер %s: крестик на месте последней части строки', (size) => {
	it('перед крестиком зазор строки, после — её паддинг', () => {
		render(harness({ size }))

		const { item, row, text, close } = tag('a')

		expect(box(close).left - box(text).right).toBeCloseTo(px(style(row).columnGap), 1)
		expect(box(item).right - box(close).right).toBeCloseTo(px(style(row).paddingLeft), 1)
	})

	/**
	 * Одно отличие от прежнего вида есть, на `2xl`: внутри строки крестик был
	 * размера Button по умолчанию, и его высоту резала размерная высота
	 * `normal`. Теперь размер у крестика — размер тега, как у Tabs.
	 */
	it('по высоте — контент строки, по центру строки', () => {
		render(harness({ size }))

		const { row, close } = tag('a')
		const rowBox = box(row)
		const closeBox = box(close)

		expect(closeBox.height).toBeCloseTo(
			rowBox.height - px(style(row).paddingTop) - px(style(row).paddingBottom),
			1,
		)
		expect(closeBox.top + closeBox.height / 2).toBeCloseTo(rowBox.top + rowBox.height / 2, 1)
	})

	it('кегль — строки: от него считается размер иконки', () => {
		render(harness({ size }))

		const { row, close } = tag('a')

		expect(style(close).fontSize).toBe(style(row).fontSize)
	})

	it('рамка outlined пилюлю не раздувает: высота та же, что у filled', () => {
		render(harness({ size, view: 'filled' }))

		const filled = box(tag('a').item).height

		cleanup()
		render(harness({ size, view: 'outlined' }))

		expect(box(tag('a').item).height).toBeCloseTo(filled, 1)
	})
})

describe('направление письма', () => {
	it('в RTL крестик слева от текста: зазор и паддинг зеркальны', () => {
		render(harness({}, 'rtl'))

		const { item, row, text, close } = tag('a')

		expect(box(text).left - box(close).right).toBeCloseTo(px(style(row).columnGap), 1)
		expect(box(close).left - box(item).left).toBeCloseTo(px(style(row).paddingRight), 1)
	})
})

describe.each(['filled', 'plain', 'outlined'] as const)(
	'view="%s": пилюля покрывает крестик',
	(view) => {
		it('строка своего фона и рамки не рисует — их рисует элемент тега вокруг крестика', () => {
			render(harness({ view }))

			const { item, row, close } = tag('b')

			expect(style(row).backgroundColor).toBe('rgba(0, 0, 0, 0)')
			expect(px(style(row).borderTopWidth)).toBe(0)
			expect(style(item).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
			expect(box(close).left).toBeGreaterThanOrEqual(box(item).left)
			expect(box(close).right).toBeLessThanOrEqual(box(item).right)
		})

		it('наведение на крестик проявляет пилюлю так же, как наведение на строку', async () => {
			render(harness({ view }))

			const { item, row, close } = tag('a')

			await away()
			await settled(item)

			const idle = style(item).backgroundColor

			await userEvent.hover(row)
			await settled(item)

			const hovered = style(item).backgroundColor

			await away()
			await settled(item)
			await userEvent.hover(close)
			await settled(item)

			expect(hovered).not.toBe(idle)
			expect(style(item).backgroundColor).toBe(hovered)
		})

		it('текст строки — цвета вида пилюли', () => {
			render(harness({ view, variant: 'accent' }))

			const { item, text } = tag('a')

			expect(style(text).color).toBe(style(item).color)
		})
	},
)

describe('рамка и кольцо фокуса — у пилюли', () => {
	it('outlined: фокус строки темнит рамку пилюли, как темнил рамку строки', async () => {
		render(harness({ view: 'outlined', mode: 'none' }))

		const { item, row } = tag('a')

		await away()
		await settled(item)

		const idle = style(item).borderTopColor

		row.focus()
		await settled(item)

		expect(style(item).borderTopColor).not.toBe(idle)
	})

	/**
	 * С выбором набор — одна остановка Tab, и вход в него — на выбранный тег
	 * («Почта»), а не на первый (`browser/tags-keyboard.spec.ts`).
	 */
	it('кольцо фокуса обводит пилюлю вместе с крестиком, а не строку', async () => {
		render(harness({}))

		const { item, row } = tag('b')

		await userEvent.keyboard('{Tab}')
		await settled(item)

		expect(document.activeElement).toBe(row)
		expect(px(style(item).outlineWidth)).toBeGreaterThan(0)
		expect(style(item).outlineStyle).not.toBe('none')
		expect(style(row).outlineStyle).toBe('none')
	})
})

describe('выключенный тег гаснет целиком', () => {
	it('пилюля и строка — с одной прозрачностью, меньше единицы', () => {
		render(harness({}))

		const item = itemOf('c')

		expect(visibleOpacity(item)).toBeLessThan(1)
		expect(visibleOpacity(rowOf(item))).toBeCloseTo(visibleOpacity(item), 2)
	})

	/** Сравнивать бледность крестика не с чем: выключенный тег не закрывается. */
	it('крестика у него нет', () => {
		render(harness({}))

		expect(itemOf('c').querySelector('.s-tags-item__close')).toBeNull()
	})
})

describe.each(COMPONENT_SIZES)('теги в поле Select, размер %s', (size) => {
	it('крестик на месте последней части строки, по высоте — контент строки', async () => {
		render(selectHarness(size))

		await expect.poll(() => document.querySelectorAll('.s-tags-item').length).toBe(1)

		const item = find('.s-tags-item')
		const row = find(':scope > .s-button:not(.s-tags-item__close)', item)
		const text = find('.s-button__text', row)
		const close = find(':scope > .s-tags-item__close', item)
		const rowBox = box(row)
		const closeBox = box(close)

		expect(closeBox.left - box(text).right).toBeCloseTo(px(style(row).columnGap), 1)
		expect(box(item).right - closeBox.right).toBeCloseTo(px(style(row).paddingLeft), 1)
		expect(closeBox.height).toBeCloseTo(
			rowBox.height - px(style(row).paddingTop) - px(style(row).paddingBottom),
			1,
		)
		expect(rowBox.height).toBeCloseTo(box(item).height, 1)
	})
})

/**
 * Зона нажатия крестика — квадрат со стороной в минимум цели указателя по
 * WCAG 2.5.8 (AA), по центру крестика и по высоте не дальше пилюли
 * (`tags/_tags.scss`). Сам крестик мельче на всех ступенях, кроме `2xl`, но и
 * на ней углов квадрата не ловит: они у него скруглены, а у `outlined` рамка
 * пилюли снимает с него по пикселю сверху и снизу. В режиме выбора вплотную к
 * крестику — нажимаемая строка тега.
 *
 * За пилюлю зона не выходит: снаружи она перехватывала бы нажатия у соседей, а
 * ряду `scroll` добавила бы переполнение. Пилюля ниже минимума — у тега в поле
 * Select на `sm`, — и там зона во всю её высоту. Подпись тега зона тоже не
 * отнимает: сразу перед зоной — строка.
 *
 * Место и размер крестика прежние — их держат проверки выше: в его коробку
 * зона не входит.
 *
 * Попадание — узел в точке внутри крестика, сам он или его значок: проверке
 * всё равно, что из них сверху.
 */
describe('зона нажатия крестика', () => {
	/** Минимум цели указателя по WCAG 2.5.8 (AA), px — число стандарта, а не темы. */
	const MIN_TARGET = 24

	const center = (element: Element) => {
		const { left, top, width, height } = box(element)

		return { x: left + width / 2, y: top + height / 2 }
	}

	/**
	 * Нажатие в точке достаётся узлу: то, что в точке, лежит в нём.
	 *
	 * Точку Blink проверяет квадратом 1×1 вправо и вниз от неё
	 * (`HitTestLocation`), и узел ловит её, если задевает квадрат: у левого и
	 * верхнего края — и точку, не дошедшую до него меньше пикселя. Здесь
	 * квадрат — с центром в точке, поэтому запас у всех краёв одинаков: точка в
	 * углу зоны задевает её на полпикселя, а точка на пиксель за краем не
	 * достаёт до него на полпикселя.
	 */
	const lands = (target: Element, x: number, y: number) => {
		const hit = document.elementFromPoint(x - 0.5, y - 0.5)

		return hit !== null && target.contains(hit)
	}

	/**
	 * В углах зоны нажатие достаётся крестику, сразу за пилюлей — нет, а сразу
	 * перед зоной со стороны строки — строке.
	 */
	const expectZone = (item: HTMLElement) => {
		const close = find(':scope > .s-tags-item__close', item)
		const row = rowOf(item)
		const pill = box(item)
		const { x, y } = center(close)
		const left = x - MIN_TARGET / 2
		const right = x + MIN_TARGET / 2
		const top = Math.max(y - MIN_TARGET / 2, pill.top)
		const bottom = Math.min(y + MIN_TARGET / 2, pill.bottom)
		const corners = {
			'левый верхний': [left, top],
			'правый верхний': [right, top],
			'левый нижний': [left, bottom],
			'правый нижний': [right, bottom],
		}

		for (const [corner, [cornerX, cornerY]] of Object.entries(corners)) {
			expect(lands(close, cornerX, cornerY), `угол зоны: ${corner}`).toBe(true)
		}

		expect(lands(close, x, pill.top - 1), 'над пилюлей').toBe(false)
		expect(lands(close, x, pill.bottom + 1), 'под пилюлей').toBe(false)
		expect(lands(close, pill.left - 1, y), 'левее пилюли').toBe(false)
		expect(lands(close, pill.right + 1, y), 'правее пилюли').toBe(false)

		const rowFirst = center(row).x < x

		expect(lands(row, rowFirst ? left - 1 : right + 1, y), 'перед зоной').toBe(true)
	}

	/** Ряд `scroll` — прокручиваемая область: зона не добавила ему прокрутки по вертикали. */
	const expectNoBlockScroll = (row: HTMLElement) => {
		expect(row.scrollHeight, 'прокрутка ряда по вертикали').toBeLessThanOrEqual(
			row.clientHeight,
		)
	}

	const cases = (['filled', 'outlined'] as const).flatMap((view) =>
		[
			{ mode: 'multiple', label: 'с выбором' },
			{ mode: 'none', label: 'без выбора' },
		].map((set) => ({ view, ...set })),
	)

	describe.each(COMPONENT_SIZES)('размер %s', (size) => {
		describe.each(cases)('view $view, набор $label', ({ view, mode }) => {
			it('в ряду wrap — в углах крестик, за пилюлей нет', () => {
				render(harness({ size, view, mode }))

				expectZone(itemOf('a'))
			})

			it('в ряду scroll — так же, и прокрутки по вертикали у ряда нет', () => {
				render(harness({ size, view, mode, overflow: 'scroll' }))

				expectZone(itemOf('a'))
				expectNoBlockScroll(find('.s-tags'))
			})
		})

		describe('в поле Select', () => {
			it('в ряду wrap — в углах крестик, за пилюлей нет', async () => {
				render(selectHarness(size))

				await expect.poll(() => document.querySelectorAll('.s-tags-item').length).toBe(1)

				expectZone(find('.s-tags-item'))
			})

			it('в ряду scroll — так же, и прокрутки по вертикали у ряда нет', async () => {
				render(selectHarness(size, 'scroll'))

				await expect.poll(() => document.querySelectorAll('.s-tags-item').length).toBe(1)

				expectZone(find('.s-tags-item'))
				expectNoBlockScroll(find('.s-tags'))
			})
		})
	})

	it('в RTL — та же зона у крестика слева от текста', () => {
		render(harness({ size: 'sm' }, 'rtl'))

		expectZone(itemOf('a'))
	})
})
