/**
 * Карточка активного таба `view="contained"` в настоящем браузере: к новому
 * табу она переезжает переходом, а первая отрисовка, ресайз и сдвиг соседей
 * ставят её на место сразу.
 *
 * Карточку рисует тема (`themes/oren/src/components/tabs/_tabs.scss`): до
 * замера — фоном выбранной обёртки, после — псевдоэлементом `::before` списка
 * по переменным `--active-tab-*`. Пишет их плагин темы `TTabsViewPlugin`
 * (`themes/oren/setup/plugins/tabs-view.plugin.ts`), он же ставит на список
 * признак переезда `--active-tab-moving` при смене активного таба и снимает
 * его, когда переход доиграл; без признака переход нулевой. jsdom не считает
 * ни стилей, ни раскладки и переходов не заводит: там проверяется только
 * признак (`playground/vue/__tests__/tabs-view.spec.ts`).
 *
 * Табы меняются кликом и стрелкой, как у пользователя, а не записью в ядро:
 * фокус на строке нового таба и смена её `tabindex` заставляют браузер
 * пересчитать стиль посреди того, как адаптер переставляет `data-selected`.
 * Снимай выбор псевдоэлемент целиком, а не его видимость, переход пропадал бы
 * именно здесь, а запись в ядро этого не показала бы.
 *
 * Переходы ловит слушатель `transitionrun`, повешенный до действия, а не
 * снимок после него: переход короткий. Переходы самих табов — цвет строки под
 * указателем — тоже всплывают до списка, поэтому в счёт идут только переходы
 * его `::before`. Карточку тест меряет коробкой псевдоэлемента и сверяет с
 * коробкой обёртки таба: так видно и то, что карточка покрывает таб целиком.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Tabs, TabsItem } from '@soldy-ui/vue'

import { find, style } from './colors'
import { reducedMotion } from './media'
import { pseudoBox } from './pseudo-box'
import { pseudoSettled, pseudoTransitionRuns, settled, transitionEvents } from './transitions'

import '@soldy-ui/theme-oren'

/**
 * Допуск на округление, px. Место и длину таба `TTabsActiveTabPlugin` берёт в
 * целых `offset*`, а коробка обёртки дробная: край карточки отходит от неё
 * меньше чем на пиксель.
 */
const EPSILON = 1

/** Фон без цвета — так браузер пишет `transparent`. */
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

const TABS = { a: 'Настройки', b: 'Почта', c: 'Архив' } as const

type TValue = keyof typeof TABS

type THarness = {
	/** Пропсы набора поверх `view="contained"` и крестиков. */
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

/** Горизонтальный паддинг таба `b` растёт — его место и длина меняются без смены таба. */
const padded = ref(false)

/** Стиль таба `b`: свой и выросший паддинг. */
const styleOfB = (own?: string) =>
	[own, padded.value ? 'padding-inline: 24px' : undefined]
		.filter((part) => part !== undefined)
		.join('; ') || undefined

/** Набор из трёх табов с крестиками на сцене шириной 640 px. */
const harness = ({ tabs = {}, active = 'a', dir = 'ltr', style }: THarness = {}) =>
	defineComponent({
		render: () =>
			h('div', { class: 's-test-scene', style: 'width: 640px', dir }, [
				h(Tabs, { view: 'contained', closable: true, ...tabs }, () =>
					(Object.keys(TABS) as TValue[]).map((value) =>
						h(TabsItem, {
							key: value,
							value,
							text: TABS[value],
							active: value === active,
							style: value === 'b' ? styleOfB(style) : undefined,
						}),
					),
				),
			]),
	})

const root = () => find('.s-tabs')
const list = () => find('.s-tabs__list')
const scene = () => find('.s-test-scene')

/** Обёртка таба; её коробку и покрывает карточка. */
const tabOf = (value: TValue): HTMLElement => {
	const item = [...document.querySelectorAll('.s-tabs-item')].find(
		(node) => node.querySelector('[role="tab"]')?.textContent?.trim() === TABS[value],
	)

	if (!(item instanceof HTMLElement)) throw new Error(`таба ${value} нет`)

	return item
}

const rowOf = (value: TValue) => find('[role="tab"]', tabOf(value))
const closeOf = (value: TValue) => find('.s-tabs-item__close', tabOf(value))

/** Признак переезда на списке; пустая строка — его нет. */
const moving = () => list().style.getPropertyValue('--active-tab-moving')

/**
 * Видна ли карточка-псевдоэлемент. После замера он есть всегда, а виден —
 * при выбранном табе: выбор переключает видимость, не снимая псевдоэлемент
 * вместе с переходом.
 */
const hasCard = () => {
	const card = getComputedStyle(list(), '::before')

	return card.content !== 'none' && card.visibility === 'visible'
}

/** Карточка переходов списка: только его `::before`. */
const cardRuns = () => pseudoTransitionRuns(list(), '::before')

const cardSettled = () => pseudoSettled(list(), '::before')

/**
 * Плагин темы записал геометрию и включил скользящую карточку: модификатор
 * `--ready-animation` он ставит после первой записи.
 */
const measured = async () => {
	await expect.poll(() => root().classList.contains('s-tabs--ready-animation')).toBe(true)
}

/** Края карточки — края обёртки таба, по обеим осям. */
const cardMisses = (value: TValue): string[] => {
	const card = pseudoBox(list(), '::before')
	const tab = tabOf(value).getBoundingClientRect()
	const edges = ['left', 'right', 'top', 'bottom'] as const

	return edges
		.filter((edge) => Math.abs(card[edge] - tab[edge]) > EPSILON)
		.map((edge) => `${edge}: карточка ${card[edge]}, таб ${tab[edge]}`)
}

/** Карточка встаёт на таб — сразу или после пересчёта в следующем кадре. */
const expectCardOn = async (value: TValue) => {
	await expect.poll(() => cardMisses(value)).toEqual([])
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	padded.value = false
	await reducedMotion('no-preference')
})

/**
 * Раскладки, где место считается иначе: в RTL табы идут справа налево, а
 * сдвиг карточки остаётся физическим, у вертикальных главная ось — высота.
 */
const VERTICAL = { orientation: 'vertical' }
const TALLER = 'padding-block: 6px'

const LAYOUTS = [
	{ name: 'горизонтальные, LTR', dir: 'ltr', tabs: {}, style: undefined, size: 'width' },
	{ name: 'горизонтальные, RTL', dir: 'rtl', tabs: {}, style: undefined, size: 'width' },
	{ name: 'вертикальные', dir: 'ltr', tabs: VERTICAL, style: TALLER, size: 'height' },
	{ name: 'вертикальные в RTL', dir: 'rtl', tabs: VERTICAL, style: TALLER, size: 'height' },
] as const

describe('переезд к новому табу', () => {
	it.each(LAYOUTS)(
		'$name: карточка едет переходом и встаёт на новый таб, признак снят',
		async ({ dir, tabs, style, size }) => {
			render(harness({ dir, tabs, style }))

			await measured()
			await expectCardOn('a')

			const runs = cardRuns()

			await userEvent.click(rowOf('b'))
			await transitionEvents()

			// Место по главной оси и длина вдоль неё — `width` или `height`
			expect(runs).toEqual(expect.arrayContaining(['transform', size]))
			expect(moving()).toBe('1')

			await cardSettled()

			await expectCardOn('b')
			await expect.poll(moving).toBe('')
		},
	)

	/**
	 * Стрелка переводит фокус на соседний таб и активирует его: остановка Tab
	 * (`tabindex`) переезжает вместе с `data-selected`, как и при клике.
	 */
	it('стрелка — карточка переезжает к табу, ставшему активным', async () => {
		render(harness())

		await measured()

		const runs = cardRuns()

		rowOf('a').focus()
		await userEvent.keyboard('{ArrowRight}')
		await transitionEvents()

		expect(tabOf('b').getAttribute('data-selected')).toBe('true')
		expect(runs).toContain('transform')

		await cardSettled()
		await expectCardOn('b')
	})

	/**
	 * Сосед встаёт на место закрытого таба уже посреди переезда: адаптер
	 * убирает закрытый таб из разметки после активации соседа. Сдвиг
	 * приходит, пока признак стоит, — карточка доезжает до соседа на его
	 * новом месте, а не остаётся там, где он стоял до закрытия.
	 */
	it('закрыли активный — карточка встаёт на соседа, занявшего его место', async () => {
		render(harness())

		await measured()

		const before = tabOf('a').getBoundingClientRect()

		await userEvent.click(closeOf('a'))
		await expect.poll(() => tabOf('b').getAttribute('data-selected')).toBe('true')

		await transitionEvents()
		await cardSettled()

		await expectCardOn('b')
		expect(tabOf('b').getBoundingClientRect().left).toBeCloseTo(before.left, 0)
		await expect.poll(moving).toBe('')
	})
})

describe('без переезда — место сразу', () => {
	it('первая отрисовка: карточка на активном табе без перехода', async () => {
		render(harness())

		// Слушатель — до первого кадра: переход на монтировании он бы застал
		const runs = cardRuns()

		await measured()
		await expectCardOn('a')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})

	it('закрыли соседа слева — карточка идёт за табом без перехода', async () => {
		render(harness({ active: 'b' }))

		await measured()
		await expectCardOn('b')

		const runs = cardRuns()
		const before = tabOf('b').getBoundingClientRect().left

		await userEvent.click(closeOf('a'))

		// Таб сдвинулся — иначе проверять было бы нечего
		await expect.poll(() => tabOf('b').getBoundingClientRect().left).not.toBeCloseTo(before, 0)
		await expectCardOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})

	it('у активного таба вырос паддинг — карточка по его новой длине без перехода', async () => {
		render(harness({ active: 'b' }))

		await measured()
		await expectCardOn('b')

		const runs = cardRuns()
		const before = tabOf('b').getBoundingClientRect().width

		padded.value = true

		await expect.poll(() => tabOf('b').getBoundingClientRect().width).toBeGreaterThan(before)
		await expectCardOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
	})

	/**
	 * После переезда признак снят, и ресайз переставляет карточку сразу: с
	 * переходом она 200 мс отставала бы от текста своего таба. Табы растянуты
	 * на всю ширину — сужение сцены меняет и место, и длину таба.
	 */
	it('ресайз после переезда — без перехода', async () => {
		render(harness({ tabs: { alignment: 'stretch' } }))

		await measured()
		await userEvent.click(rowOf('b'))
		await transitionEvents()
		await cardSettled()
		await expect.poll(moving).toBe('')

		const runs = cardRuns()
		const before = tabOf('b').getBoundingClientRect()

		scene().style.width = '480px'

		await expect.poll(() => tabOf('b').getBoundingClientRect().width).toBeLessThan(before.width)
		await expectCardOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
	})

	it('система просит меньше движения — карточка встаёт на новый таб сразу', async () => {
		await reducedMotion('reduce')

		render(harness())

		await measured()

		const runs = cardRuns()

		await userEvent.click(rowOf('b'))
		await expectCardOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		await expect.poll(moving).toBe('')
	})
})

describe('карточка до замера и без выбранного таба', () => {
	/**
	 * До первого кадра переменных геометрии нет: так выглядят серверная
	 * разметка и приложение без `useTheme`. Карточку рисует фон выбранной
	 * обёртки, а псевдоэлемента нет вовсе. После замера фон обёртки уходит, и
	 * та же карточка — псевдоэлемент списка.
	 */
	it('до замера — фон выбранной обёртки, после — псевдоэлемент списка того же вида', async () => {
		render(harness())

		// Микрозадача, а не кадр: адаптер отрисовал, плагин ещё не мерил
		await nextTick()

		const card = style(tabOf('a')).backgroundColor

		expect(card).not.toBe(TRANSPARENT)
		expect(style(tabOf('b')).backgroundColor).toBe(TRANSPARENT)
		expect(hasCard()).toBe(false)

		await measured()
		await settled(tabOf('a'))

		expect(style(tabOf('a')).backgroundColor).toBe(TRANSPARENT)
		expect(style(list(), '::before').backgroundColor).toBe(card)
		await expectCardOn('a')
	})

	it('без выбранного таба карточки нет', async () => {
		render(harness({ active: null }))

		await measured()
		await transitionEvents()

		expect(hasCard()).toBe(false)

		for (const value of Object.keys(TABS) as TValue[]) {
			expect(style(tabOf(value)).backgroundColor, value).toBe(TRANSPARENT)
		}
	})

	/** Переезжать неоткуда: до этого таба карточка не стояла нигде. */
	it('первый выбранный таб — карточка появляется на нём без перехода', async () => {
		render(harness({ active: null }))

		await measured()

		const runs = cardRuns()

		await userEvent.click(rowOf('b'))
		await expectCardOn('b')
		await transitionEvents()

		expect(runs).toEqual([])
		expect(moving()).toBe('')
	})
})
