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
 * став прокручиваемой областью, он не срезает кольцо фокуса тега — ни сверху
 * и снизу, ни сбоку у тех, кто стоит на краю прокрутки: у первого тега и у
 * последнего, докрученного до конца ряда. И что тег у края, видимый частично,
 * на который стрелка переводит фокус, ряд показывает целиком — с крестиком и
 * кольцом; то же — у ленты `arrows`. И что так же целиком ряд показывает всё,
 * на что фокус приходит с клавиатуры: крестики набора без выбора при обходе
 * Tab и тег, на который приходится вход в набор, — а нажатие мышью ряд не
 * двигает.
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

import { expectClearOfFades, expectFocusedClearOfFades, fades } from './fades'
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

/**
 * Стрелка переводит фокус на тег у края прокрутки, видимый частично, — и тег
 * встаёт в область целиком: с крестиком и со всем кольцом.
 *
 * Фокус получает строка тега, а частично видимую строку браузер при фокусе не
 * докручивает вовсе (целиком скрытую — ставит по центру). У конца ряда за
 * краем оставался крестик, который стоит за строкой, у начала — передняя
 * сторона кольца: его рисует пилюля. Всю пилюлю в окно доводит плагин области
 * по `focusin` — ряда (`TTagsScrollPlugin`) или ленты
 * (`TScrollerViewportPlugin`): `focus()` плагина клавиатуры после нажатия
 * клавиши браузер считает фокусом с клавиатуры. Запас под кольцо у края —
 * `scroll-padding` области.
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

	/** Фокус за краем ленту подтягивает сам — и не под подсказку у края, а в чистую часть. */
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
	 * вперёд, ни обратно: у края оказывается то следующий, то предыдущий. Сам
	 * браузер частично видимый элемент при фокусе не докручивает, и в окно
	 * снапа — чистую часть ленты, между подсказками, — его доводит плагин
	 * ленты (`TScrollerViewportPlugin`).
	 *
	 * Остановки Tab у набора без выбора — крестики, с выбором — строки тегов
	 * (roving tabindex). Обход — клавиатурой, как ходит пользователь: плагин
	 * доводит только фокус с клавиатуры (`:focus-visible`), а `focus()` из
	 * скрипта после нажатия мышью в соседнем тесте браузер видимым не считает.
	 */
	describe('элемент под фокусом не остаётся под подсказкой', () => {
		/** Текст тега, который шире окна снапа. */
		const LONG = 'Петропавловск-Камчатский'

		/** Узел по порядку в списке; нет его или он не HTML — тест падает здесь. */
		const at = (nodes: Element[], index: number): HTMLElement => {
			const node = nodes[index]

			if (!(node instanceof HTMLElement)) throw new Error(`узел ${index}: HTML-узла нет`)

			return node
		}

		/**
		 * Клавиша — и ждём, пока лента уляжется: прокрутка от фокуса мгновенная,
		 * но края замер пишет кадром позже, и маска меняется вслед за ними.
		 */
		const press = async (keys: string) => {
			await userEvent.keyboard(keys)
			await nextFrame()
			await nextFrame()
		}

		it('без выбора: крестик по очереди, Tab вперёд и обратно', async () => {
			render(arrows())

			await scrollable()

			const closes = [...viewport().querySelectorAll('.s-tags-item__close')]
			const forth = [...closes.keys()]
			const back = [...forth].reverse().slice(1)

			expect(closes, 'крестиков в ряду').toHaveLength(TAGS.length)

			// Кнопка «назад» в начале строки выключена, и первый Tab ведёт
			// сразу в ленту
			for (const index of forth) {
				await press('{Tab}')

				expectFocusedClearOfFades(at(closes, index), viewport(), `крестик ${index}`)
			}

			for (const index of back) {
				await press('{Shift>}{Tab}{/Shift}')

				expectFocusedClearOfFades(
					at(closes, index),
					viewport(),
					`крестик ${index}, обратно`,
				)
			}
		})

		it('с выбором: строка стрелками до последнего тега и обратно', async () => {
			render(harness(ROWS, { overflow: 'arrows', mode: 'multiple' }))

			await scrollable()

			// Весь набор — одна остановка Tab, и без выбора она на первом теге
			await press('{Tab}')

			expectFocusedClearOfFades(line(TAGS[0]), viewport(), `строка «${TAGS[0]}»`)

			for (const text of TAGS.slice(1)) {
				await press('{ArrowRight}')

				expectFocusedClearOfFades(line(text), viewport(), `строка «${text}»`)
			}

			for (const text of [...TAGS].reverse().slice(1)) {
				await press('{ArrowLeft}')

				expectFocusedClearOfFades(line(text), viewport(), `строка «${text}», обратно`)
			}
		})

		/**
		 * Тег шире окна: точка снапа у него — любое положение, где он накрывает
		 * окно, и крестик в его конце доводится ближайшим из них, при котором
		 * крестик в окне. С «началом тега к началу окна», как у узкого, крестик
		 * остался бы за краем.
		 *
		 * Крестик стоит на краю окна — частью в чистой части ленты, частью под
		 * подсказкой. Такой браузер сам не докручивает, и доводит его только
		 * плагин. Целиком ушедший из окна браузер при переходе Tab докрутил бы
		 * сам, ещё до `focusin`, и правило плагина осталось бы непроверенным.
		 * Длину тега задаёт шрифт, поэтому не тег подгоняется под ленту, а лента
		 * под тег: край чистой части ставится на середину крестика.
		 */
		it('тег шире окна: крестик на краю окна под фокусом — в чистой части', async () => {
			render(
				harness(NARROW, {
					overflow: 'arrows',
					items: [LONG, ...TAGS.slice(1)].map((text) => ({ value: text, text })),
				}),
			)

			await scrollable()

			const tag = at([...viewport().querySelectorAll(':scope > .s-tags-item')], 0)
			const close = at([...tag.querySelectorAll('.s-tags-item__close')], 0)

			/** Правый край чистой части: в начале строки подсказка только у конца. */
			const edge = () => viewport().getBoundingClientRect().right - fades(viewport()).right
			const middle = () => {
				const box = close.getBoundingClientRect()

				return (box.left + box.right) / 2
			}

			host().style.width = `${host().getBoundingClientRect().width + middle() - edge()}px`

			await nextFrame()
			await nextFrame()

			const box = close.getBoundingClientRect()

			expect(tag.textContent?.trim(), 'первый тег').toBe(LONG)
			expect(fades(viewport()).left, 'лента в начале строки').toBe(0)
			expect(box.left, 'крестик заходит в чистую часть').toBeLessThan(edge() - 4)
			expect(box.right, 'крестик заходит под подсказку').toBeGreaterThan(edge() + 4)
			// Шире чистой части — значит, шире и окна: иначе тег встал бы в него
			// целиком, как узкий
			expect(tag.getBoundingClientRect().width, 'тег шире чистой части').toBeGreaterThan(
				edge() - viewport().getBoundingClientRect().left,
			)

			// Весь набор без выбора — остановки у крестиков, и первый — этот
			await press('{Tab}')

			expectFocusedClearOfFades(close, viewport(), 'крестик длинного тега')
		})

		/**
		 * Строка тега под фокусом уже в окне, а его пилюля — нет: крестик за
		 * строкой стоит на краю окна, частью в чистой части ленты, частью под
		 * подсказкой. В окно встаёт вся пилюля — элемент ленты, а не только
		 * элемент под фокусом: кольцо в режиме выбора рисует она, а крестик без
		 * подписи не скажет, какой тег он закроет. Пока лента смотрела на одну
		 * строку, она стояла на месте, а докрутку пилюли до конца окна плагином
		 * клавиатуры снап возвращал к точке предыдущего тега: крестик оставался
		 * под подсказкой, кольцо — за краем вьюпорта.
		 *
		 * Лента подгоняется под тег тем же приёмом, что выше: край чистой части
		 * ставится на середину крестика. Тег — второй: Tab входит в набор на
		 * первом, а на этот фокус переводит стрелка.
		 */
		it('с выбором: строка в окне, крестик на краю — в окно встаёт вся пилюля', async () => {
			render(harness(ROWS, { overflow: 'arrows', mode: 'single' }))

			await scrollable()

			const text = TAGS[1]
			const tag = at([...viewport().querySelectorAll(':scope > .s-tags-item')], 1)
			const close = at([...tag.querySelectorAll('.s-tags-item__close')], 0)

			/** Правый край чистой части: в начале строки подсказка только у конца. */
			const edge = () => viewport().getBoundingClientRect().right - fades(viewport()).right
			const middle = () => {
				const box = close.getBoundingClientRect()

				return (box.left + box.right) / 2
			}

			/** Ширина окна снапа — паддинг-бокс вьюпорта без отступа прокрутки. */
			const snapport = () => {
				const style = getComputedStyle(viewport())

				return (
					viewport().clientWidth -
					parseFloat(style.scrollPaddingLeft) -
					parseFloat(style.scrollPaddingRight)
				)
			}

			host().style.width = `${host().getBoundingClientRect().width + middle() - edge()}px`

			await nextFrame()
			await nextFrame()

			// Весь набор — одна остановка Tab, и без выбора она на первом теге
			await press('{Tab}')

			expect(document.activeElement, `фокус на строке «${TAGS[0]}»`).toBe(line(TAGS[0]))

			// Перед стрелкой проверяется, что доводить есть что: иначе проверки
			// после неё прошли бы вхолостую
			const box = close.getBoundingClientRect()

			expect(tag.textContent?.trim(), 'второй тег').toBe(text)
			expect(fades(viewport()).left, 'лента в начале строки').toBe(0)
			expectClearOfFades(line(text), viewport(), `строка «${text}»`)
			expect(box.left, 'крестик заходит в чистую часть').toBeLessThan(edge() - 4)
			expect(box.right, 'крестик заходит под подсказку').toBeGreaterThan(edge() + 4)
			// Пилюля шире окна в него не встанет — это случай тега шире окна, выше
			expect(tag.getBoundingClientRect().width, 'пилюля уже окна снапа').toBeLessThan(
				snapport(),
			)

			await press('{ArrowRight}')

			expect(document.activeElement, `фокус на строке «${text}»`).toBe(line(text))

			expectClearOfFades(tag, viewport(), `пилюля «${text}»`)
			expectRingInsideHorizontally(tag, viewport(), `пилюля «${text}»`)
		})
	})

	/**
	 * Тег у края ленты, видимый частично, — те же проверки, что у `scroll`
	 * (`arrowOntoCutTag`). Лента — `ROWS`: в узкой пилюля «Санкт-Петербург»
	 * вместе с кольцом шире вьюпорта и не встанет в него ни при каком решении.
	 *
	 * Частично видимую строку здесь доводит в окно снапа плагин ленты
	 * (`TScrollerViewportPlugin`) — сразу вместе с тегом: точка снапа стоит на
	 * нём.
	 */
	describe('стрелка на тег у края, видимый частично', () => {
		beforeEach(async () => {
			render(harness(ROWS, { overflow: 'arrows', mode: 'single' }))

			await scrollable()
		})

		it('тег у конца ленты встаёт в неё целиком', async () => {
			await arrowOntoCutTag(viewport, 'end')
		})

		it('тег у начала ленты встаёт в неё целиком', async () => {
			await arrowOntoCutTag(viewport, 'start')
		})
	})
})

/**
 * Режим `scroll`: кольцо фокуса у краёв ряда.
 *
 * Прокрутка по строке делает ряд прокручиваемой областью и по вертикали, а
 * такая область режет всё, что вышло за её паддинг-бокс, — и запаса за краем
 * обрезки, как у `popover`, у неё не бывает. В режиме выбора кольцо рисует
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
