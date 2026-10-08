/**
 * Переполнение ряда тегов в настоящем браузере — режим `scroll`.
 *
 * В jsdom `getBoundingClientRect()` возвращает нули, и ни прокрутки, ни
 * обрезки там нет. Ряд `scroll` прокручивается сам, раскладку держит
 * `themes/oren/src/components/tags/_tags.scss`, а тег под фокусом в окно
 * ряда доводит `TTagsScrollPlugin`.
 *
 * Проверяется, что, став прокручиваемой областью, ряд не срезает кольцо
 * фокуса тега — ни сверху и снизу, ни сбоку у тех, кто стоит на краю
 * прокрутки: у первого тега и у последнего, докрученного до конца ряда. И
 * что тег у края, видимый частично, на который стрелка переводит фокус, ряд
 * показывает целиком — с крестиком и кольцом. И что так же целиком ряд
 * показывает всё, на что фокус приходит с клавиатуры: крестики набора без
 * выбора при обходе Tab и тег, на который приходится вход в набор, — а
 * нажатие мышью ряд не двигает.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tags } from '@soldy-ui/vue'

import { expectRingInsideHorizontally, expectRingInsideVertically } from './focus-ring'

import '@soldy-ui/theme-oren'

/** Тегов заведомо больше, чем влезает в узкий ряд. */
const TAGS = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Владивосток']

/** Ширина, на которой их помещается меньше половины. */
const NARROW = 260

/** Ряд `scroll` в узле шириной `width`. */
const harness = (width: number, props: Record<string, unknown> = {}) =>
	defineComponent({
		render() {
			return h('div', { style: `width: ${width}px` }, [
				h(Tags, {
					overflow: 'scroll',
					closable: true,
					items: TAGS.map((text) => ({ value: text, text })),
					...props,
				}),
			])
		},
	})

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const row = () => find('.s-tags')

/** Все теги в ряду: отрисовка идёт кадрами, поэтому через poll. */
const settled = (count: number) =>
	expect.poll(() => row().querySelectorAll('.s-tags-item').length).toBe(count)

/**
 * Стрелка переводит фокус на тег у края прокрутки, видимый частично, — и тег
 * встаёт в область целиком: с крестиком и со всем кольцом.
 *
 * Фокус получает строка тега, а частично видимую строку браузер при фокусе не
 * докручивает вовсе (целиком скрытую — ставит по центру). У конца ряда за
 * краем оставался крестик, который стоит за строкой, у начала — передняя
 * сторона кольца: его рисует пилюля. Всю пилюлю в окно доводит плагин ряда
 * (`TTagsScrollPlugin`) по `focusin`: `focus()` плагина клавиатуры после
 * нажатия клавиши браузер считает фокусом с клавиатуры. Запас под кольцо у
 * края — `scroll-padding` ряда.
 *
 * `side` — у какого края тег. У конца — вход в набор на первый тег и стрелки
 * вперёд, у начала — с последнего тега (`End`) стрелки назад. Теги по пути
 * видны целиком, и ряд за ними не двигается, поэтому тег у края виден
 * частично до последнего нажатия. Это проверяется перед ним: иначе
 * докручивать нечего, и проверка кольца прошла бы вхолостую.
 */
const arrowOntoCutTag = async (area: () => HTMLElement, side: 'start' | 'end') => {
	const items = [...area().querySelectorAll('.s-tags-item')]
	const forward = side === 'end'
	const key = forward ? '{ArrowRight}' : '{ArrowLeft}'

	/** Тег виден, но заходит за край области со своей стороны. */
	const cut = (item: Element) => {
		const box = item.getBoundingClientRect()
		const bounds = area().getBoundingClientRect()
		const edge = forward ? bounds.right : bounds.left

		return box.left < edge && box.right > edge
	}

	await userEvent.keyboard('{Tab}')

	if (!forward) await userEvent.keyboard('{End}')

	// Ближайший к фокусу тег, видимый частично: у конца — первый, у начала —
	// последний
	const from = forward ? 0 : items.length - 1
	const target = forward ? items.findIndex(cut) : items.map(cut).lastIndexOf(true)
	const item = items[target]

	if (!(item instanceof HTMLElement)) {
		throw new Error(`у края (${side}) нет тега, видимого частично`)
	}

	// До его соседа — по тегам, видимым целиком
	for (let step = 1; step < Math.abs(target - from); step++) await userEvent.keyboard(key)

	expect(cut(item), 'тег у края виден частично').toBe(true)

	await userEvent.keyboard(key)

	expect(item.contains(document.activeElement), 'фокус на теге у края').toBe(true)

	// Кольцо выходит за пилюлю, а крестик лежит в ней: кольцо внутри области —
	// значит, и крестик
	expectRingInsideHorizontally(item, area(), 'пилюля')
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
})

/**
 * Режим `scroll`: кольцо фокуса у краёв ряда.
 *
 * Прокрутка по строке делает ряд прокручиваемой областью и по вертикали, а
 * такая область режет всё, что вышло за её паддинг-бокс, — и запаса за краем
 * обрезки (`overflow-clip-margin`) у неё не бывает. В режиме выбора кольцо рисует
 * пилюля — элемент тега, — а выходит оно за пилюлю на 4px. Ряд стоял ровно по
 * тегам, и кольцо пропадало сверху и снизу целиком, а у тех, кто стоит на
 * краю прокрутки, — и сбоку: у первого тега передняя сторона, у последнего,
 * докрученного до конца ряда, — задняя. Запас под кольцо — паддинг ряда по
 * обеим осям (`tags/_tags.scss`), поэтому проверяются обе.
 *
 * Паддинг помогает только в начале и в конце прокрутки. Тег посередине, на
 * который стрелка переводит фокус, ряд докручивает до края — и запас под
 * кольцо там даёт отступ прокрутки ряда (`arrowOntoCutTag`).
 */
describe('режим scroll: кольцо фокуса у краёв ряда', () => {
	beforeEach(async () => {
		render(harness(NARROW, { overflow: 'scroll', mode: 'single' }))

		await settled(TAGS.length)

		// Ряду тесно. Под ним полоса прокрутки, и запас снизу обязан стоять
		// над ней, а не под ней. А последний тег встаёт к краю ряда, только
		// когда ряд докручен: на просторе он стоял бы далеко от края, и
		// проверка кольца прошла бы вхолостую
		expect(row().scrollWidth, 'ряду тесно').toBeGreaterThan(row().clientWidth)
	})

	/** Сколько ряду осталось до конца прокрутки. */
	const toEnd = () => row().scrollWidth - row().clientWidth - row().scrollLeft

	it('ряд не срезает кольцо первого тега', async () => {
		const item = find('.s-tags-item')

		// С клавиатуры: кольцо рисует `:focus-visible`. Выбора нет, и вход в
		// набор — на первый тег
		await userEvent.keyboard('{Tab}')

		expect(item.contains(document.activeElement), 'фокус на первом теге').toBe(true)
		expect(row().scrollLeft, 'ряд в начале прокрутки').toBe(0)

		expectRingInsideHorizontally(item, row(), 'пилюля')
		expectRingInsideVertically(item, row(), 'пилюля')
	})

	/**
	 * Последний тег за краем ряда, и фокус на нём браузер докручивает сам —
	 * до конца прокрутки: дальше тега ряду листать некуда. Конец прокрутки —
	 * это и конец паддинга ряда, поэтому запас под кольцо здесь тот же, что у
	 * начала.
	 */
	it('ряд, докрученный до конца, не срезает кольцо последнего тега', async () => {
		const items = [...row().querySelectorAll('.s-tags-item')]
		const last = items.at(-1)

		if (!(last instanceof HTMLElement)) throw new Error('последнего тега нет')

		expect(items, 'тегов в ряду').toHaveLength(TAGS.length)

		// Весь набор — одна остановка Tab, `End` ведёт к последнему тегу
		await userEvent.keyboard('{Tab}')
		await userEvent.keyboard('{End}')

		expect(last.contains(document.activeElement), 'фокус на последнем теге').toBe(true)

		// Допуск — субпиксельный остаток прокрутки
		await expect.poll(toEnd, { message: 'ряд докручен до конца' }).toBeLessThan(1)

		expectRingInsideHorizontally(last, row(), 'пилюля')
		expectRingInsideVertically(last, row(), 'пилюля')
	})

	it('стрелка на тег у конца ряда, видимый частично, показывает его целиком', async () => {
		await arrowOntoCutTag(row, 'end')
	})

	it('стрелка на тег у начала ряда, видимый частично, показывает его целиком', async () => {
		await arrowOntoCutTag(row, 'start')
	})
})

/**
 * Режим `scroll`: элемент под фокусом у края ряда виден целиком.
 *
 * Частично видимый элемент браузер при фокусе не докручивает вовсе, а целиком
 * скрытый ставит по центру, и у края ряда срезанным оставался то сам элемент,
 * то его тег: крестик, поставленный по центру, — с началом подписи за краем,
 * тег, на который приходится вход в набор, — с началом подписи и стороной
 * кольца. Тег под фокусом в окно ряда — паддинг-бокс без отступа прокрутки
 * темы — доводит плагин ряда (`TTagsScrollPlugin`). Тег, а не только элемент
 * под фокусом: кольцо в режиме выбора рисует пилюля, а крестик без подписи не
 * скажет, какой тег он закроет.
 *
 * Обход — клавиатурой, как ходит пользователь: плагин доводит только фокус с
 * клавиатуры (`:focus-visible`), а `focus()` из скрипта после нажатия мышью в
 * соседнем тесте браузер видимым не считает. Нажатие мышью ряд не двигает —
 * это проверяется отдельно.
 */
describe('режим scroll: элемент под фокусом у края ряда виден целиком', () => {
	/** Узел по порядку в списке; нет его или он не HTML — тест падает здесь. */
	const at = (nodes: Element[], index: number): HTMLElement => {
		const node = nodes[index]

		if (!(node instanceof HTMLElement)) throw new Error(`узел ${index}: HTML-узла нет`)

		return node
	}

	/** Теги ряда по порядку — пилюли, прямые дети ряда. */
	const items = () => [...row().querySelectorAll(':scope > .s-tags-item')]

	/**
	 * Край обрезки ряда по строке — его паддинг-бокс: прокручиваемая область
	 * режет ровно по нему.
	 */
	const clip = () => {
		const left = row().getBoundingClientRect().left + row().clientLeft

		return { left, right: left + row().clientWidth }
	}

	/** Тег виден целиком: ни одним краем не заходит за край обрезки ряда. */
	const expectTagVisible = (item: Element, what: string) => {
		const box = item.getBoundingClientRect()
		const { left, right } = clip()

		expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(left - 0.5)
		expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(right + 0.5)
	}

	/** Ряд — в одну строку, и ему тесно: иначе доводить нечего. */
	const crowded = async (props: Record<string, unknown>) => {
		render(harness(NARROW, { overflow: 'scroll', ...props }))

		await settled(TAGS.length)

		expect(row().scrollWidth, 'ряду тесно').toBeGreaterThan(row().clientWidth)

		// Узел ряда плагины получают кадром позже (`TElementPlugin`), и до того
		// доводить ряд некому
		await nextFrame()
		await nextFrame()
	}

	/**
	 * Остановки Tab набора без выбора — крестики: у строк действия нет. У края
	 * оказывается то следующий, то предыдущий, поэтому обход — вперёд и
	 * обратно. В RTL ряд идёт справа налево, и край, у которого срезан
	 * следующий тег, — левый.
	 */
	it.each(['ltr', 'rtl'] as const)(
		'%s: без выбора: крестик по очереди, Tab вперёд и обратно',
		async (direction) => {
			await crowded({ direction })

			// Направление дошло до корня — иначе проверка ниже сторожит LTR
			expect(row().getAttribute('dir'), 'направление ряда').toBe(direction)

			const tags = items()
			const closes = tags.map((item) => find(':scope > .s-tags-item__close', item))
			const forth = [...tags.keys()]
			const back = [...forth].reverse().slice(1)

			expect(tags, 'тегов в ряду').toHaveLength(TAGS.length)

			const check = (index: number, what: string) => {
				const close = at(closes, index)

				expect(document.activeElement, `${what}: фокус`).toBe(close)

				expectRingInsideHorizontally(close, row(), what)
				expectTagVisible(at(tags, index), `${what}: тег`)
			}

			for (const index of forth) {
				await userEvent.keyboard('{Tab}')

				check(index, `крестик ${index}`)
			}

			for (const index of back) {
				await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

				check(index, `крестик ${index}, обратно`)
			}
		},
	)

	/**
	 * Весь набор с выбором — одна остановка Tab, по тегам ходят стрелки. Кольцо
	 * рисует пилюля: оно внутри ряда — значит, и крестик, который лежит в ней.
	 */
	it('с выбором: тег стрелками до последнего и обратно', async () => {
		await crowded({ mode: 'multiple' })

		const tags = items()

		const check = (index: number, what: string) => {
			const item = at(tags, index)

			expect(item.contains(document.activeElement), `${what}: фокус`).toBe(true)

			expectRingInsideHorizontally(item, row(), what)
		}

		await userEvent.keyboard('{Tab}')

		check(0, 'тег 0')

		for (const index of [...tags.keys()].slice(1)) {
			await userEvent.keyboard('{ArrowRight}')

			check(index, `тег ${index}`)
		}

		for (const index of [...tags.keys()].reverse().slice(1)) {
			await userEvent.keyboard('{ArrowLeft}')

			check(index, `тег ${index}, обратно`)
		}
	})

	/**
	 * Вход в набор по Tab приходится на остановку набора — первый тег, пока
	 * фокуса в наборе не было. Ряд прокрутили колесом, и тег виден частично:
	 * фокус на него ставит браузер, и он такой тег не докручивает.
	 */
	it('с выбором: Tab в набор на тег, видимый частично, показывает его целиком', async () => {
		await crowded({ mode: 'single' })

		const first = at(items(), 0)

		row().scrollLeft = 50

		expect(first.getBoundingClientRect().left, 'первый тег за краем').toBeLessThan(clip().left)
		expect(first.getBoundingClientRect().right, 'первый тег виден').toBeGreaterThan(clip().left)

		await userEvent.keyboard('{Tab}')

		expect(first.contains(document.activeElement), 'фокус на первом теге').toBe(true)

		expectRingInsideHorizontally(first, row(), 'пилюля')
	})

	/**
	 * Фокус от нажатия мышью ряд не доводит: ряд, сдвинувшийся между нажатием и
	 * отпусканием, увёл бы тег из-под указателя, и `click` до него не дошёл
	 * бы. Нажатие — по части тега в ряду, у края обрезки: точку за краем
	 * Playwright перед нажатием докрутил бы сам, и ряд сдвинул бы не плагин.
	 */
	it('нажатие мышью по тегу у края выбирает его, и ряд не сдвигается', async () => {
		await crowded({ mode: 'single' })

		const edge = clip().right
		const item = items().find((candidate) => {
			const box = candidate.getBoundingClientRect()

			return box.left < edge - 16 && box.right > edge + 0.5
		})

		if (!(item instanceof HTMLElement)) throw new Error('у края ряда нет тега')

		const line = find(':scope > .s-button:first-child', item)
		const box = line.getBoundingClientRect()

		await userEvent.click(line, { position: { x: edge - box.left - 8, y: box.height / 2 } })

		// Фокус от нажатия был — плагину было на что отозваться
		expect(document.activeElement, 'фокус').toBe(line)
		expect(item.dataset.selected, 'тег выбран').toBe('true')
		expect(row().scrollLeft, 'положение ряда').toBe(0)
	})
})
