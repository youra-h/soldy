/**
 * Переполнение ряда тегов в настоящем браузере.
 *
 * Здесь проверяется то, чего нет нигде больше: замер. В jsdom
 * `getBoundingClientRect()` возвращает нули, и «сколько тегов помещается» там
 * не вопрос вовсе. Ряд считает `TTagsOverflowPlugin` по ширинам узлов, делит
 * состав расширение коллекции, а раскладку ряда — одна строка, обрезанный
 * хвост — держит `themes/oren/src/components/tags/_tags.scss`.
 *
 * В `arrows` делить нечего: ряд целиком уезжает во вьюпорт ленты, и проверять
 * там надо другое — что раскладка ряда переехала вместе с ним и что лента не
 * отобрала у тегов стрелки клавиатуры.
 *
 * В `scroll` делить тоже нечего: ряд прокручивается сам. Проверяется, что,
 * став прокручиваемой областью, он не срезает кольцо фокуса тега.
 *
 * В `popover` ряд обрезает то, что не поместилось, и проверяется ещё, что
 * обрезка не срезает кольцо фокуса у тех, кто стоит на краю ряда: у первого
 * тега и у кнопки «…».
 *
 * Сторож ошибок окна (`browser/setup.ts`) здесь работает как второй тест:
 * замер, который гоняется за собственным результатом, уронил бы прогон
 * сообщением `ResizeObserver loop completed with undelivered notifications`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tags } from '@soldy-ui/vue'

import { expectClearOfFades, fades } from './fades'
import { expectRingInsideHorizontally, expectRingInsideVertically } from './focus-ring'
import { expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

/** Тегов заведомо больше, чем влезает в узкий ряд. */
const TAGS = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Владивосток']

/**
 * Тегов столько, что хвост не помещается и в панель: она упирается в свой
 * потолок высоты и обязана прокручивать содержимое, а не расти за край окна.
 * Тексты одной длины — от них зависит, сколько строк займёт хвост.
 */
const MANY = Array.from({ length: 24 }, (_, index) => `Екатеринбург-${index + 1}`)

/**
 * Потолок ширины панели — `20rem` из `popover/_popover.scss`, в пикселях. На
 * окне прогона работает именно он: вторая ветка потолка (`100vw - 1rem`)
 * больше, и тест, который поймал бы её, сторожил бы не то. Это проверяется
 * отдельным утверждением.
 */
const PANEL_MAX_WIDTH = 320

/** Ширина, на которой помещаются все теги. */
const WIDE = 900

/** Ширина, на которой их помещается меньше половины. */
const NARROW = 260

/**
 * Ширина, на которой в ряду остаётся не один тег, а несколько: на одном
 * порядок ряда не проверить — кнопке не с чем стоять рядом.
 */
const SEVERAL = 560

/**
 * Ширина ленты `arrows`, в чистой части которой — между подсказками у краёв —
 * помещается строка любого тега. В узкой строка «Санкт-Петербург» шире чистой
 * части, а более широкий элемент не встанет в неё ни при каком решении. Листать
 * при этом есть что: ряд всё равно шире ленты в несколько раз.
 */
const ROWS = 320

const harness = (width: number, props: Record<string, unknown> = {}) =>
	defineComponent({
		render() {
			return h('div', { class: 's-host', style: `width: ${width}px` }, [
				h(Tags, {
					overflow: 'popover',
					closable: true,
					items: TAGS.map((text) => ({ value: text, text })),
					...props,
				}),
			])
		},
	})

/**
 * Тот же ряд, но с `MANY` и у края окна: `align` решает, к какому.
 *
 * У правого края панель держит в окне только сдвиг `TAnchorPlugin`, а её
 * ширину — `w-max` у `.s-popover__content`: без него панели, позиционированной
 * `left`, досталось бы место лишь до края окна.
 */
const panelHarness = (align: 'start' | 'end') =>
	defineComponent({
		render() {
			return h('div', { style: `display: flex; justify-content: flex-${align}` }, [
				h('div', { class: 's-host', style: `width: ${NARROW}px` }, [
					h(Tags, {
						overflow: 'popover',
						closable: true,
						items: MANY.map((text) => ({ value: text, text })),
					}),
				]),
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

const host = () => find('.s-host')
const row = () => find('.s-tags:not(.s-tags__panel)')
const more = () => document.querySelector('.s-tags__more')
const panel = () => document.querySelector('.s-tags__panel')

/** Тексты тегов внутри узла — по ним видно, кто в ряду, а кто в панели. */
const textsIn = (scope: ParentNode) =>
	[...scope.querySelectorAll('.s-tags-item')].map((item) => item.textContent?.trim() ?? '')

const inRow = () => textsIn(row())

/** Сколько тегов осталось в ряду: замер идёт кадрами, поэтому через poll. */
const settled = (count: number) => expect.poll(() => inRow().length).toBe(count)

/**
 * Открывает панель хвоста и отдаёт её узлы, когда раскладка улеглась.
 *
 * Координаты панели пишет `TAnchorPlugin`, и первый расчёт идёт по ещё
 * нулевому размеру скрытой панели: сторону он объявляет сразу
 * (`data-placement`), а поправку по настоящему размеру приносит
 * `ResizeObserver` кадром позже — отсюда два кадра ожидания.
 */
const openPanel = async () => {
	await expect.poll(() => more()).not.toBeNull()
	await userEvent.click(find('.s-tags__more'))
	await expect.poll(() => panel()).not.toBeNull()

	const frame = find('.s-popover__panel')

	await expect.poll(() => frame.dataset.placement).toBeDefined()
	await nextFrame()
	await nextFrame()

	return { frame, content: find('.s-popover__content') }
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
})

describe('широкий ряд: делить нечего', () => {
	beforeEach(() => {
		render(harness(WIDE))
	})

	it('все теги в ряду, кнопки «…» нет', async () => {
		await settled(TAGS.length)

		expect(inRow()).toEqual(TAGS)
		expect(more()).toBeNull()
		expect(panel()).toBeNull()
	})

	it('ряд стоит в одну строку', async () => {
		await settled(TAGS.length)

		const tops = [...row().querySelectorAll('.s-tags-item')].map(
			(item) => item.getBoundingClientRect().top,
		)

		expect(new Set(tops.map(Math.round)).size).toBe(1)
	})
})

describe('узкий ряд: хвост уезжает в панель', () => {
	beforeEach(() => {
		render(harness(NARROW))
	})

	it('в ряду остаются только поместившиеся, и они внутри его ширины', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()

		expect(inRow().length).toBeGreaterThan(0)
		expect(inRow().length).toBeLessThan(TAGS.length)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			// Допуск на субпиксельное округление ширин
			expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(box.right + 0.5)
		}

		// Кнопка «…» — последняя в ряду и тоже внутри него
		expect(button.right).toBeLessThanOrEqual(box.right + 0.5)
	})

	it('значок кнопки — иконка с ненулевым боксом', async () => {
		// Ряд не переносится и не сжимается: иконка без размера от темы
		// схлопнулась бы здесь в 0×0, как крестики Tabs и Tags на `xl`
		await expect.poll(() => more()).not.toBeNull()

		const icon = document.querySelector('.s-tags__more svg.s-icon')

		// Не `find`: у `svg` свой интерфейс, HTML-узлом он не является
		if (!(icon instanceof SVGElement)) throw new Error('значка у кнопки «…» нет')

		const box = icon.getBoundingClientRect()

		expect(box.width).toBeGreaterThan(0)
		expect(box.height).toBeGreaterThan(0)
	})

	it('в панели — ровно непоместившиеся, и каждый тег отрисован один раз', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const fitted = inRow()

		await userEvent.click(find('.s-tags__more'))
		await expect.poll(() => panel()).not.toBeNull()

		expect(textsIn(find('.s-tags__panel'))).toEqual(TAGS.slice(fitted.length))
		expect(textsIn(document.body).length).toBe(TAGS.length)
	})

	it('закрыли последний тег панели — панель закрылась', async () => {
		await expect.poll(() => more()).not.toBeNull()
		await userEvent.click(find('.s-tags__more'))
		await expect.poll(() => panel()).not.toBeNull()

		// Закрываем теги панели по одному: с каждым закрытым ряду достаётся
		// больше места, и хвост тает быстрее — считать их заранее нельзя
		for (let guard = TAGS.length; guard > 0 && panel() !== null; guard--) {
			await userEvent.click(find('.s-tags__panel .s-tags-item__close'))
		}

		await expect.poll(() => panel()).toBeNull()
	})
})

describe('в ряду несколько тегов', () => {
	beforeEach(() => {
		render(harness(SEVERAL))
	})

	/**
	 * Порядок в ряду задаёт коллекция, а не разметка: тег несёт свой номер
	 * стилем (`order`), и кнопке нужен свой. Без него она вставала нулевой —
	 * то есть сразу за первым тегом, хотя в разметке стоит после всех.
	 * Здесь это и видно: в DOM порядок был верным всегда, врала раскладка.
	 */
	it('кнопка «…» стоит за всеми тегами ряда, а не между ними', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const button = find('.s-tags__more').getBoundingClientRect()

		// Иначе сравнивать нечего: с одним тегом кнопка окажется второй и при
		// сломанном порядке, и проверка молча перестанет что-либо сторожить
		expect(inRow().length).toBeGreaterThan(1)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(button.left + 0.5)
		}
	})

	/**
	 * И не вплотную за последним тегом, а у края: свободное место забирает
	 * автоотступ кнопки. Иначе её край прыгал бы с каждым закрытым тегом.
	 */
	it('кнопка «…» прижата к концу строки', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()
		const last = [...row().querySelectorAll('.s-tags-item')].pop()

		if (!last) throw new Error('в ряду не осталось тегов')

		// Место между последним тегом и кнопкой есть — значит, она не «едет» за
		// тегами, а стоит у края
		expect(button.left - last.getBoundingClientRect().right).toBeGreaterThan(1)
		expect(box.right - button.right).toBeLessThan(2)
	})
})

describe('ряд справа налево', () => {
	/**
	 * Отступ логический, поэтому в RTL концом строки становится левый край:
	 * теги идут справа, кнопка уезжает влево — за ними, а не перед ними.
	 * Направление ряду задаёт проп `direction`, он пишет корню `dir`.
	 */
	it('в RTL кнопка уезжает к левому краю, а теги остаются справа', async () => {
		render(harness(SEVERAL, { direction: 'rtl' }))

		await expect.poll(() => more()).not.toBeNull()

		// Направление дошло до корня — иначе проверка ниже сторожит LTR
		expect(row().getAttribute('dir')).toBe('rtl')

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()

		expect(button.left - box.left).toBeLessThan(2)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			expect(item.getBoundingClientRect().left).toBeGreaterThanOrEqual(button.right - 0.5)
		}
	})
})

/**
 * Размер панели хвоста держит панель Popover: ширина — `20rem`, высота —
 * половина окна (`popover/_popover.scss`), а длинное содержимое прокручивает
 * `.s-popover__content`. Своего потолка у `_tags.scss` нет и быть не должно —
 * это был бы второй путь к тому же числу.
 *
 * Сторожить это надо здесь: без теста потолок снимается из темы незаметно, а
 * снаружи хвост из двух десятков тегов читается ровно как «панель уехала за
 * экран».
 */
describe('панель хвоста: потолки и прокрутка', () => {
	it('панель помещается в окно, а хвост прокручивается внутри неё', async () => {
		render(panelHarness('start'))

		const { frame, content } = await openPanel()

		expectInsideWindow(frame, 'панель')

		// Иначе работала бы вторая ветка потолка, и утверждение ниже сторожило
		// бы размер окна прогона, а не `20rem` темы
		expect(window.innerWidth, 'окно прогона уже потолка').toBeGreaterThan(PANEL_MAX_WIDTH + 16)
		expect(frame.getBoundingClientRect().width, 'ширина панели').toBeLessThanOrEqual(
			PANEL_MAX_WIDTH + 0.5,
		)

		// Хвост выше панели — иначе прокручивать нечего, и сторож пуст
		expect(content.scrollHeight, 'высота хвоста').toBeGreaterThan(content.clientHeight)
	})

	/**
	 * У правого края окна панель сдвигает `TAnchorPlugin`, и она обязана
	 * остаться той же ширины. Это сторож `w-max` у `.s-popover__content`:
	 * панель позиционирована `left`, и с шириной по содержимому места под текст
	 * у неё — от `left` до края окна. У якоря справа такого места почти нет, и
	 * без `w-max` панель сложилась бы в узкий столбец, а сдвигу нечего было бы
	 * сдвигать.
	 */
	it('у правого края окна панель не уходит за край и не сжимается в столбец', async () => {
		render(panelHarness('end'))

		const { frame, content } = await openPanel()

		// Якорь действительно у края — иначе проверка ниже сторожит обычный случай
		expect(
			window.innerWidth - find('.s-tags__more').getBoundingClientRect().right,
		).toBeLessThan(PANEL_MAX_WIDTH / 2)

		expectInsideWindow(frame, 'панель у края')

		expect(frame.getBoundingClientRect().width, 'ширина панели').toBeCloseTo(PANEL_MAX_WIDTH, 0)
		expect(content.scrollHeight, 'высота хвоста').toBeGreaterThan(content.clientHeight)
	})
})

describe('ряд меняет ширину', () => {
	it('сужение и возврат сходятся: теги возвращаются, кнопка пропадает', async () => {
		render(harness(WIDE))

		await settled(TAGS.length)

		host().style.width = `${NARROW}px`

		await expect.poll(() => more()).not.toBeNull()
		expect(inRow().length).toBeLessThan(TAGS.length)

		host().style.width = `${WIDE}px`

		await settled(TAGS.length)
		await expect.poll(() => more()).toBeNull()
	})
})

/**
 * Режим `arrows`: ряд завёрнут в ленту, и рядом стал её вьюпорт.
 *
 * Делить состав здесь некому — все теги остаются в ряду, — поэтому проверяется
 * другое. Первое: раскладка ряда переехала во вьюпорт, а не осталась на корне,
 * иначе строка и зазор пропали бы вместе с ней. Второе: лента не отобрала у
 * тегов стрелки клавиатуры — по набору с выбором ходят они, а листают кнопки.
 */
describe('режим arrows: ряд листают кнопки', () => {
	const arrows = (props: Record<string, unknown> = {}) =>
		harness(NARROW, { overflow: 'arrows', ...props })

	const scroller = () => find('.s-scroller')
	const viewport = () => find('.s-scroller__viewport')
	const prev = () => find('.s-scroller__prev')
	const next = () => find('.s-scroller__next')

	/** Строка тега по тексту — носитель роли и остановки Tab. */
	const line = (text: string): HTMLElement => {
		const found = [...document.querySelectorAll('.s-tags-item > .s-button:first-child')].find(
			(candidate) => candidate.textContent?.trim() === text,
		)

		if (!(found instanceof HTMLElement)) throw new Error(`строки тега «${text}» нет`)

		return found
	}

	/** Замер ленты идёт кадрами: ждём, пока она поймёт, что листать есть куда. */
	const scrollable = () => expect.poll(() => scroller().dataset.canNext).toBe('true')

	it('все теги стоят одной строкой внутри вьюпорта, и делить их некому', async () => {
		render(arrows())

		await scrollable()

		const items = [...viewport().querySelectorAll(':scope > .s-tags-item')]

		expect(items.map((item) => item.textContent?.trim())).toEqual(TAGS)
		expect(
			new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
		).toBe(1)
		expect(more()).toBeNull()
		expect(panel()).toBeNull()
	})

	/** Зазор ряда переехал во вьюпорт вместе с рядом: без него теги слиплись бы. */
	it('между тегами остался зазор набора', async () => {
		render(arrows())

		await scrollable()

		const items = [...viewport().querySelectorAll(':scope > .s-tags-item')].map((item) =>
			item.getBoundingClientRect(),
		)

		expect(items[1].left - items[0].right).toBeGreaterThan(1)
	})

	it('кнопка «вперёд» двигает ряд на видимую ширину, а на краю гаснет', async () => {
		render(arrows())

		await scrollable()

		// В начале строки листать назад некуда
		expect(prev().hasAttribute('disabled')).toBe(true)

		const page = viewport().clientWidth

		await userEvent.click(next())
		await expect.poll(() => viewport().scrollLeft).toBeGreaterThan(page / 2)

		viewport().scrollLeft = viewport().scrollWidth

		await expect.poll(() => scroller().dataset.canNext).toBe('false')

		expect(next().hasAttribute('disabled')).toBe(true)
		expect(prev().hasAttribute('disabled')).toBe(false)
	})

	it('сужение ряда пересчитывает состояние кнопок', async () => {
		render(harness(WIDE, { overflow: 'arrows' }))

		await expect.poll(() => scroller().dataset.canNext).toBe('false')

		host().style.width = `${NARROW}px`

		await scrollable()
	})

	it('роль ряда стоит на вьюпорте, а корень её не несёт', async () => {
		render(arrows({ mode: 'multiple' }))

		await scrollable()

		expect(viewport().getAttribute('role')).toBe('listbox')
		expect(viewport().getAttribute('aria-orientation')).toBe('horizontal')
		expect(row().hasAttribute('role')).toBe(false)

		// Остановка Tab — у тегов (roving tabindex), и лента своей не добавляет
		expect(viewport().hasAttribute('tabindex')).toBe(false)
	})

	/**
	 * Главный риск режима: стрелки у набора с выбором уже заняты — ими ходят
	 * по тегам. Своего плагина клавиатуры у ленты нет, и отбирать их не у
	 * кого, но проверить это надо там, где фокус настоящий.
	 */
	it('стрелки ходят по тегам, а не листают ленту', async () => {
		render(arrows({ mode: 'multiple' }))

		await scrollable()

		line(TAGS[0]).focus()
		await userEvent.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(line(TAGS[1]))
	})

	/**
	 * Фокус за краем ленту подтягивает сам — это делает браузер, — и не под
	 * подсказку у края, а в чистую часть ленты.
	 */
	it('фокус на теге за краем подтягивает его в чистую часть', async () => {
		render(arrows({ mode: 'multiple' }))

		await scrollable()

		line(TAGS[0]).focus()
		await userEvent.keyboard('{End}')

		const last = line(TAGS.at(-1) ?? '')

		expect(document.activeElement).toBe(last)

		await expect.poll(() => viewport().scrollLeft).toBeGreaterThan(0)

		// Края замер пишет кадром позже прокрутки, маска меняется вслед за ними
		await nextFrame()
		await nextFrame()

		expectClearOfFades(last, viewport(), 'последний тег')
	})

	/**
	 * Элемент под фокусом не остаётся под подсказкой у края — ни при переходе
	 * вперёд, ни обратно: у края оказывается то следующий, то предыдущий.
	 * Частично видимый элемент браузер при фокусе не докручивает, а видимая
	 * часть ленты для него — окно снапа, и тема делает её чистой частью, между
	 * подсказками (`scroll-padding-inline` в `scroller/_scroller.scss`).
	 *
	 * Остановки Tab у набора без выбора — крестики, с выбором — строки тегов
	 * (roving tabindex).
	 */
	describe('элемент под фокусом не остаётся под подсказкой', () => {
		/** Узел по порядку в списке; нет его или он не HTML — тест падает здесь. */
		const at = (nodes: Element[], index: number): HTMLElement => {
			const node = nodes[index]

			if (!(node instanceof HTMLElement)) throw new Error(`узел ${index}: HTML-узла нет`)

			return node
		}

		/**
		 * Элемент под фокусом лежит в чистой части ленты, когда она улеглась:
		 * прокрутка от фокуса мгновенная, но края замер пишет кадром позже, и
		 * маска меняется вслед за ними.
		 */
		const expectFocusedClear = async (element: HTMLElement, what: string) => {
			await nextFrame()
			await nextFrame()

			expect(document.activeElement, `${what}: фокус`).toBe(element)

			// Шире чистой части элемент не встанет в неё ни при каком решении
			const { left, right } = fades(viewport())
			const clear = viewport().getBoundingClientRect().width - left - right

			expect(element.getBoundingClientRect().width, `${what} уже чистой части`).toBeLessThan(
				clear,
			)

			expectClearOfFades(element, viewport(), what)
		}

		it('без выбора: крестик по очереди вперёд и обратно', async () => {
			render(arrows())

			await scrollable()

			const closes = [...viewport().querySelectorAll('.s-tags-item__close')]
			const forth = [...closes.keys()]
			const back = [...forth].reverse().slice(1)

			expect(closes, 'крестиков в ряду').toHaveLength(TAGS.length)

			for (const index of [...forth, ...back]) {
				const close = at(closes, index)

				close.focus()

				await expectFocusedClear(close, `крестик ${index}`)
			}
		})

		it('с выбором: строка стрелками до последнего тега и обратно', async () => {
			render(harness(ROWS, { overflow: 'arrows', mode: 'multiple' }))

			await scrollable()

			line(TAGS[0]).focus()

			await expectFocusedClear(line(TAGS[0]), `строка «${TAGS[0]}»`)

			for (const text of TAGS.slice(1)) {
				await userEvent.keyboard('{ArrowRight}')
				await expectFocusedClear(line(text), `строка «${text}»`)
			}

			for (const text of [...TAGS].reverse().slice(1)) {
				await userEvent.keyboard('{ArrowLeft}')
				await expectFocusedClear(line(text), `строка «${text}»`)
			}
		})
	})
})

/**
 * Режим `scroll`: кольцо фокуса тега.
 *
 * Прокрутка по строке делает ряд прокручиваемой областью и по вертикали, а
 * такая область режет всё, что вышло за её паддинг-бокс. В режиме выбора
 * кольцо рисует пилюля — элемент тега, — и ряд стоял ровно по ней: кольцо
 * выходит за пилюлю на 4px и пропадало сверху и снизу целиком. Запас под
 * кольцо — паддинг ряда (`tags/_tags.scss`).
 */
describe('режим scroll: кольцо фокуса', () => {
	it('ряд не срезает кольцо тега сверху и снизу', async () => {
		render(harness(NARROW, { overflow: 'scroll', mode: 'single' }))

		await settled(TAGS.length)

		// Ряду тесно, и под ним полоса прокрутки: запас снизу обязан стоять
		// над ней, а не под ней
		expect(row().scrollWidth, 'ряду тесно').toBeGreaterThan(row().clientWidth)

		const item = find('.s-tags-item')

		// С клавиатуры: кольцо рисует `:focus-visible`. Выбора нет, и вход в
		// набор — на первый тег
		await userEvent.keyboard('{Tab}')

		expect(item.contains(document.activeElement), 'фокус на первом теге').toBe(true)

		expectRingInsideVertically(item, row(), 'пилюля')
	})
})

/**
 * Режим `popover`: кольцо фокуса у краёв ряда.
 *
 * Ряд обрезает то, что не поместилось, а кольцо выходит за элемент на 4px.
 * Обрезка ровно по краю ряда срезала сторону кольца целиком у тех, кто стоит
 * на краю: у первого тега в режиме выбора — переднюю, у кнопки «…» в конце
 * строки — заднюю. Запас под кольцо — за краем обрезки (`tags/_tags.scss`), и
 * ряд из-за него режет по обеим осям: проверяются обе.
 */
describe('режим popover: кольцо фокуса у краёв ряда', () => {
	beforeEach(() => {
		render(harness(NARROW, { mode: 'single' }))
	})

	it('ряд не срезает кольцо первого тега', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const item = find('.s-tags-item')

		// Тег стоит вплотную к краю ряда, как в `wrap`: запас — за краем
		// обрезки, а не паддингом. Отступи тег от края, кольцу было бы куда
		// выйти и без запаса, и проверка ниже прошла бы вхолостую
		expect(
			item.getBoundingClientRect().left - row().getBoundingClientRect().left,
			'от края ряда до тега',
		).toBeCloseTo(0, 1)

		// С клавиатуры: кольцо рисует `:focus-visible`. Выбора нет, и вход в
		// набор — на первый тег
		await userEvent.keyboard('{Tab}')

		expect(item.contains(document.activeElement), 'фокус на первом теге').toBe(true)

		expectRingInsideHorizontally(item, row(), 'пилюля')
		expectRingInsideVertically(item, row(), 'пилюля')
	})

	it('ряд не срезает кольцо кнопки «…»', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const button = find('.s-tags__more')

		// Кнопка — у самого края ряда. Отойди она от края, кольцу было бы куда
		// выйти и без запаса, и проверка ниже прошла бы вхолостую
		expect(
			row().getBoundingClientRect().right - button.getBoundingClientRect().right,
			'от кнопки до края ряда',
		).toBeCloseTo(0, 1)

		// Набор с выбором — одна остановка Tab, следующая за ним — кнопка «…»
		await userEvent.keyboard('{Tab}')
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement, 'фокус на кнопке «…»').toBe(button)

		expectRingInsideHorizontally(button, row(), 'кнопка «…»')
		expectRingInsideVertically(button, row(), 'кнопка «…»')
	})
})
