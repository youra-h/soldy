/**
 * Календарь в настоящем браузере — раскладка и фокус.
 *
 * Здесь то, чего jsdom не считает вовсе. Раскладка: высота месяца под шесть
 * недель при любом месяце — сетка не прыгает при листании, а соседние месяцы
 * стоят вровень, — кольцо фокуса, которое помещается в ячейку дня, и панель
 * выбора месяца и года: подложка во весь календарь и карточка у её верхнего
 * края — во всю ширину при любом числе сеток, высотой по содержимому, полоса
 * жеста у её низа, кромка в режиме принудительных цветов, — список 4 колонки по 3
 * строки, подписи месяцев и лет, которые переносятся между словами и не рвут
 * слово, а слово шире плитки срезают многоточием, и подписи дней недели —
 * короткие и узкие, по обе стороны правила ядра, — в своих колонках и под
 * карточкой. Фокус: порядок Tab,
 * `:focus-visible`, клик из Enter на кнопке листания, перенос DOM-фокуса за
 * фокусом коллекции, когда узел нового дня появляется кадром позже, и путь
 * фокуса через панель выбора — в том числе после нажатия по подложке и жеста.
 * Цвет: рамка «сегодня» — пара рамки `outlined` у Button, видная и на вуали.
 * Модель проверяет ядро, клавиши и указатель — тесты плагинов, проводку —
 * `ui/vue/__tests__/calendar.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Calendar, LocaleProvider } from '@soldy-ui/vue'
import { createEngineCalendar } from '@soldy-ui/core'
import type { TSwipe } from '@soldy-ui/core'
import { enUS, extendLocale } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find, lightness, outlined, pixel, settled, style, systemColor } from './colors'
import { DIRECTION_CASES, pointing, setDir, sidesOf, type TLine } from './directions'
import { forcedColors } from './media'
import { expectHidesWhenFaded, ownTransitions, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Зона захвата полосы жеста — не меньше 24px: минимум цели по WCAG 2.5.8. */
const GRIP_ZONE = 24

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Календарь между двумя кнопками — чтобы было откуда войти по Tab и куда
 * уйти. Узел корня плагины получают кадром позже, дни — ещё позже владельца.
 * `dir` — направление узла, в котором стоит календарь.
 */
const show = async (props: Record<string, unknown>, dir?: TLine, locale: TLocale = enUS) => {
	render(
		defineComponent({
			render: () =>
				h(LocaleProvider, { locale }, () =>
					h('div', { class: 's-host', dir }, [
						h('button', { class: 's-test-before' }, 'До'),
						h(Calendar, props),
						h('button', { class: 's-test-after' }, 'После'),
					]),
				),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/**
 * Тот же календарь под провайдером с языком `tag`: своего языка у календаря
 * нет, это тег локали поддерева. Строки — английские, раскладке они не важны.
 */
const showIn = (tag: string, props: Record<string, unknown>) =>
	show(props, undefined, extendLocale(enUS, { tag }))

const findAll = (selector: string): HTMLElement[] =>
	[...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/**
 * Прямоугольник самих строк текста узла, а не его коробки: область подписи
 * плитки — во всю плитку, колонка дня недели — шире имени. Текст, срезанный
 * многоточием, он отдаёт целиком — той ширины, что текст просит.
 */
const labelBox = (node: HTMLElement) => {
	const range = document.createRange()

	range.selectNodeContents(node)

	return range.getBoundingClientRect()
}

/** Ячейка дня по дате — по его имени, полной дате, как её прочтёт скринридер. */
const dayCell = (date: string): HTMLElement => {
	const [year, month, day] = date.split('-').map(Number)
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(year, month - 1, day),
	)

	return find(`.s-calendar-item[aria-label="${label}"]`)
}

const titles = () => findAll('.s-calendar__title').map((title) => title.textContent?.trim())

const tab = () => userEvent.keyboard('{Tab}')

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	// Три месяца в ряд: на узком окне они переносятся
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
	setDir(document.documentElement)
})

describe('высота месяца', () => {
	/**
	 * Февраль 2026 с воскресенья — ровно четыре недели, август — шесть. Ряд
	 * заголовков у соседей один, и недели у них стоят вровень, только если
	 * месяц держит место под шесть недель при любой своей длине.
	 */
	it('месяцы в четыре и шесть недель одной высоты', async () => {
		await show({ months: ['2026-02-01', '2026-08-01'] })

		const [february, august] = findAll('.s-calendar__month')

		expect(february.querySelectorAll('.s-calendar__week')).toHaveLength(4)
		expect(august.querySelectorAll('.s-calendar__week')).toHaveLength(6)
		expect(
			Math.abs(
				february.getBoundingClientRect().height - august.getBoundingClientRect().height,
			),
		).toBeLessThanOrEqual(EPSILON)
	})

	it('листание по месяцам разной длины не меняет высоту календаря', async () => {
		await show({ months: ['2026-02-01'] })

		const root = find('.s-calendar')
		const height = root.getBoundingClientRect().height

		// Март — пять недель, апрель — пять, май — шесть
		for (const title of ['March 2026', 'April 2026', 'May 2026']) {
			find('.s-calendar__next').click()
			await expect.poll(titles).toEqual([title])

			expect(Math.abs(root.getBoundingClientRect().height - height)).toBeLessThanOrEqual(
				EPSILON,
			)
		}
	})
})

describe('кольцо фокуса', () => {
	/**
	 * Кольцо рисует плитка дня, ячейка шире её на запас. Соседние дни стоят
	 * вплотную, и кольцо, вышедшее за ячейку, легло бы на соседа.
	 */
	it('кольцо дня помещается в его ячейку', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-test-before').focus()
		await tab()
		await tab()
		await tab()
		await tab()

		const cell = dayCell('2026-09-16')

		expect(document.activeElement).toBe(cell)

		const tile = cell.querySelector('.s-calendar-item__day')

		if (!tile) throw new Error('у дня нет плитки')

		const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(tile)
		const ring = parseFloat(outlineWidth) + parseFloat(outlineOffset)
		const box = tile.getBoundingClientRect()
		const room = cell.getBoundingClientRect()

		expect(outlineStyle).not.toBe('none')
		expect(parseFloat(outlineWidth)).toBeGreaterThan(0)
		expect(box.left - ring).toBeGreaterThanOrEqual(room.left - EPSILON)
		expect(box.right + ring).toBeLessThanOrEqual(room.right + EPSILON)
		expect(box.top - ring).toBeGreaterThanOrEqual(room.top - EPSILON)
		expect(box.bottom + ring).toBeLessThanOrEqual(room.bottom + EPSILON)
	})
})

describe('фокус', () => {
	/**
	 * Tab идёт за глазом: заголовок первого месяца у начала ряда, за ним — пара
	 * кнопок листания, потом заголовки следующих месяцев и одна остановка на все
	 * сетки.
	 */
	it('Tab проходит заголовок первого месяца, «назад», «вперёд», заголовки следующих и одну остановку на все сетки', async () => {
		await show({ months: ['2026-09-01', '2026-10-01'], value: '2026-10-05' })

		const [september, october] = findAll('.s-calendar__title')

		find('.s-test-before').focus()

		await tab()
		expect(document.activeElement).toBe(september)

		await tab()
		expect(document.activeElement).toBe(find('.s-calendar__prev'))

		await tab()
		expect(document.activeElement).toBe(find('.s-calendar__next'))

		await tab()
		expect(document.activeElement).toBe(october)

		await tab()
		expect(document.activeElement).toBe(dayCell('2026-10-05'))

		await tab()
		expect(document.activeElement).toBe(find('.s-test-after'))
	})

	it('стрелки ведут фокус по дням, в RTL ← — к следующему дню', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' }, 'rtl')

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(dayCell('2026-09-17'))

		await userEvent.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(dayCell('2026-09-24'))
	})

	it('PageDown уводит сетку в следующий месяц, фокус — на день нового месяца', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{PageDown}')

		await expect.poll(titles).toEqual(['October 2026'])
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})

	it('Enter на кнопке листает, и фокус остаётся на ней', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(document.activeElement).toBe(find('.s-calendar__next'))
	})

	/**
	 * Выключенная кнопка фокус теряет, и он упал бы на страницу. Плагин
	 * переводит его на остановку сетки — день, куда уехал фокус коллекции.
	 */
	it('кнопка погасла у границы под фокусом — фокус на день сетки', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16', max: '2026-10-31' })

		find('.s-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(find('.s-calendar__next').hasAttribute('disabled')).toBe(true)
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})
})

/**
 * Стрелки — то, что тема зеркалит сама: роль иконки одна, `arrowRight`, а у
 * стрелки нет логических направлений. Знак тема берёт у ближайшего `dir`, как
 * браузер — направленность раскладки, поэтому календарь с `direction="ltr"` в
 * RTL-предке остаётся календарём LTR целиком (`browser/directions.ts`). Панель
 * выбора месяца и года лежит в календаре, и её стрелки идут за ним.
 */
describe.each(DIRECTION_CASES)('стрелки по ближайшему dir: $name', (scenario) => {
	const { start, end } = sidesOf(scenario.line)

	it('«назад» смотрит в начало строки, «вперёд» — в конец: у листания и в панели выбора', async () => {
		setDir(document.documentElement, scenario.page)
		await show({ months: ['2026-09-01'], direction: scenario.direction }, scenario.ancestor)

		expect(pointing('.s-calendar__prev'), 'листание «назад»').toBe(start)
		expect(pointing('.s-calendar__next'), 'листание «вперёд»').toBe(end)

		await userEvent.click(find('.s-calendar__title'))
		await expect
			.poll(() => findAll('.s-calendar__picker-list .s-list-box-item').length)
			.toBe(12)

		expect(pointing('.s-calendar__picker-prev'), 'панель «назад»').toBe(start)
		expect(pointing('.s-calendar__picker-next'), 'панель «вперёд»').toBe(end)
	})
})

/** Прямоугольник узла. */
const rectOf = (node: Element) => node.getBoundingClientRect()

/**
 * Плитка дня в колонке `column` (0 — первый день недели) второй недели
 * месяца: вторая неделя всегда целиком в своём месяце, заполнителей в ней нет.
 */
const tileIn = (month: Element, column: number): DOMRect => {
	const tile = month
		.querySelectorAll('.s-calendar__week')[1]
		?.children[column]?.querySelector('.s-calendar-item__day')

	if (!tile) throw new Error(`колонка ${column}: плитки нет`)

	return rectOf(tile)
}

/** Края прямоугольников по строке совпадают — с допуском на субпиксели. */
const expectSameColumn = (actual: DOMRect, expected: DOMRect, what: string) => {
	expect(Math.abs(actual.left - expected.left), `${what}: левый край`).toBeLessThanOrEqual(
		EPSILON,
	)
	expect(Math.abs(actual.right - expected.right), `${what}: правый край`).toBeLessThanOrEqual(
		EPSILON,
	)
}

/** Центр прямоугольника по вертикали. */
const middle = (rect: DOMRect) => rect.top + rect.height / 2

/**
 * Шапка — как в календаре Android: заголовок месяца у начала ряда, вровень с
 * плиткой первой колонки, а «назад» и «вперёд» — вплотную у конца, над
 * плитками шестой и седьмой колонок. Шапка панели выбора месяца и года
 * устроена так же: год у начала, стрелки вплотную у конца с тем же зазором.
 * Стороны — логические: в RTL заголовок справа, стрелки слева. Случаи —
 * `browser/directions.ts`: решает ближайший `dir`.
 */
describe.each(DIRECTION_CASES)('шапка по ближайшему dir: $name', (scenario) => {
	const { start, end } = sidesOf(scenario.line)

	/** Между прямоугольниками по строке — от конца первого до начала второго. */
	const between = (first: DOMRect, second: DOMRect) =>
		scenario.line === 'ltr' ? second.left - first.right : first.left - second.right

	it('заголовок у начала, стрелки над двумя последними колонками; в панели — год у начала, стрелки у конца', async () => {
		setDir(document.documentElement, scenario.page)
		await show({ months: ['2026-09-01'], direction: scenario.direction }, scenario.ancestor)

		const month = find('.s-calendar__month')
		const title = rectOf(find('.s-calendar__title'))
		const prev = rectOf(find('.s-calendar__prev'))
		const next = rectOf(find('.s-calendar__next'))

		expect(
			Math.abs(title[start] - tileIn(month, 0)[start]),
			'заголовок — вровень с первой колонкой',
		).toBeLessThanOrEqual(EPSILON)
		expectSameColumn(prev, tileIn(month, 5), '«назад» над шестой колонкой')
		expectSameColumn(next, tileIn(month, 6), '«вперёд» над седьмой колонкой')

		// Один ряд, и заголовок на стрелки не заходит
		expect(Math.abs(middle(prev) - middle(title))).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(middle(next) - middle(title))).toBeLessThanOrEqual(EPSILON)
		expect(between(title, prev)).toBeGreaterThanOrEqual(-EPSILON)

		const gap = between(prev, next)

		await userEvent.click(find('.s-calendar__title'))
		await expect
			.poll(() => findAll('.s-calendar__picker-list .s-list-box-item').length)
			.toBe(12)

		const header = rectOf(find('.s-calendar__picker-header'))
		const heading = rectOf(find('.s-calendar__picker-heading'))
		const pickerPrev = rectOf(find('.s-calendar__picker-prev'))
		const pickerNext = rectOf(find('.s-calendar__picker-next'))

		expect(Math.abs(heading[start] - header[start]), 'год — у начала').toBeLessThanOrEqual(
			EPSILON,
		)
		expect(Math.abs(pickerNext[end] - header[end]), '«вперёд» — у конца').toBeLessThanOrEqual(
			EPSILON,
		)
		expect(
			Math.abs(between(pickerPrev, pickerNext) - gap),
			'стрелки вплотную, с зазором кнопок листания',
		).toBeLessThanOrEqual(EPSILON)
		expect(between(heading, pickerPrev), 'год на стрелки не заходит').toBeGreaterThan(0)
	})
})

/**
 * Подвал — строка под сетками во всю ширину календаря, только когда слот
 * передан. Кнопки стоят у конца строки, вровень с плиткой последней колонки, а
 * ширину календаря задают месяцы: подвал в одном ряду с ними раздвинул бы его,
 * и кнопки листания повисли бы за последней колонкой.
 */
describe('подвал', () => {
	/** Календарь с подвалом из кнопок с подписями `labels`. */
	const showWithFooter = async (
		props: Record<string, unknown>,
		labels: readonly string[],
		dir?: TLine,
	) => {
		render(
			defineComponent({
				render: () =>
					h(LocaleProvider, { locale: enUS }, () =>
						h('div', { class: 's-host', dir }, [
							h(Calendar, props, {
								footer: () =>
									labels.map((text) =>
										h(Button, { class: 's-test-action', text }),
									),
							}),
						]),
					),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	it('без слота подвала нет', async () => {
		await show({ months: ['2026-09-01'] })

		expect(document.querySelector('.s-calendar__footer')).toBeNull()
	})

	it.each(['ltr', 'rtl'] as const)(
		'%s: под сетками, кнопки у конца строки — вровень с последней колонкой',
		async (line) => {
			await showWithFooter({ months: ['2026-09-01'] }, ['Cancel', 'OK'], line)

			const { end } = sidesOf(line)
			const footer = rectOf(find('.s-calendar__footer'))
			const actions = findAll('.s-test-action').map(rectOf)
			const last = actions[actions.length - 1]
			const month = find('.s-calendar__month')

			expect(footer.top).toBeGreaterThanOrEqual(rectOf(find('.s-calendar__grid')).bottom)
			expect(Math.abs(last[end] - tileIn(month, 6)[end])).toBeLessThanOrEqual(EPSILON)
			// Ширину календаря задаёт месяц
			expectSameColumn(rectOf(find('.s-calendar')), rectOf(month), 'календарь — по месяцу')
		},
	)

	it('кнопки шире месяца календарь не раздвигают: стрелки — над последними колонками', async () => {
		const wide = 'A very long action label that does not fit the month'

		await showWithFooter({ months: ['2026-09-01'], size: 'sm' }, [wide, wide], 'ltr')

		const month = find('.s-calendar__month')

		expectSameColumn(rectOf(find('.s-calendar')), rectOf(month), 'календарь — по месяцу')
		expectSameColumn(rectOf(find('.s-calendar__next')), tileIn(month, 6), '«вперёд»')
	})

	it('два месяца с подвалом — между ними прежний зазор, стрелки над последним', async () => {
		await showWithFooter({ months: ['2026-09-01', '2026-10-01'] }, ['Cancel', 'OK'], 'ltr')

		const [september, october] = findAll('.s-calendar__month')
		const gap = parseFloat(getComputedStyle(find('.s-calendar__months')).columnGap)

		expect(Math.abs(rectOf(october).left - rectOf(september).right - gap)).toBeLessThanOrEqual(
			EPSILON,
		)
		expectSameColumn(rectOf(find('.s-calendar__next')), tileIn(october, 6), '«вперёд»')
		expectSameColumn(rectOf(find('.s-calendar__prev')), tileIn(october, 5), '«назад»')
	})
})

describe('указатель', () => {
	it('предпросмотр диапазона идёт за указателем', async () => {
		await show({ months: ['2026-09-01'], value: undefined, mode: 'range' })

		await userEvent.click(dayCell('2026-09-10'))
		await userEvent.hover(dayCell('2026-09-13'))

		await expect.poll(() => findAll('.s-calendar-item[data-preview="true"]').length).toBe(4)

		await userEvent.click(dayCell('2026-09-13'))

		await expect
			.poll(() => findAll('.s-calendar-item[data-range-middle="true"]').length)
			.toBe(2)
		expect(findAll('.s-calendar-item[data-preview="true"]')).toHaveLength(0)
	})
})

/**
 * Рамка «сегодня» — пара рамки `outlined` у Button: в покое та же ступень,
 * что у рамки кнопки, а на вуали — под наведением и нажатием, на ленте
 * диапазона и в предпросмотре — на ступень сильнее, как рамка кнопки под
 * наведением. Насыщенной ступенью рамка горела ярче любой рамки рядом, а
 * ступени покоя на вуали мало: в тёмной схеме на панели DatePicker лента почти
 * её цвета, и рамка в ней пропадала.
 *
 * Палитры тест не знает, как и сторож видов Button (`button-view.spec.ts`):
 * рамку он сверяет с рамкой кнопки рядом, а на вуали меряет, насколько она
 * ушла от того, что под ней, в сторону текста дня.
 */
describe('рамка «сегодня»', () => {
	/** Обе схемы: рамка пропадала только в тёмной, а правило у схем общее. */
	const SCHEMES = ['oren', 'oren-dark'] as const

	type TScheme = (typeof SCHEMES)[number]

	/**
	 * Где стоит календарь: на странице и в панели DatePicker — у неё
	 * поверхность контрола, как у панелей Select и Popover.
	 */
	const BACKDROPS = {
		страница: 'var(--s-neutral-50)',
		'панель DatePicker': 'var(--s-component-surface)',
	} as const

	type TBackdrop = keyof typeof BACKDROPS

	const CASES = SCHEMES.flatMap((scheme) =>
		(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
	)

	/** Порог заметности рамки по светлоте OKLab — тот же, что у рамки `outlined` у Button. */
	const VISIBLE_BORDER = 0.04

	/** Пропсы календаря от даты «сегодня». */
	type TProps = (today: string) => Record<string, unknown>

	/** Сегодня по UTC: тот же день отмечает календарь с `timeZone: 'UTC'`. */
	const todayInUtc = () => new Date().toISOString().slice(0, 10)

	/** Сутки в миллисекундах. */
	const DAY = 24 * 60 * 60 * 1000

	/** Дата на `days` дней от `date`. */
	const daysFrom = (date: string, days: number) =>
		new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10)

	/**
	 * Диапазон со вчера до завтра: сегодня — его середина, на ленте. Месяц
	 * сетки задан, и выбор в соседнем месяце её не сдвигает.
	 */
	const band: TProps = (today) => ({
		mode: 'range',
		value: [daysFrom(today, -1), daysFrom(today, 1)],
	})

	/** Ряд сцены: части стоят рядом, каждая своей высоты. */
	const ROW = 'display: flex; gap: 8px; align-items: flex-start'

	/**
	 * Сцена: на каждой подложке — месяц, в котором сегодня, и кнопка
	 * `outlined` рядом. Указатель уведён со всех частей.
	 */
	const showToday = async (scheme: TScheme, props: TProps = () => ({})) => {
		const today = todayInUtc()

		document.documentElement.dataset.theme = scheme
		render(
			defineComponent({
				render: () =>
					h('div', { style: ROW }, [
						h('div', { class: 's-test-away', style: 'width: 24px; height: 24px' }),
						...Object.entries(BACKDROPS).map(([name, color]) =>
							h(
								'div',
								{
									key: name,
									'data-backdrop': name,
									style: `background: ${color}; padding: 8px; ${ROW}`,
								},
								[
									h(Calendar, {
										months: [`${today.slice(0, 7)}-01`],
										timeZone: 'UTC',
										...props(today),
									}),
									h(Button, { view: 'outlined', text: 'Рамка' }),
								],
							),
						),
					]),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()
		await userEvent.hover(find('.s-test-away'))
		await settled(document.body)
	}

	/** Части сцены на подложке: сама подложка, кнопка, день «сегодня» и его плитка. */
	const partsOf = (backdrop: TBackdrop) => {
		const root = find(`[data-backdrop="${backdrop}"]`)
		const cell = find('.s-calendar-item[data-today="true"]', root)

		return {
			root,
			cell,
			tile: find('.s-calendar-item__day', cell),
			button: find('.s-button--view-outlined', root),
		}
	}

	/** Цвет рамки — байтами sRGB: запись браузера сравнивать нельзя. */
	const borderOf = (element: HTMLElement) => pixel([style(element).borderTopColor])

	it.each(CASES)('$scheme, $backdrop: в покое — цвета рамки outlined', async (scenario) => {
		await showToday(scenario.scheme)

		const { tile, button } = partsOf(scenario.backdrop)

		expect(borderOf(tile)).toEqual(borderOf(button))
	})

	it.each(CASES)(
		'$scheme, $backdrop: под наведением — цвета рамки outlined под наведением',
		async (scenario) => {
			await showToday(scenario.scheme)

			const { cell, tile, button } = partsOf(scenario.backdrop)

			await userEvent.hover(button)
			await settled(document.body)

			const hovered = borderOf(button)

			await userEvent.hover(cell)
			await settled(document.body)

			expect(borderOf(tile)).toEqual(hovered)
		},
	)

	/** Вуаль под рамкой. */
	interface IVeil {
		name: string
		/** Пропсы календаря, при которых она бывает. */
		props: TProps
		/** Поставить её и держать, пока идёт замер. */
		hold: (cell: HTMLElement, measure: () => void) => Promise<void>
		/** Состояние дня, при котором она стоит. */
		state: string
		/** Её цвет. */
		color: (cell: HTMLElement) => string
	}

	/** Наведение и нажатие красят саму плитку. */
	const tileVeil = (cell: HTMLElement) =>
		style(find('.s-calendar-item__day', cell)).backgroundColor

	/** Лента и предпросмотр лежат под плиткой — псевдоэлементом ячейки. */
	const bandVeil = (cell: HTMLElement) => style(cell, '::before').backgroundColor

	const VEILS: readonly IVeil[] = [
		{
			name: 'наведение',
			props: () => ({}),
			hold: async (cell, measure) => {
				await userEvent.hover(cell)
				await settled(document.body)
				measure()
			},
			state: ':hover',
			color: tileVeil,
		},
		{
			// Нажали и увели указатель: наведения на дне уже нет, а вуаль
			// нажатия держится до отпускания
			name: 'нажатие',
			props: () => ({}),
			hold: async (cell, measure) => {
				await userEvent.hover(cell)
				await commands.mouseDown()

				try {
					await userEvent.hover(find('.s-test-away'))
					await settled(document.body)
					measure()
				} finally {
					await commands.mouseUp()
				}
			},
			state: ':active:not(:hover)',
			color: tileVeil,
		},
		{
			name: 'лента',
			props: band,
			hold: async (_cell, measure) => measure(),
			state: '[data-range-middle="true"]',
			color: bandVeil,
		},
		{
			// Якорь — сам день «сегодня». Указатель ушёл, и предпросмотр идёт
			// от якоря до фокуса — до того же дня
			name: 'предпросмотр',
			props: () => ({ mode: 'range' }),
			hold: async (cell, measure) => {
				await userEvent.click(cell)
				await userEvent.hover(find('.s-test-away'))
				await settled(document.body)
				measure()
			},
			state: '[data-preview="true"]',
			color: bandVeil,
		},
	]

	describe.each(VEILS)('на вуали: $name', (veil) => {
		it.each(CASES)(
			'$scheme, $backdrop: рамка уходит от вуали к тексту дня',
			async (scenario) => {
				await showToday(scenario.scheme, veil.props)

				const { root, cell, tile } = partsOf(scenario.backdrop)

				await veil.hold(cell, () => {
					expect(cell.matches(veil.state), veil.state).toBe(true)

					// Под рамкой — подложка и вуаль: фон плитки лежит и под её рамкой
					const under = [style(root).backgroundColor, veil.color(cell)]
					const base = lightness(under)
					const toward = Math.sign(lightness([...under, style(tile).color]) - base)
					const border =
						(lightness([...under, style(tile).borderTopColor]) - base) * toward

					expect(border).toBeGreaterThan(VISIBLE_BORDER)
				})
			},
		)
	})

	/**
	 * На вуали ступень подменяет переменная, а не `border-color`: правило
	 * рамки на вуали было бы сильнее правила режима принудительных цветов, и на
	 * подсветке ленты рамка осталась бы ступенью темы, а не текстом подсветки.
	 */
	describe('принудительные цвета', () => {
		afterEach(async () => {
			await forcedColors('none')
		})

		it.each(SCHEMES)('%s: рамка на ленте — текстом подсветки', async (scheme) => {
			await forcedColors('active')
			await showToday(scheme, band)

			const { cell, tile } = partsOf('страница')

			expect(cell.dataset.rangeMiddle).toBe('true')
			expect(borderOf(tile)).toEqual(pixel([systemColor('HighlightText')]))
		})
	})
})

describe('выбор месяца и года', () => {
	const options = () => findAll('.s-calendar__picker-list .s-list-box-item')

	/** Различные значения, с допуском на субпиксели. */
	const distinct = (values: number[]) =>
		values.reduce<number[]>(
			(found, value) =>
				found.some((known) => Math.abs(known - value) <= EPSILON)
					? found
					: [...found, value],
			[],
		)

	/** Переходы панели — её и карточки внутри — доиграли: геометрия на месте. */
	const settled = async () => {
		await nextFrame()
		await Promise.all(
			find('.s-popover__panel')
				.getAnimations({ subtree: true })
				.map((animation) => animation.finished),
		)
	}

	/** Открыть панель нажатием на заголовок и дождаться её на месте. */
	const open = async () => {
		await userEvent.click(find('.s-calendar__title'))
		await expect.poll(() => options().length).toBe(12)
		await settled()
	}

	/** Прямоугольник узла по селектору. */
	const box = (selector: string) => find(selector).getBoundingClientRect()

	/** Те же место и размер — с допуском на субпиксели. */
	const expectSameBox = (actual: DOMRect, expected: DOMRect) => {
		for (const side of ['left', 'top', 'width', 'height'] as const) {
			expect(Math.abs(actual[side] - expected[side])).toBeLessThanOrEqual(EPSILON)
		}
	}

	/** Строка опции и область её подписи. */
	const rowOf = (option: HTMLElement) => {
		const row = option.querySelector(':scope > .s-button')
		const text = row?.querySelector(':scope > .s-button__text')

		if (!(row instanceof HTMLElement) || !(text instanceof HTMLElement)) {
			throw new Error('у опции нет строки с подписью')
		}

		return { row, text }
	}

	/** Шаги между соседними значениями по возрастанию. */
	const steps = (values: number[]) =>
		[...values]
			.sort((a, b) => a - b)
			.flatMap((value, i, sorted) => (i ? [value - sorted[i - 1]] : []))

	/**
	 * 12 опций — 4 колонки по 3 строки, шапка над списком. Ячейки поровну по
	 * ширине и высоте, строка — во всю ячейку, между строками — один небольшой
	 * зазор по обеим осям, подпись — по центру строки по обеим осям.
	 */
	const expectGrid = () => {
		const items = options()
		const boxes = items.map((option) => option.getBoundingClientRect())
		const lefts = distinct(boxes.map((option) => option.left))
		const tops = distinct(boxes.map((option) => option.top))

		expect(lefts).toHaveLength(4)
		expect(tops).toHaveLength(3)
		expect(distinct(boxes.map((option) => option.width))).toHaveLength(1)
		expect(distinct(boxes.map((option) => option.height))).toHaveLength(1)

		const [{ width, height }] = boxes

		// Строки — своей высоты: плитка не вытянута
		expect(height).toBeLessThanOrEqual(width * 1.2)

		const gaps = [
			...steps(lefts).map((step) => step - width),
			...steps(tops).map((step) => step - height),
		]

		expect(distinct(gaps)).toHaveLength(1)
		expect(gaps[0]).toBeGreaterThan(0)
		expect(gaps[0]).toBeLessThan(Math.min(width, height) / 4)

		for (const option of items) {
			const cell = option.getBoundingClientRect()
			const { row, text } = rowOf(option)
			const label = labelBox(text)

			expectSameBox(row.getBoundingClientRect(), cell)
			expect(
				Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
			).toBeLessThanOrEqual(1)
			expect(
				Math.abs(label.top + label.height / 2 - (cell.top + cell.height / 2)),
			).toBeLessThanOrEqual(1)
		}

		expect(box('.s-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.s-calendar__picker-list').top + EPSILON,
		)
	}

	/** Отступ карточки по вертикали и по строке — один, два запаса. */
	const padding = () => parseFloat(getComputedStyle(find('.s-calendar__picker')).paddingTop)

	/**
	 * Открыть панель с жестом или без. Жест включает расширение `picker` у
	 * поповера места; выключают его тем же поповером — из выхода `pickers`
	 * движка, переданного календарю.
	 */
	const openWith = async (props: Record<string, unknown>, swipe: TSwipe) => {
		const engine = createEngineCalendar()

		await show({ months: ['2026-09-01'], ...props, engine })

		for (const picker of engine.extensions.picker.pickers) picker.popover.swipe = swipe

		await open()
	}

	/**
	 * Подложка — сама панель во весь календарь, а выбирают в карточке: она
	 * выезжает сверху, как выезжающая панель, — от верхнего края календаря и во
	 * всю его ширину. Меняется только низ: высота карточки — по содержимому,
	 * шапка над списком, под списком — отступ или полоса жеста, — и под ней
	 * видно подложку с последними неделями месяца.
	 */
	const expectCard = () => {
		const calendar = box('.s-calendar')
		const card = box('.s-calendar__picker')

		expectSameBox(box('.s-popover__panel'), calendar)
		expect(Math.abs(card.top - calendar.top)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.left - calendar.left)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.right - calendar.right)).toBeLessThanOrEqual(EPSILON)
		expect(calendar.bottom - card.bottom).toBeGreaterThan(box('.s-calendar__weekday').height)
		expect(box('.s-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.s-calendar__picker-list').top + EPSILON,
		)
	}

	describe.each(COMPONENT_SIZES)('карточка, size %s', (size) => {
		it('с полосой жеста: полоса у низа карточки, во всю её ширину, список не накрывает', async () => {
			await openWith({ size }, 'handle')

			expectCard()

			const card = box('.s-calendar__picker')
			const list = box('.s-calendar__picker-list')
			const grip = box('.s-popover__handle')

			expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
			expect(Math.abs(grip.bottom - card.bottom)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.left - card.left)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.width - card.width)).toBeLessThanOrEqual(EPSILON)
			expect(grip.top).toBeGreaterThanOrEqual(list.bottom - EPSILON)
		})

		it('без полосы: под списком — отступ карточки', async () => {
			await openWith({ size }, 'none')

			expectCard()

			const under = box('.s-calendar__picker').bottom - box('.s-calendar__picker-list').bottom

			expect(document.querySelector('.s-popover__handle')).toBeNull()
			expect(Math.abs(under - padding())).toBeLessThanOrEqual(EPSILON)
		})
	})

	/**
	 * Карточка — одна на весь календарь, сколько бы сеток он ни показывал:
	 * подложка накрывает все, карточка — во всю ширину календаря у его верхнего
	 * края.
	 */
	it('три сетки — карточка во всю ширину календаря, у верхнего края', async () => {
		await show({ months: ['2026-08-01', '2026-09-01', '2026-10-01'] })
		await open()

		// Три месяца стоят в ряд — иначе проверять нечего
		expect(
			distinct(findAll('.s-calendar__month').map((month) => month.offsetTop)),
		).toHaveLength(1)
		expectCard()
	})

	/**
	 * Тень и кромка-кольцо — слои `box-shadow`. У подложки они сняты и
	 * остаются слоями нулевого размера, у карточки видны: карточка — та же
	 * семья, что панели оверлеев.
	 */
	it('кольцо и тень — у карточки, у подложки ни кромки, ни тени', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const lengths = (selector: string) =>
			(style(find(selector)).boxShadow.match(/-?\d+(\.\d+)?px/g) ?? []).map(parseFloat)

		expect(lengths('.s-popover__panel').every((length) => length === 0)).toBe(true)
		expect(lengths('.s-calendar__picker').some((length) => length !== 0)).toBe(true)
		expect(outlined(find('.s-popover__panel'))).toBe(false)
		expect(outlined(find('.s-calendar__picker'))).toBe(false)
		expect(style(find('.s-calendar__picker-list')).borderTopWidth).toBe('0px')
	})

	it.each(['sm', 'normal', 'xl'] as const)(
		'size %s: месяцы — 4×3 ровными ячейками с зазором, подпись по центру, шапка над списком',
		async (size) => {
			await showIn('ru-RU', { months: ['2026-09-01'], size })
			await open()

			expectGrid()
		},
	)

	/** Слова подписи, которые разошлись по двум строкам. */
	const brokenWords = (text: HTMLElement): string[] =>
		[...text.childNodes].flatMap((node) =>
			node instanceof Text
				? [...node.data.matchAll(/\S+/g)].flatMap((match) => {
						const range = document.createRange()

						range.setStart(node, match.index)
						range.setEnd(node, match.index + match[0].length)

						const lines = distinct([...range.getClientRects()].map((rect) => rect.top))

						return lines.length > 1 ? [match[0]] : []
					})
				: [],
		)

	/**
	 * Видимая часть подписи: текст, который область срезает (`overflow` не
	 * `visible`), виден только в её границах.
	 */
	const visibleBox = (text: HTMLElement) => {
		const label = labelBox(text)

		if (getComputedStyle(text).overflowX === 'visible') return label

		const area = text.getBoundingClientRect()

		return { left: Math.max(label.left, area.left), right: Math.min(label.right, area.right) }
	}

	/**
	 * Подпись года переносится только между словами — у `th-TH` она с эрой
	 * («พ.ศ. 2569»), и многоточие срезало бы номер. На любом размере слова
	 * целы, подпись не срезана и стоит в своей плитке.
	 */
	it.each(COMPONENT_SIZES)(
		'size %s: годы — так же ровной сеткой 4×3, подписи th-TH с эрой переносятся, а не режутся',
		async (size) => {
			await showIn('th-TH', { months: ['2026-09-01'], size })
			await open()

			const january = options()[0]?.textContent

			await userEvent.click(find('.s-calendar__picker-heading'))
			await expect.poll(() => options()[0]?.textContent).not.toBe(january)
			await nextFrame()

			expectGrid()

			for (const option of options()) {
				const { row, text } = rowOf(option)
				const cell = row.getBoundingClientRect()
				const label = labelBox(text)
				const name = text.textContent?.trim() ?? ''

				expect(brokenWords(text), name).toEqual([])
				expect(text.scrollWidth, name).toBeLessThanOrEqual(text.clientWidth)
				expect(label.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(cell.right + EPSILON)
			}
		},
	)

	/**
	 * Имя месяца в несколько слов переносится между словами, а не режется: у
	 * `vi-VN` оно «Tháng 10», и на крупных размерах шире плитки. Многоточие
	 * срезало бы номер, и «Tháng 10»–«Tháng 12» стали бы одинаковым «Tháng …».
	 * На любом размере подпись видна целиком — ничего из неё не срезано, — слова
	 * целы, и она стоит в своей плитке по ширине и по высоте: две строки в
	 * плитку помещаются.
	 */
	it.each(COMPONENT_SIZES)(
		'size %s: месяцы vi-VN в несколько слов переносятся между словами, а не режутся',
		async (size) => {
			await showIn('vi-VN', { months: ['2026-09-01'], size })
			await open()

			expectGrid()

			// Подписи разные — различимы они, если видны целиком (ниже)
			const names = options().map((option) => rowOf(option).text.textContent?.trim())

			expect(new Set(names).size).toBe(12)

			for (const option of options()) {
				const { row, text } = rowOf(option)
				const cell = row.getBoundingClientRect()
				const area = text.getBoundingClientRect()
				const label = labelBox(text)
				const name = text.textContent?.trim() ?? ''

				expect(brokenWords(text), name).toEqual([])
				// Ничего не срезано: строки подписи — внутри области текста, а
				// она срезает всё, что за её краем
				expect(label.left, name).toBeGreaterThanOrEqual(area.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(area.right + EPSILON)
				expect(label.top, name).toBeGreaterThanOrEqual(area.top - EPSILON)
				expect(label.bottom, name).toBeLessThanOrEqual(area.bottom + EPSILON)
				// И в своей плитке
				expect(label.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(cell.right + EPSILON)
				expect(label.top, name).toBeGreaterThanOrEqual(cell.top - EPSILON)
				expect(label.bottom, name).toBeLessThanOrEqual(cell.bottom + EPSILON)
			}
		},
	)

	/**
	 * Слову шире самой плитки переносить некуда — оно режется многоточием, и
	 * только оно: полей у подписи нет, а разрезать слово переносом подпись не
	 * даёт. Имя, которому плитки хватает, стоит целым и по центру; шире плитки
	 * — режется у её края, и видимая часть из плитки не выходит. Самые длинные
	 * слова — у `ta-IN` («ஜூலை») и `ml-IN` («സെപ്റ്റം», «ഫെബ്രു»); `ar-EG` — то
	 * же справа налево. Граница в пиксель вокруг ширины плитки — на
	 * округление: там проверяется только место.
	 */
	describe.each(['ar-EG', 'ta-IN', 'ml-IN'])('месяцы %s', (locale) => {
		it.each(COMPONENT_SIZES)(
			'size %s: в своей плитке — целые по центру, шире плитки — многоточием',
			async (size) => {
				await showIn(locale, { months: ['2026-09-01'], size })
				await open()

				for (const option of options()) {
					const { row, text } = rowOf(option)
					const cell = row.getBoundingClientRect()
					const label = labelBox(text)
					const visible = visibleBox(text)
					const name = text.textContent?.trim() ?? ''

					expect(brokenWords(text), name).toEqual([])
					expect(visible.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
					expect(visible.right, name).toBeLessThanOrEqual(cell.right + EPSILON)

					if (label.width < cell.width - 1) {
						expect(text.scrollWidth, name).toBeLessThanOrEqual(text.clientWidth)
						expect(
							Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
							name,
						).toBeLessThanOrEqual(1)
					}

					if (label.width > cell.width + 1) {
						expect(getComputedStyle(text).textOverflow, name).toBe('ellipsis')
					}
				}
			},
		)
	})

	/**
	 * Подпись дня недели — короткое имя, если у всей недели локали в нём не
	 * больше трёх букв, иначе узкое (правило ядра — `weekdayLabelWidth`).
	 * Проверка — по обе стороны правила. Короткие у `ru-RU`, `fr-FR` («lun.»),
	 * `zh-CN` и `hi-IN` («मंगल») обязаны поместиться в колонку на любом
	 * размере. Узкие — у `ar-EG` и `ml-IN`, где короткие — целые слова, и у
	 * `ta-IN`, `te-IN` и `th-TH`, где в коротких по четыре-пять знаков шириной в
	 * букву («ஞாயி.», «మంగళ», «อาทิตย์»): такие короткие шире колонки — колонка
	 * срезала бы их посреди буквы, а под открытой панелью их края выглядывали
	 * бы из-под карточки. Форму выбирает правило на ICU браузера, и сверка
	 * текста держит каждую локаль на своей стороне. Подпись стоит в своей
	 * колонке, и карточка открытой панели накрывает её целиком.
	 */
	describe.each([
		{ locale: 'ru-RU', width: 'short' },
		{ locale: 'fr-FR', width: 'short' },
		{ locale: 'zh-CN', width: 'short' },
		{ locale: 'hi-IN', width: 'short' },
		{ locale: 'ar-EG', width: 'narrow' },
		{ locale: 'ml-IN', width: 'narrow' },
		{ locale: 'ta-IN', width: 'narrow' },
		{ locale: 'te-IN', width: 'narrow' },
		{ locale: 'th-TH', width: 'narrow' },
	] as const)('дни недели $locale: $width', ({ locale, width }) => {
		it.each(COMPONENT_SIZES)(
			'size %s: подпись своей формы — в своей колонке, под открытой панелью — под карточкой',
			async (size) => {
				// С воскресенья: колонки от первого дня локали здесь ни при чём
				await showIn(locale, { months: ['2026-09-01'], size, weekStart: 0 })

				const weekdays = findAll('.s-calendar__weekday')
				const names = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: 'UTC' })

				// 2026-09-20 — воскресенье
				expect(weekdays.map((weekday) => weekday.textContent?.trim())).toEqual(
					[0, 1, 2, 3, 4, 5, 6].map((day) => names.format(Date.UTC(2026, 8, 20 + day))),
				)

				for (const weekday of weekdays) {
					const column = weekday.getBoundingClientRect()
					const label = labelBox(weekday)
					const name = weekday.textContent?.trim() ?? ''

					expect(label.left, name).toBeGreaterThanOrEqual(column.left - EPSILON)
					expect(label.right, name).toBeLessThanOrEqual(column.right + EPSILON)
				}

				await open()

				const card = box('.s-calendar__picker')

				for (const weekday of weekdays) {
					const label = labelBox(weekday)
					const name = weekday.textContent?.trim() ?? ''

					expect(label.left, name).toBeGreaterThanOrEqual(card.left - EPSILON)
					expect(label.right, name).toBeLessThanOrEqual(card.right + EPSILON)
					expect(label.top, name).toBeGreaterThanOrEqual(card.top - EPSILON)
					expect(label.bottom, name).toBeLessThanOrEqual(card.bottom + EPSILON)
				}
			},
		)
	})

	/**
	 * Мышью целиком: выбор года пересобирает список под месяцы, и Vue
	 * перерисовывает его между обработчиками того же клика — до корня поповера
	 * клик доходит с целью, которой в панели уже нет. Панель остаётся открытой.
	 */
	it('мышью: год — снова месяцы этого года, панель открыта; месяц — закрывает и ставит месяц', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const tile = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return rowOf(option).row
		}

		await userEvent.click(find('.s-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		await userEvent.click(tile('2024'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('Jan')
		await nextFrame()

		expect(find('.s-popover__panel').checkVisibility()).toBe(true)
		expect(find('.s-calendar__picker-heading').textContent?.trim()).toBe('2024')

		await userEvent.click(tile('Mar'))

		await expect.poll(titles).toEqual(['March 2024'])
		await expect.poll(() => find('.s-popover__panel').checkVisibility()).toBe(false)
	})

	it('указатель — рука на месяцах и годах, у выключенных вне границ — обычный', async () => {
		await show({ months: ['2026-09-01'], min: '2026-03-01', max: '2026-10-31' })
		await open()

		/** Указатель над плиткой с подписью. */
		const cursorOf = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return getComputedStyle(rowOf(option).row).cursor
		}

		expect(cursorOf('Mar')).toBe('pointer')
		expect(cursorOf('Oct')).toBe('pointer')
		expect(cursorOf('Feb')).not.toBe('pointer')
		expect(cursorOf('Nov')).not.toBe('pointer')

		await userEvent.click(find('.s-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		expect(cursorOf('2026')).toBe('pointer')
		expect(cursorOf('2025')).not.toBe('pointer')
	})

	it('клавиатура: Enter на заголовке — фокус на список, ↓ и Enter выбирают, фокус — на заголовок', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-calendar__title').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__picker-list'))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')

		await expect.poll(titles).toEqual(['November 2026'])
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
	})

	it('Escape закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.keyboard('{Escape}')

		await expect
			.poll(() => find('.s-calendar__title').getAttribute('aria-expanded'))
			.toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/** Точка подложки под карточкой — в координатах панели. */
	const underCard = () => {
		const panel = box('.s-popover__panel')
		const card = box('.s-calendar__picker')

		return {
			x: card.left + card.width / 2 - panel.left,
			y: (card.bottom + panel.bottom) / 2 - panel.top,
		}
	}

	const expanded = () => find('.s-calendar__title').getAttribute('aria-expanded')

	/**
	 * Подложку видно под карточкой: нажатие по ней закрывает панель, как
	 * Escape, — фокус возвращается на заголовок, а не падает на страницу.
	 */
	it('нажатие по подложке закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.click(find('.s-popover__panel'), { position: underCard() })

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/**
	 * Нажали в карточке, отпустили на подложке — браузер отдаёт `click` их
	 * общему предку, самой панели. Это не нажатие по подложке: панель открыта.
	 */
	it('протяжка из карточки на подложку панель не закрывает', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = find('.s-calendar__picker')
		const { width } = card.getBoundingClientRect()

		await userEvent.dragAndDrop(card, find('.s-popover__panel'), {
			sourcePosition: { x: width / 2, y: 2 },
			targetPosition: underCard(),
		})
		await nextFrame()

		expect(expanded()).toBe('true')
	})

	/**
	 * Жест — за полосу у низа карточки, вверх: карточка выехала сверху и уходит
	 * туда же. Подложка стоит, а карточка с полосой идёт за указателем — уедь
	 * подложка с ней, и она вылезла бы за календарь. Отпущенная, не смахнув,
	 * карточка возвращается на место.
	 */
	it('протяжка за полосу вверх тянет карточку, подложка стоит; отпущенная — на место', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const panel = box('.s-popover__panel')
		const card = box('.s-calendar__picker')
		const grip = find('.s-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		await userEvent.hover(grip, { position: { x: width / 2, y: height / 2 } })
		await commands.mouseDown()

		try {
			await userEvent.hover(grip, {
				position: { x: width / 2, y: height / 2 - 30 },
				force: true,
			})
			await nextFrame()

			expect(Math.abs(box('.s-calendar__picker').top - card.top + 30)).toBeLessThanOrEqual(1)
			expectSameBox(box('.s-popover__panel'), panel)
		} finally {
			await commands.mouseUp()
		}

		await expect
			.poll(() => Math.abs(box('.s-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)
		expect(expanded()).toBe('true')
	})

	/** Протянуть полосу мышью на `dy` по вертикали — настоящими событиями, по шагам. */
	const dragGrip = (dy: number) => {
		const grip = find('.s-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		// `force`: точка отпускания — за пределами полосы, и проверка попадания
		// Playwright ждала бы, пока полоса окажется под ней
		return userEvent.dragAndDrop(grip, grip, {
			sourcePosition: { x: width / 2, y: height / 2 },
			targetPosition: { x: width / 2, y: height / 2 + dy },
			steps: 10,
			force: true,
		})
	}

	/**
	 * Закрытая панель гаснет целиком, карточка вместе с подложкой, и ничего не
	 * движется: уезжай карточка, её место на миг потемнело бы под ещё не
	 * погасшей вуалью, — закрытие читалось бы вспышкой. Смахнутая карточка
	 * гаснет там, где её отпустили, а не вернувшись сначала на место.
	 * Пропадает панель, когда догасла: `transitions` — её переходы с закрытия.
	 */
	const expectFadingInPlace = async (
		card: DOMRect,
		transitions: ReadonlyMap<string, CSSTransition>,
	) => {
		const backdrop = box('.s-popover__panel')
		const opacities: number[] = []
		const seen = await whileLeaving(find('.s-popover__panel'), () => {
			expectSameBox(box('.s-popover__panel'), backdrop)
			expectSameBox(box('.s-calendar__picker'), card)
			opacities.push(Number(style(find('.s-popover__panel')).opacity))
		})

		expect(seen).toBeGreaterThan(1)
		expect(Math.min(...opacities)).toBeLessThan(1)

		for (let index = 1; index < opacities.length; index += 1) {
			expect(opacities[index]).toBeLessThanOrEqual(opacities[index - 1])
		}

		expectHidesWhenFaded(transitions)
	}

	it('закрытая карточка гаснет на месте вместе с подложкой', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = box('.s-calendar__picker')
		const transitions = ownTransitions(find('.s-popover__panel'))

		await userEvent.keyboard('{Escape}')
		await expectFadingInPlace(card, transitions)
	})

	it('смахнутая карточка гаснет там, где её отпустили, вместе с подложкой', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const start = box('.s-calendar__picker').top
		const transitions = ownTransitions(find('.s-popover__panel'))

		await dragGrip(-150)

		const card = box('.s-calendar__picker')

		expect(card.top).toBeLessThan(start - EPSILON)
		await expectFadingInPlace(card, transitions)
	})

	it('жест за полосу вверх закрывает панель, фокус — на заголовок; вниз — нет', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = box('.s-calendar__picker')

		await dragGrip(150)
		await expect
			.poll(() => Math.abs(box('.s-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)

		expect(expanded()).toBe('true')

		await dragGrip(-150)

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
	})

	/**
	 * Выключенная кнопка фокус теряет, и он упал бы на страницу. Плагин
	 * переводит его на список той же панели.
	 */
	it('стрелка погасла у границы лет под фокусом — фокус на список панели', async () => {
		await show({ months: ['2026-09-01'], max: '2027-10-31' })
		await open()

		find('.s-calendar__picker-next').focus()
		await userEvent.keyboard('{Enter}')

		await expect
			.poll(() => find('.s-calendar__picker-heading').textContent?.trim())
			.toBe('2027')
		expect(find('.s-calendar__picker-next').hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(find('.s-calendar__picker-list'))
	})

	/**
	 * Режим принудительных цветов (высокий контраст Windows): фоны браузер
	 * заменяет цветом поверхности, а тени убирает. Выбранная плитка — строка
	 * ListBox без отметки, выбор у неё виден только фоном, — красится системной
	 * подсветкой; штрих полосы — фон псевдоэлемента — системным цветом текста;
	 * кромка карточки становится рамкой, а вокруг подложки рамки нет.
	 */
	describe('принудительные цвета', () => {
		afterEach(async () => {
			await forcedColors('none')
		})

		it('выбранная плитка — системной подсветкой, штрих полосы виден', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			const tile = style(
				find('.s-calendar__picker-list .s-list-box-item[data-selected="true"] > .s-button'),
			)
			const grip = style(find('.s-popover__handle'), '::before')

			expect(matchMedia('(forced-colors: active)').matches).toBe(true)
			expect(pixel([tile.backgroundColor])).toEqual(pixel([systemColor('Highlight')]))
			expect(pixel([tile.color])).toEqual(pixel([systemColor('HighlightText')]))
			expect(pixel([grip.backgroundColor])).toEqual(pixel([systemColor('CanvasText')]))
			expect(pixel([grip.backgroundColor])).not.toEqual(
				pixel([style(find('.s-calendar__picker')).backgroundColor]),
			)
		})

		it('рамка — у карточки, а не вокруг подложки', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			expect(outlined(find('.s-calendar__picker'))).toBe(true)
			expect(outlined(find('.s-popover__panel'))).toBe(false)
		})
	})
})
