/**
 * Общий слой тем без темы — календарь, поля дат и уведомления: страница только
 * с CSS базы (`@soldy-ui/theme-base`), без `@soldy-ui/theme-oren`.
 *
 * Структура Calendar, DateInput, DatePicker и Toasts — раскладка и механика —
 * лежит в базе, а облик и движение в теме (`packages/themes/base/AGENTS.md`,
 * «Перенос структуры»). Без темы части голые — без цвета, рамок, поверхности и
 * переходов, — но рабочие, и здесь это проверяется тем, что видит
 * пользователь, а не числами базы: сетка календаря — семь колонок, подписи
 * дней недели над своими колонками, а кнопки листания — над двумя последними;
 * панель DatePicker открывается у поля, и календарь в ней не складывается в
 * столбец; регион тостов стоит у своего угла окна при каждом месте, в RTL
 * `start` и `end` меняются местами; в стопке передний — сверху, задние — за
 * ним, выглядывают к дальней от края стороне и встают высоты переднего — и с
 * плагином раскладки, который пишет его высоту (его ставит `useTheme` в
 * `browser/setup.ts`, а CSS она не несёт), и без него. Спеки с темой держат базу под темой, и
 * потерянное ею правило тема могла бы закрыть своим, а сторожа CSS
 * (`themes/base/__tests__/`) раскладки не считают.
 *
 * Страница у файла спека своя (`isolate` прогона), и листа темы на ней нет —
 * это проверяет первый тест. Проверен поломкой: без `contain: size` у задних
 * тостов стопки в базе (`components/toasts.css`) задний без высоты переднего
 * от плагина раскладки встаёт высотой своего содержимого и раздвигает стопку,
 * и падают её случаи без плагина.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineToasts, TDatePicker } from '@soldy-ui/core'
import type { IToastsProps, TToastInput, TToastsPlacement } from '@soldy-ui/core'
import { Calendar, DatePicker, Toasts } from '@soldy-ui/vue'
import { setDir } from './directions'

import '@soldy-ui/theme-base'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 1

/** Окно тостов: регион встаёт от его краёв. */
const VIEWPORT = { width: 1000, height: 700 }

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и кадры: узлы плагины получают по `ready`, кадром. */
async function show(content: () => VNode | VNode[]): Promise<void> {
	render(defineComponent({ render: () => h('div', { style: 'padding: 40px' }, content()) }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const findAll = (selector: string, root: ParentNode = document): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

const box = (element: Element) => element.getBoundingClientRect()

const centerX = (rect: DOMRect) => rect.left + rect.width / 2

afterEach(() => {
	cleanup()
	setDir(document.documentElement)
})

describe('страница — только общий слой тем', () => {
	it('переменные базы на месте, токенов темы нет', () => {
		const root = getComputedStyle(document.documentElement)

		expect(root.getPropertyValue('--so-calendar-bleed')).not.toBe('')
		expect(root.getPropertyValue('--so-toasts-offset')).not.toBe('')
		expect(root.getPropertyValue('--so-component-surface')).toBe('')
		expect(root.getPropertyValue('--so-neutral-500')).toBe('')
	})
})

describe('Calendar — сетка недели', () => {
	it('семь колонок: дни недели над своими колонками, кнопки листания — над двумя последними', async () => {
		await show(() => h(Calendar, { months: ['2026-05-01'], value: '2026-05-12' }))

		const weekdays = findAll('.so-calendar__weekday').map(box)

		expect(weekdays).toHaveLength(7)

		// Колонки — в ряд, одной ширины, встык
		for (let index = 1; index < weekdays.length; index++) {
			const [previous, current] = [weekdays[index - 1], weekdays[index]]

			expect(Math.abs(current.top - previous.top), 'подписи — одной строкой').toBeLessThan(
				EPSILON,
			)
			expect(Math.abs(current.width - previous.width), 'колонки поровну').toBeLessThan(
				EPSILON,
			)
			expect(Math.abs(current.left - previous.right), 'колонки встык').toBeLessThan(EPSILON)
		}

		// Каждая неделя — те же семь колонок, под подписями
		const weeks = findAll('.so-calendar__week')

		expect(weeks.length).toBeGreaterThanOrEqual(4)

		for (const week of weeks) {
			const cells = findAll(':scope > td', week).map(box)

			expect(cells).toHaveLength(7)

			for (const [index, cell] of cells.entries()) {
				expect(
					Math.abs(cell.left - weekdays[index].left),
					`колонка ${index + 1}`,
				).toBeLessThan(EPSILON)
				expect(cell.top, 'неделя — под подписями').toBeGreaterThanOrEqual(
					weekdays[index].bottom - EPSILON,
				)
			}
		}

		// Кнопки листания — над шестой и седьмой колонками, в ряду заголовка
		const prev = box(find('.so-calendar__prev'))
		const next = box(find('.so-calendar__next'))

		expect(Math.abs(centerX(prev) - centerX(weekdays[5])), '«назад» — над шестой').toBeLessThan(
			EPSILON,
		)
		expect(
			Math.abs(centerX(next) - centerX(weekdays[6])),
			'«вперёд» — над седьмой',
		).toBeLessThan(EPSILON)
		expect(prev.bottom, 'кнопки — над подписями').toBeLessThanOrEqual(weekdays[0].top + EPSILON)
	})
})

describe('DatePicker — панель у поля', () => {
	it('открытая панель — под полем, от его начала; календарь в ней — во всю свою ширину', async () => {
		const ctrl = new TDatePicker({ value: '2026-05-12' })

		await show(() => h(DatePicker, { ctrl, aria_label: 'Дата заезда' }))

		await userEvent.click(find('.so-date-picker__trigger'))
		await expect.poll(() => find('.so-date-picker__panel').dataset.open).toBe('true')
		await nextFrame()

		const anchor = box(find('.so-date-picker'))
		const panel = find('.so-date-picker__panel')
		const content = find('.so-date-picker__content')
		const rect = box(panel)

		// Под полем, вплотную к нему, а не у края страницы
		expect(rect.top, 'панель — под полем').toBeGreaterThanOrEqual(anchor.bottom - EPSILON)
		expect(rect.top - anchor.bottom, 'панель — у поля').toBeLessThan(16)
		expect(Math.abs(rect.left - anchor.left), 'панель — от начала поля').toBeLessThan(EPSILON)

		// Календарь — внутри панели, в её поле, и панель шириной по нему: месяц
		// не сложился в столбец по ширине места до края окна
		const calendar = box(find('.so-date-picker__calendar'))
		const style = getComputedStyle(content)
		const inline = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
		const grid = box(find('.so-calendar__grid'))

		expect(calendar.left).toBeGreaterThanOrEqual(rect.left - EPSILON)
		expect(calendar.right).toBeLessThanOrEqual(rect.right + EPSILON)
		expect(
			Math.abs(rect.width - (calendar.width + inline)),
			'панель — по календарю',
		).toBeLessThan(EPSILON)
		expect(grid.width, 'сетка — во всю неделю').toBeGreaterThan(
			7 * box(find('.so-calendar-item')).width - EPSILON,
		)
	})
})

describe('Toasts', () => {
	/**
	 * Регион с движком снаружи: тосты показываются кодом уже после монтирования.
	 * Длительность — ноль: тосты держатся, пока их не закроют.
	 */
	const mount = async (props: Partial<IToastsProps>, ...inputs: TToastInput[]) => {
		const engine = createEngineToasts()

		await show(() => h(Toasts, { engine, duration: 0, ...props }, () => h('p', 'Приложение')))

		for (const input of inputs) engine.extensions.toasts.show(input)

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	/** Плашки в порядке состава: первая — новая. */
	const cards = () => findAll('.so-toasts-item__card').map(box)

	beforeEach(async () => {
		await page.viewport(VIEWPORT.width, VIEWPORT.height)
	})

	describe('регион — у своего угла', () => {
		type TEdge = 'top' | 'bottom'
		type TSide = 'left' | 'center' | 'right'

		const CASES: readonly {
			placement: TToastsPlacement
			dir: 'ltr' | 'rtl'
			edge: TEdge
			side: TSide
		}[] = [
			{ placement: 'top-start', dir: 'ltr', edge: 'top', side: 'left' },
			{ placement: 'top', dir: 'ltr', edge: 'top', side: 'center' },
			{ placement: 'top-end', dir: 'ltr', edge: 'top', side: 'right' },
			{ placement: 'bottom-start', dir: 'ltr', edge: 'bottom', side: 'left' },
			{ placement: 'bottom', dir: 'ltr', edge: 'bottom', side: 'center' },
			{ placement: 'bottom-end', dir: 'ltr', edge: 'bottom', side: 'right' },
			{ placement: 'bottom-start', dir: 'rtl', edge: 'bottom', side: 'right' },
			{ placement: 'top-end', dir: 'rtl', edge: 'top', side: 'left' },
		]

		it.each(CASES)(
			'$placement, $dir: тост — у края $edge, $side',
			async ({ placement, dir, edge, side }) => {
				document.documentElement.setAttribute('dir', dir)

				await mount({ placement }, 'Сохранено')

				const [card] = cards()

				if (!card) throw new Error('тоста нет')

				const width = document.documentElement.clientWidth
				const height = document.documentElement.clientHeight
				const gap = {
					top: card.top,
					bottom: height - card.bottom,
					left: card.left,
					right: width - card.right,
				}

				// У своего края по высоте — с отступом, а не посреди окна
				const vertical = edge === 'top' ? gap.top : gap.bottom

				expect(vertical, `у края ${edge}`).toBeGreaterThanOrEqual(0)
				expect(vertical, `у края ${edge}`).toBeLessThan(height / 4)

				if (side === 'center') {
					expect(Math.abs(centerX(card) - width / 2), 'по центру строки').toBeLessThan(
						EPSILON,
					)
				} else {
					// В углу отступ от бокового края тот же, что от своего края окна
					expect(Math.abs(gap[side] - vertical), `у края ${side}`).toBeLessThan(EPSILON)
				}

				// Тост уже окна: строка текста, а не полоса во всю ширину
				expect(card.width).toBeLessThan(width / 2)
			},
		)
	})

	describe('стопка — задние за передним, его высоты', () => {
		const TOASTS: TToastInput[] = [
			{
				text: 'Высокий',
				description: 'Описание в несколько строк, чтобы тост стал заметно выше переднего',
			},
			'Средний',
			'Передний',
		]

		/**
		 * Без поведения темы — как у приложения без `useTheme`: высоты переднего на
		 * регионе нет, и задний берёт высоту ячейки стопки. Правило страницы
		 * снимает переменную плагина раскладки, который пишет её инлайном.
		 */
		function withoutFrontHeight(): () => void {
			const sheet = document.createElement('style')

			sheet.textContent = '.so-toasts { --so-toasts-front-height: initial !important; }'
			document.head.append(sheet)

			return () => sheet.remove()
		}

		const CASES = [
			{ placement: 'bottom-end', behavior: true, peek: 'top' },
			{ placement: 'top', behavior: true, peek: 'bottom' },
			{ placement: 'bottom-end', behavior: false, peek: 'top' },
			{ placement: 'top', behavior: false, peek: 'bottom' },
		] as const

		it.each(CASES)(
			'$placement, поведение темы: $behavior — задние выглядывают к $peek',
			async ({ placement, behavior, peek }) => {
				const restore = behavior ? () => {} : withoutFrontHeight()

				try {
					await mount({ placement, layout: 'cascade' }, ...TOASTS)

					const items = findAll('.so-toasts-item')
					const [front, middle, back] = items

					if (!front || !middle || !back) throw new Error('тостов меньше трёх')

					expect(find('.so-toasts-item__text', front).textContent).toBe('Передний')

					const frontBox = box(front)
					const list = box(find('.so-toasts__list'))

					// Передний — сверху: в его середине нажатие достаётся ему
					const hit = document.elementFromPoint(
						centerX(frontBox),
						frontBox.top + frontBox.height / 2,
					)

					expect(hit?.closest('.so-toasts-item'), 'передний — сверху').toBe(front)

					// Высокий задний встаёт высоты переднего, и стопка — тоже. Высота —
					// раскладки, а не прямоугольника на экране: задние сжаты (`scale`)
					const body = find('.so-toasts-item__body', back)

					expect(
						body.offsetHeight,
						'содержимое заднего выше переднего — иначе проверять нечего',
					).toBeGreaterThan(front.offsetHeight)

					for (const item of [middle, back]) {
						expect(
							Math.abs(item.offsetHeight - front.offsetHeight),
							'задний — высоты переднего',
						).toBeLessThan(EPSILON)
					}

					expect(
						Math.abs(list.height - front.offsetHeight),
						'стопка — высоты переднего',
					).toBeLessThan(EPSILON)

					// Задние — за передним и выглядывают из-под него к дальней от края
					// стороне, каждый дальше предыдущего
					const [frontCard, middleCard, backCard] = [front, middle, back].map((item) =>
						box(find('.so-toasts-item__card', item)),
					)

					if (peek === 'top') {
						expect(middleCard.top).toBeLessThan(frontCard.top - EPSILON)
						expect(backCard.top).toBeLessThan(middleCard.top - EPSILON)
					} else {
						expect(middleCard.bottom).toBeGreaterThan(frontCard.bottom + EPSILON)
						expect(backCard.bottom).toBeGreaterThan(middleCard.bottom + EPSILON)
					}
				} finally {
					restore()
				}
			},
		)
	})
})
