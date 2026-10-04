/**
 * Полоса под активным табом вида `line` (вид табов по умолчанию) в настоящем
 * браузере: к новому табу она переезжает переходом — место и длина по главной
 * оси вместе, — а первая отрисовка, ресайз и сдвиг соседей ставят её на место
 * сразу.
 *
 * Полосу рисует тема (`themes/oren/src/components/tabs/_tabs.scss`) —
 * псевдоэлементом `::after` списка по переменным `--active-tab-*` и тем же
 * переездом, что карточку `contained` (`tabs-contained.spec.ts`). Пишет
 * переменные плагин темы `TTabsViewPlugin`
 * (`themes/oren/setup/plugins/tabs-view.plugin.ts`), он же ставит на список
 * признак переезда `--active-tab-moving` при смене активного таба и снимает
 * его, когда переход доиграл; без признака переход нулевой.
 *
 * Раньше полоса ехала своим правилом: переходом на любой пересчёт — первую
 * отрисовку, ресайз, сдвиг соседа, появление первого активного таба, — и
 * переход вёл ширину. У вертикальных табов длина полосы — высота, поэтому
 * место ехало, а длина вставала сразу: табы разной высоты полоса проходила с
 * длиной нового таба, стоя ещё у старого. Проверен на том правиле: падают
 * переезд вертикальных табов, первая отрисовка, первый выбранный таб, сдвиг
 * соседа и ресайз.
 *
 * Переходы ловит слушатель `transitionrun`, повешенный до действия, а не
 * снимок после него: переход короткий. Переходы самих табов — цвет строки под
 * указателем — тоже всплывают до списка, поэтому в счёт идут только переходы
 * его `::after`. Полосу тест меряет коробкой псевдоэлемента и сверяет с
 * коробкой обёртки таба по главной оси: полоса лежит под всем табом, вместе с
 * крестиком.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tabs, TabsItem } from '@soldy-ui/vue'

import { find } from './colors'
import { reducedMotion } from './media'
import { pseudoBox } from './pseudo-box'
import { pseudoSettled, pseudoTransitionRuns, transitionEvents } from './transitions'

import '@soldy-ui/theme-oren'

/**
 * Допуск на округление, px. Место и длину таба `TTabsActiveTabPlugin` берёт в
 * целых `offset*`, а коробка обёртки дробная: край полосы отходит от неё
 * меньше чем на пиксель.
 */
const EPSILON = 1

const TABS = { a: 'Настройки', b: 'Почта', c: 'Архив' } as const

type TValue = keyof typeof TABS

/** Главная ось набора — та, вдоль которой стоят табы и лежит полоса. */
type TAxis = 'horizontal' | 'vertical'

type TEdge = 'left' | 'right' | 'top' | 'bottom'

/** Края полосы и таба, которые совпадают по главной оси. */
const EDGES: Record<TAxis, readonly TEdge[]> = {
	horizontal: ['left', 'right'],
	vertical: ['top', 'bottom'],
}

type THarness = {
	/** Пропсы набора поверх крестиков; вид — по умолчанию, `line`. */
	tabs?: Record<string, unknown>
	/** Активный таб; `null` — ни одного. */
	active?: TValue | null
	dir?: 'ltr' | 'rtl'
	/**
	 * Свой стиль таба `b`. Ширина у табов разная от текста, а высота у
	 * вертикальных одна — длину по их оси табу `b` меняет поле.
	 */
	style?: string
}

/** Набор из трёх табов с крестиками на сцене шириной 640 px. */
const harness = ({ tabs = {}, active = 'a', dir = 'ltr', style }: THarness = {}) =>
	defineComponent({
		render: () =>
			h('div', { class: 's-test-scene', style: 'width: 640px', dir }, [
				h(Tabs, { closable: true, ...tabs }, () =>
					(Object.keys(TABS) as TValue[]).map((value) =>
						h(TabsItem, {
							key: value,
							value,
							text: TABS[value],
							active: value === active,
							style: value === 'b' ? style : undefined,
						}),
					),
				),
			]),
	})

const root = () => find('.s-tabs')
const list = () => find('.s-tabs__list')
const scene = () => find('.s-test-scene')

/** Обёртка таба; под всей ней и лежит полоса. */
const tabOf = (value: TValue): HTMLElement => {
	const item = [...document.querySelectorAll('.s-tabs-item')].find(
		(node) => node.querySelector('[role="tab"]')?.textContent?.trim() === TABS[value],
	)

	if (!(item instanceof HTMLElement)) throw new Error(`таба ${value} нет`)

	return item
}

const rowOf = (value: TValue) => find('[role="tab"]', tabOf(value))
const closeOf = (value: TValue) => find('.s-tabs-item__close', tabOf(value))

/** Длина таба по главной оси. */
const lengthOf = (value: TValue, axis: TAxis): number => {
	const box = tabOf(value).getBoundingClientRect()

	return axis === 'horizontal' ? box.width : box.height
}

/** Признак переезда на списке; пустая строка — его нет. */
const moving = () => list().style.getPropertyValue('--active-tab-moving')

/** Переходы полосы: только `::after` списка. */
const stripRuns = () => pseudoTransitionRuns(list(), '::after')

const stripSettled = () => pseudoSettled(list(), '::after')

/**
 * Плагин темы замерил табы: модификатор `--ready-animation` он ставит после
 * первой записи геометрии. Полоса модификатор не читает — здесь это только
 * знак, что замер был, в том числе у набора без активного таба, которому
 * плагин ничего не пишет.
 */
const measured = async () => {
	await expect.poll(() => root().classList.contains('s-tabs--ready-animation')).toBe(true)
}

/** Края полосы по главной оси — края обёртки таба. */
const stripMisses = (value: TValue, axis: TAxis): string[] => {
	const strip = pseudoBox(list(), '::after')
	const tab = tabOf(value).getBoundingClientRect()

	return EDGES[axis]
		.filter((edge) => Math.abs(strip[edge] - tab[edge]) > EPSILON)
		.map((edge) => `${edge}: полоса ${strip[edge]}, таб ${tab[edge]}`)
}

/** Полоса встаёт под таб — сразу или после пересчёта в следующем кадре. */
const expectStripOn = async (value: TValue, axis: TAxis = 'horizontal') => {
	await expect.poll(() => stripMisses(value, axis)).toEqual([])
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

/**
 * Раскладки, где место и длина считаются иначе: в RTL табы идут справа
 * налево, а сдвиг полосы остаётся физическим, у вертикальных главная ось —
 * высота.
 */
const VERTICAL = { orientation: 'vertical' }
const TALLER = 'padding-block: 6px'

const LAYOUTS = [
	{ name: 'горизонтальные, LTR', dir: 'ltr', tabs: {}, style: undefined, axis: 'horizontal' },
	{ name: 'горизонтальные, RTL', dir: 'rtl', tabs: {}, style: undefined, axis: 'horizontal' },
	{ name: 'вертикальные', dir: 'ltr', tabs: VERTICAL, style: TALLER, axis: 'vertical' },
	{ name: 'вертикальные в RTL', dir: 'rtl', tabs: VERTICAL, style: TALLER, axis: 'vertical' },
] as const

/** Свойство длины полосы по главной оси. */
const SIZE = { horizontal: 'width', vertical: 'height' } as const satisfies Record<TAxis, string>

describe('переезд к новому табу', () => {
	it.each(LAYOUTS)(
		'$name: место и длина едут переходом, полоса встаёт под новый таб, признак снят',
		async ({ dir, tabs, style, axis }) => {
			render(harness({ dir, tabs, style }))

			await measured()
			await expectStripOn('a', axis)

			// Длина табов по оси разная — иначе переходу длины было бы нечего вести
			expect(lengthOf('b', axis)).not.toBeCloseTo(lengthOf('a', axis), 0)

			const runs = stripRuns()

			await userEvent.click(rowOf('b'))
			await transitionEvents()

			expect(runs).toEqual(expect.arrayContaining(['transform', SIZE[axis]]))
			expect(moving()).toBe('1')

			await stripSettled()

			await expectStripOn('b', axis)
			await expect.poll(moving).toBe('')
		},
	)

	/**
	 * Сосед встаёт на место закрытого таба уже посреди переезда: адаптер
	 * убирает закрытый таб из разметки после активации соседа. Сдвиг приходит,
	 * пока признак стоит, — полоса доезжает до соседа на его новом месте, а не
	 * остаётся там, где он стоял до закрытия.
	 */
	it('закрыли активный — полоса встаёт под соседа, занявшего его место', async () => {
		render(harness())

		await measured()

		const before = tabOf('a').getBoundingClientRect()

		await userEvent.click(closeOf('a'))
		await expect.poll(() => tabOf('b').getAttribute('data-selected')).toBe('true')

		await transitionEvents()
		await stripSettled()

		await expectStripOn('b')
		expect(tabOf('b').getBoundingClientRect().left).toBeCloseTo(before.left, 0)
		await expect.poll(moving).toBe('')
	})
})

describe('без переезда — место сразу', () => {
	it('первая отрисовка: полоса под активным табом без перехода', async () => {
		render(harness())

		// Слушатель — до первого кадра: переход на монтировании он бы застал
		const runs = stripRuns()

		await measured()
		await expectStripOn('a')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})

	/** Переезжать неоткуда: до этого таба полоса не стояла нигде. */
	it('первый выбранный таб — полоса появляется под ним без перехода', async () => {
		render(harness({ active: null }))

		await measured()

		const runs = stripRuns()

		await userEvent.click(rowOf('b'))
		await expectStripOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})

	it('закрыли соседа слева — полоса идёт за табом без перехода', async () => {
		render(harness({ active: 'b' }))

		await measured()
		await expectStripOn('b')

		const runs = stripRuns()
		const before = tabOf('b').getBoundingClientRect().left

		await userEvent.click(closeOf('a'))

		// Таб сдвинулся — иначе проверять было бы нечего
		await expect.poll(() => tabOf('b').getBoundingClientRect().left).not.toBeCloseTo(before, 0)
		await expectStripOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})

	/**
	 * После переезда признак снят, и ресайз переставляет полосу сразу: с
	 * переходом она 200 мс отставала бы от своего таба. Табы растянуты на всю
	 * ширину — сужение сцены меняет и место, и длину таба.
	 */
	it('ресайз после переезда — без перехода', async () => {
		render(harness({ tabs: { alignment: 'stretch' } }))

		await measured()
		await userEvent.click(rowOf('b'))
		await transitionEvents()
		await stripSettled()
		await expect.poll(moving).toBe('')

		const runs = stripRuns()
		const before = tabOf('b').getBoundingClientRect()

		scene().style.width = '480px'

		await expect.poll(() => tabOf('b').getBoundingClientRect().width).toBeLessThan(before.width)
		await expectStripOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
	})

	it('система просит меньше движения — полоса встаёт под новый таб сразу', async () => {
		await reducedMotion('reduce')

		render(harness())

		await measured()

		const runs = stripRuns()

		await userEvent.click(rowOf('b'))
		await expectStripOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		await expect.poll(moving).toBe('')
	})
})
