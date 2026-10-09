/**
 * Стенд обязан открываться на каждом компоненте — у каждого фреймворка.
 *
 * Смысл проверки шире, чем «страница не упала». Страница строится из
 * дескриптора и рисует компонент **всеми** его пропами разом, в двух режимах —
 * пропом и через экземпляр ядра. Если компонент падает на каком-то сочетании,
 * ломается здесь, а не глазами через месяц. Прежнее демо такой проверки не
 * имело и потому годами показывало не то.
 *
 * Компонент рисует хост фреймворка в своём корне, поэтому внутрь превью тест
 * смотрит по DOM: дерево компонентов оболочки корня хоста не видит.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { COMPONENTS, propControls } from '@soldy-ui/playground-shared'
import { availableOf, showcaseOf } from '../src/catalog'
import { FRAMEWORKS, hostOf, loadHost } from '../src/hosts'
import { router } from '../src/router'
import { useIconPack } from '../src/composables/useIconPack'
import OverviewPage from '../src/views/OverviewPage.vue'
import ComponentPage from '../src/views/ComponentPage.vue'
import PropControl from '../src/components/PropControl.vue'
import PropRow from '../src/components/PropRow.vue'
import CodeView from '../src/components/CodeView.vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Хосты — загрузчиком, как их грузит роутер: мимо загрузчика оболочка хост
 * не импортирует, и тест тоже.
 */
await Promise.all(FRAMEWORKS.map(({ id }) => loadHost(id)))

const IDS = FRAMEWORKS.map(({ id }) => id)

/** Фреймворки, чей хост рисует все эти компоненты: проверка компонента — только там, где он есть. */
const drawing = (...components: string[]) =>
	IDS.filter((framework) =>
		components.every((component) => hostOf(framework).previews.includes(component)),
	)

/**
 * Предупреждения и ошибки в консоли.
 *
 * Стенд — единственное место, где компоненты рисуются всеми пропами разом, и
 * поэтому единственное, где такие предупреждения вообще всплывают. Первый же
 * запуск дал «emitted event "update:anchor_anchor" but it is neither declared
 * in the emits option»: `useEmits` перечислял только собственные пропы, а
 * `useAdapter` эмитил `update:` и по плагинным.
 *
 * Ошибка тихая — в консоли, но не в тестах. Поэтому здесь она превращается в
 * падение: любое предупреждение при отрисовке страницы означает, что контракт
 * компонента и его проводка разошлись. Vue пишет их в `console.warn`, React —
 * в `console.error`: ловятся оба.
 */
const warnings: string[] = []

beforeAll(async () => {
	setIcons(material)
	// Компоненты пишут в консоль события — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})

	for (const method of ['warn', 'error'] as const) {
		vi.spyOn(console, method).mockImplementation((...args) => {
			warnings.push(args.map(String).join(' '))
		})
	}

	router.push('/')
	await router.isReady()
})

beforeEach(() => {
	warnings.length = 0
})

/** Смонтированная страница теста — снимается после теста, даже упавшего. */
let page: VueWrapper | undefined

afterEach(() => {
	page?.unmount()
	page = undefined
})

/** Первая строка предупреждения: дальше идёт дерево компонентов, оно шумит. */
function firstLines(): string[] {
	return warnings.map((text) => text.split('\n')[0])
}

/**
 * Предупреждения адаптера на настоящем сочетании пропов, на которые заведены
 * задачи: страница фреймворка и начало текста. Решили задачу — строка уходит.
 */
const KNOWN_WARNINGS: readonly { framework: string; component: string; text: string }[] = [
	// Временно, до 869feq966: Icon без tag рисует <error>, React предупреждает о
	// неизвестном теге — строка `tag` с умолчанием ядра
	{ framework: 'react', component: 'icon', text: 'The tag <%s> is unrecognized in this browser' },
]

/** Предупреждения страницы, кроме известных — тех, на которые заведены задачи. */
function unknownWarnings(framework: string, component: string): string[] {
	return firstLines().filter(
		(line) =>
			!KNOWN_WARNINGS.some(
				(known) =>
					known.framework === framework &&
					known.component === component &&
					line.startsWith(known.text),
			),
	)
}

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

/**
 * Страница компонента фреймворка. Часть проводки включается кадром позже:
 * `TElementPlugin` отдаёт узел через requestAnimationFrame, и только тогда
 * плагины вроде якоря Frame получают элемент и эмитят свои `update:`. Без
 * ожидания проверка предупреждений была бы вакуумной — до эмита тест не
 * доживал.
 */
async function openPage(framework: string, id: string): Promise<VueWrapper> {
	page = mount(ComponentPage, { ...mountOptions, props: { framework, id } })

	await nextTick()
	await nextFrame()

	return page
}

/** Строка страницы по имени пропа; без неё проверять нечего. */
function rowOf(wrapper: VueWrapper, name: string) {
	const found = wrapper
		.findAll('.pg-prop')
		.find((row) => row.find('.pg-prop__name').text() === name)

	if (!found) throw new Error(`нет строки ${name}`)

	return found
}

/** Строка компонентом — оболочки: по ней видно, что строка пережила перерисовку. */
function rowComponentOf(wrapper: VueWrapper, name: string) {
	const found = wrapper
		.findAllComponents(PropRow)
		.find((row) => row.props('control').name === name)

	if (!found) throw new Error(`нет строки ${name}`)

	return found
}

/**
 * Значение — через контрол строки, тем же, что отдаёт он сам, — как клик
 * пользователя. Отрисовку Select и Input проверяют их собственные тесты.
 * Стёртое числовое поле и снятый выбор списка дают `undefined`, стёртое
 * текстовое — `''`.
 */
async function enter(row: DOMWrapper<Element>, value: unknown): Promise<void> {
	const control = row.findComponent(PropControl)

	if (!control.exists()) throw new Error('у строки нет контрола')

	control.vm.$emit('update:modelValue', value)
	await nextTick()
	await nextFrame()
}

/** Сцены колонок строки: в первой — пропы, во второй — экземпляр. */
const stagesOf = (row: DOMWrapper<Element>) => row.findAll('.pg-col__stage')

/**
 * Клики по двум разным элементам в каждой колонке строки ListBox — те же, что
 * в проверке строки `mode`. Результат — число выбранных по колонкам, а не общий
 * счёт по строке: упавшая проверка сразу показывает, в какой колонке режим не
 * доехал. Два выбранных — признак `multiple`: у ListBox режим в DOM не выведен.
 */
async function selectedAfterTwoClicks(row: DOMWrapper<Element>): Promise<number[]> {
	const stages = stagesOf(row)

	for (const stage of stages) {
		const items = stage.findAll('.s-list-box-item .s-button')

		await items[0].trigger('click')
		await items[1].trigger('click')
	}

	await nextTick()

	return stages.map((stage) => stage.findAll('.s-list-box-item[data-selected="true"]').length)
}

/** Имя кнопки в каждой колонке строки. */
const ariaLabels = (row: DOMWrapper<Element>) =>
	row.findAll('.pg-col__stage .s-button').map((button) => button.attributes('aria-label'))

/**
 * Панели окон строки по колонкам. Окно телепортировано в `body` из корня хоста,
 * и ни в DOM строки, ни в дереве её компонентов его нет. Панель колонки — та,
 * что открыла её кнопка: после нажатия видна ровно она. Закрывает её «Отмена»
 * в подвале — следующая колонка открывает свою.
 */
async function dialogPanels(row: DOMWrapper<Element>): Promise<HTMLElement[]> {
	const panels: HTMLElement[] = []

	for (const stage of stagesOf(row)) {
		await stage.get('.s-button').trigger('click')
		await nextTick()

		const open = [...document.querySelectorAll('.s-dialog')].filter(
			(panel): panel is HTMLElement =>
				panel instanceof HTMLElement && panel.style.display !== 'none',
		)

		if (open.length !== 1) throw new Error(`открытых окон ${open.length}, а не одно`)

		const cancel = [...open[0].querySelectorAll('.s-button')].find(
			(button) => button.textContent?.trim() === 'Отмена',
		)

		if (!(cancel instanceof HTMLElement)) throw new Error('в окне нет кнопки «Отмена»')

		panels.push(open[0])
		cancel.click()
		await nextTick()
	}

	return panels
}

describe.each(IDS)('каталог хоста %s', (framework) => {
	/**
	 * Ключи карты превью — те же идентификаторы, что в общем реестре. Опечатка
	 * (`list_box` вместо `list-box`) не сломает ничего заметного: компонент
	 * просто молча исчезнет из меню, потому что каталог строится пересечением.
	 */
	it('каждое превью соответствует записи реестра', () => {
		const known = new Set(COMPONENTS.map((entry) => entry.id))

		expect(hostOf(framework).previews.filter((id) => !known.has(id))).toEqual([])
	})

	it('витрина показывает все готовые компоненты хоста, каждый — нарисованным', async () => {
		page = mount(OverviewPage, { ...mountOptions, props: { framework } })

		await nextTick()
		await nextFrame()

		const cells = page.findAll('.pg-cell')

		expect(cells).toHaveLength(showcaseOf(hostOf(framework)).length)
		expect(
			cells.filter((cell) => !cell.find('.pg-cell__stage .pg-mount > *').exists()),
		).toEqual([])
		expect(firstLines()).toEqual([])
	})
})

describe('страница компонента', () => {
	const PAGES = IDS.flatMap((framework) =>
		availableOf(hostOf(framework)).map((entry) => [framework, entry.id, entry] as const),
	)

	it.each(PAGES)(
		'%s/%s открывается и рисует строку на каждый проп',
		async (framework, id, entry) => {
			const wrapper = await openPage(framework, id)

			// Все три группы: коллекционные свойства (`mode`) объявлены на
			// фасаде, плагинные (`aria_label`) — на плагинах. Счёт из того же
			// источника, из которого строится страница, а не своей копией фильтра
			const { componentControls, collectionControls, pluginControls } = propControls(entry)
			const rows =
				componentControls.length + collectionControls.length + pluginControls.length

			expect(wrapper.findAll('.pg-prop')).toHaveLength(rows)
			expect(unknownWarnings(framework, id)).toEqual([])
		},
	)

	it('на неизвестный идентификатор отвечает, а не падает', async () => {
		const wrapper = await openPage('vue', 'нет-такого')

		expect(wrapper.find('.pg-empty').exists()).toBe(true)
	})

	/**
	 * Адрес компонента переживает смену фреймворка, а компонента у нового может
	 * не быть: страница говорит об этом и ведёт на витрину фреймворка.
	 */
	const MISSING = IDS.flatMap((framework) => {
		const missing = COMPONENTS.find((entry) => !hostOf(framework).previews.includes(entry.id))

		return missing ? [[framework, missing.id, missing.label] as const] : []
	})

	it.each(MISSING)(
		'%s/%s: компонента у фреймворка нет — пустое состояние со ссылкой на витрину',
		async (framework, id, label) => {
			const wrapper = await openPage(framework, id)

			expect(wrapper.findAll('.pg-prop')).toHaveLength(0)
			expect(wrapper.get('.pg-empty').text()).toContain(label)
			expect(wrapper.get('.pg-empty a').attributes('href')).toBe(`#/${framework}`)
		},
	)
})

/**
 * Регрессия слота `content`: `Tabs.Content`, положенный в превью не в тот
 * слот, физически оказывается внутри `[role="tablist"]` — панель рядом с
 * табами, а не рядом со списком. Проверяем DOM, а не консоль: страница уже
 * ловит предупреждения целиком, а эта проверка — про саму структуру.
 */
describe('превью tabs', () => {
	it.each(drawing('tabs'))('%s: панель не лежит внутри списка табов', async (framework) => {
		const wrapper = await openPage(framework, 'tabs')
		const stages = wrapper.findAll('.pg-col__stage')

		expect(stages.length).toBeGreaterThan(0)

		for (const stage of stages) {
			const list = stage.find('.s-tabs__list')

			expect(list.exists()).toBe(true)
			expect(list.findAll('.s-tabs__panel')).toHaveLength(0)
			expect(stage.findAll('.s-tabs__panel').length).toBeGreaterThan(0)
		}
	})
})

/**
 * Переход между страницами — то, чего дымовая проверка выше не видит.
 *
 * Она монтирует `ComponentPage` заново на каждый идентификатор, а в браузере
 * маршрут `/:framework/:id` обслуживает **один и тот же** экземпляр страницы:
 * меняется только проп `id`. Строки пропов при этом переиспользуются, и всё,
 * что строка успела завести в `setup`, остаётся от прежнего компонента.
 *
 * Так и вышло: правая колонка ListBox рисовала корень с классами Button —
 * `ctrl` в ней оставался экземпляром `TButton`, а элементы приходили уже
 * списочные.
 */
describe('переход между компонентами', () => {
	it.each(drawing('button', 'list-box'))(
		'%s: колонки показывают новый компонент, а не прежний',
		async (framework) => {
			const wrapper = await openPage(framework, 'button')

			await wrapper.setProps({ id: 'list-box' })
			await nextTick()
			await nextFrame()

			const roots = wrapper.findAll('.pg-col__stage > .pg-mount > *')

			expect(roots.length).toBeGreaterThan(0)
			expect(roots.every((root) => root.classes('s-list-box'))).toBe(true)
		},
	)
})

/**
 * Состояние страницы держит оболочка: строка, её значение, экземпляр ядра.
 * Смена фреймворка перемонтирует только сцены — хост нового фреймворка
 * получает в первой колонке значение строки пропом, а во второй тот же
 * экземпляр, в плагин которого строка пишет значение заново.
 */
describe('смена фреймворка', () => {
	it('значение строки переживает её: aria_label у Button, Vue → React, обе колонки', async () => {
		const wrapper = await openPage('vue', 'button')

		await enter(rowOf(wrapper, 'aria_label'), 'Закрыть')
		expect(ariaLabels(rowOf(wrapper, 'aria_label'))).toEqual(['Закрыть', 'Закрыть'])

		const before = rowOf(wrapper, 'aria_label').element
		const draw = vi.spyOn(hostOf('react'), 'mount')

		await wrapper.setProps({ framework: 'react' })
		await nextTick()
		await nextFrame()

		const row = rowOf(wrapper, 'aria_label')
		const drawn = draw.mock.calls.filter(([node]) => row.element.contains(node))

		draw.mockRestore()

		// Строка та же, а обе сцены нарисовал хост React: первая получила
		// значение пропом, вторая — экземпляр, в плагин которого его пишет строка
		expect(row.element).toBe(before)
		expect(drawn.map(([, mounted]) => mounted.props.aria_label)).toEqual(['Закрыть', undefined])
		expect(ariaLabels(row)).toEqual(['Закрыть', 'Закрыть'])
		expect(firstLines()).toEqual([])
	})
})

/**
 * Коллекционные свойства — вторая группа на странице.
 *
 * `mode` объявлен на фасаде коллекции, а не на компоненте, и страница долго
 * его не показывала: строки строились только из компонентного дескриптора.
 * Проверка идёт до самой коллекции, а не до наличия строки: правая колонка
 * пишет `mode` не в инстанс, а в фасад поверх своего движка, и молчаливо не
 * сработать там есть чему.
 */
describe('свойства коллекции', () => {
	const MODE_PAGES = ['list-box', 'select', 'accordion', 'calendar'].flatMap((id) =>
		drawing(id).map((framework) => [framework, id] as const),
	)

	it.each(MODE_PAGES)('%s/%s показывает строку mode', async (framework, id) => {
		const wrapper = await openPage(framework, id)

		expect(rowOf(wrapper, 'mode').exists()).toBe(true)
	})

	it.each(drawing('list-box'))(
		'%s: переключение mode доходит до коллекции в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'list-box')
			const row = rowOf(wrapper, 'mode')

			await enter(row, 'multiple')

			// Наблюдаемое следствие `multiple` — два выбранных разом. У ListBox
			// режим в DOM не выведен, и проверять его можно только поведением
			expect(await selectedAfterTwoClicks(row)).toEqual([2, 2])
		},
	)

	/**
	 * Выбор у календаря свой, дат, а не стандартный: движок второй колонки
	 * доставляет фасад календаря, и `mode` обязан доехать до его выбора, а не
	 * до чужого. Признак режима — `aria-multiselectable` у сетки: несколько
	 * дней выбирают в `multiple` и `range`.
	 */
	it.each(drawing('calendar'))(
		'%s: mode календаря доходит до коллекции в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'calendar')
			const row = rowOf(wrapper, 'mode')

			const multiselectable = () =>
				row
					.findAll('.s-calendar__grid')
					.map((grid) => grid.attributes('aria-multiselectable'))

			expect(multiselectable()).toEqual([undefined, undefined])

			await enter(row, 'range')

			expect(multiselectable()).toEqual(['true', 'true'])
		},
	)
})

/**
 * Свойства плагинов — третья группа на странице.
 *
 * Проверка идёт до DOM, а не до наличия строки: правая колонка пишет проп не в
 * инстанс, а в плагин из bundle, который приходит событием `bundle:create`, и
 * молчаливо не сработать там есть чему. `aria_label` виден сразу — атрибутом
 * `aria-label` на корне кнопки.
 */
describe('свойства плагинов', () => {
	it.each(drawing('button'))(
		'%s: aria_label доходит до DOM в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'button')

			await enter(rowOf(wrapper, 'aria_label'), 'Закрыть')

			expect(ariaLabels(rowOf(wrapper, 'aria_label'))).toEqual(['Закрыть', 'Закрыть'])
		},
	)

	/**
	 * Смена пакета иконок рисует сцены заново, и правая колонка монтируется с
	 * новым bundle, чей плагин стартует без имени и снимает его с инстанса.
	 * Значение обязано доехать и до этого bundle.
	 */
	it.each(drawing('button'))(
		'%s: значение переживает перемонтирование колонок',
		async (framework) => {
			const { version } = useIconPack()
			const wrapper = await openPage(framework, 'button')

			await enter(rowOf(wrapper, 'aria_label'), 'Закрыть')

			version.value++

			try {
				await nextTick()
				await nextFrame()

				expect(ariaLabels(rowOf(wrapper, 'aria_label'))).toEqual(['Закрыть', 'Закрыть'])
			} finally {
				version.value--
			}
		},
	)
})

/**
 * Пресет строки: `removeOnBackspace` виден только в `editable` + `multiple`,
 * `indicator` у ListBox нужен там, где выбрано несколько элементов, `offset`
 * у Dialog виден у окна, растянутого по экрану.
 *
 * Проверяем DOM обеих колонок, а не сам пресет: во второй колонке он едет
 * разметкой рядом с `ctrl`, и доехать до инстанса и фасада коллекции там
 * есть чему не сработать. Признаки Select — теги (есть только в `multiple`) и
 * снятый `readonly` у поля (снимает только `editable`). У ListBox режим в DOM
 * не выведен, и признак — поведение: после кликов по двум разным элементам
 * оба остаются выбранными только в `multiple`. У окна признак — переменные
 * размера и отступа на его панели.
 */
describe('пресет строки', () => {
	it.each(drawing('select'))(
		'%s: removeOnBackspace рисует Select в editable + multiple в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'select')
			const stages = stagesOf(rowOf(wrapper, 'removeOnBackspace'))

			expect(stages).toHaveLength(2)

			for (const stage of stages) {
				expect(stage.find('.s-select__tags').exists()).toBe(true)
				expect(stage.find('.s-select__field input').attributes('readonly')).toBeUndefined()
			}
		},
	)

	it.each(drawing('select'))('%s: соседние строки пресет не получают', async (framework) => {
		const wrapper = await openPage(framework, 'select')

		for (const stage of stagesOf(rowOf(wrapper, 'closeOnSelect'))) {
			expect(stage.find('.s-select__tags').exists()).toBe(false)
		}
	})

	it.each(drawing('list-box'))(
		'%s: indicator рисует ListBox в multiple в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'list-box')

			expect(await selectedAfterTwoClicks(rowOf(wrapper, 'indicator'))).toEqual([2, 2])
		},
	)

	it.each(drawing('list-box'))(
		'%s: соседние строки ListBox пресет не получают',
		async (framework) => {
			const wrapper = await openPage(framework, 'list-box')

			expect(await selectedAfterTwoClicks(rowOf(wrapper, 'view'))).toEqual([1, 1])
		},
	)

	/**
	 * Отступ у центра — поля области, по центру которой стоит окно: окно меньше
	 * экрана от него не сдвигается. Строка растягивает окно по области (`auto`
	 * — «по экрану с отступом»), и отступ виден зазором до краёв экрана.
	 */
	it.each(drawing('dialog'))(
		'%s: offset рисует Dialog по экрану с отступом в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'dialog')

			const sizes = async (name: string) =>
				(await dialogPanels(rowOf(wrapper, name))).map((panel) => [
					panel.style.getPropertyValue('--dialog-width'),
					panel.style.getPropertyValue('--dialog-height'),
				])

			expect(await sizes('offset')).toEqual([
				['auto', 'auto'],
				['auto', 'auto'],
			])
			expect(await sizes('placement')).toEqual([
				['', ''],
				['', ''],
			])
		},
	)

	/**
	 * Набор — в само поле строки, а не значением мимо контрола: проверяется
	 * преобразование текста. `10%` уходит строкой как есть, `40` — числом, и
	 * окно получает его пикселями.
	 */
	it.each(drawing('dialog'))(
		'%s: набранное в поле offset доходит до окна обеих колонок',
		async (framework) => {
			const wrapper = await openPage(framework, 'dialog')
			const row = rowOf(wrapper, 'offset')
			const field = row.find('.pg-prop__control input')
			const tops = async () =>
				(await dialogPanels(row)).map((panel) =>
					panel.style.getPropertyValue('--dialog-offset-top'),
				)

			await field.setValue('10%')
			await nextTick()
			await nextFrame()

			expect(await tops()).toEqual(['10%', '10%'])

			await field.setValue('40')
			await nextTick()
			await nextFrame()

			expect(await tops()).toEqual(['40px', '40px'])

			// Пиксели окно получило бы и от строки '40' — число видно по коду
			// колонок: он учит задавать пиксели числом. Код пишет хост, у
			// которого есть генератор
			const [propCode, instanceCode] = rowComponentOf(wrapper, 'offset')
				.findAllComponents(CodeView)
				.map((view) => view.props('code'))

			if (hostOf(framework).snippets) {
				expect(propCode).toContain(':offset="40"')
				expect(instanceCode).toContain('instance.offset = 40')
			}
		},
	)
})

/**
 * Очищенное поле — «проп не задан», и колонки обязаны показывать одно.
 *
 * Первая колонка такой проп не передаёт, и связка возвращает свойство к
 * умолчанию декларации (`TLine.reset`). Вторая пишет в экземпляр сама и
 * писала туда `undefined` — значение вне типа свойства: у ProgressLinear
 * шкала осталась бы без конца (`aria-valuemax="undefined"`). По случаю на
 * каждую ветку записи: свойство компонента, коллекции и плагина.
 */
describe('очищенное поле', () => {
	/**
	 * Строка `max` — с пресетом `value: 40`, и по доле видно, куда встала
	 * шкала. Строка `value` для этой проверки не годится: умолчание доли —
	 * ноль, и `undefined`, записанный мимо правила, полоса рисует так же —
	 * пустой, с `aria-valuenow="0"`.
	 */
	it.each(drawing('progress-linear'))(
		'%s: возвращает умолчание — шкала ProgressLinear снова до 100 в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'progress-linear')
			const row = rowOf(wrapper, 'max')
			const scales = () =>
				row
					.findAll('.pg-col__stage .s-progress-linear')
					.map(
						(bar) =>
							`${bar.attributes('aria-valuenow')} из ${bar.attributes('aria-valuemax')}`,
					)

			await enter(row, 50)
			expect(scales()).toEqual(['40 из 50', '40 из 50'])

			await enter(row, undefined)
			expect(scales()).toEqual(['40 из 100', '40 из 100'])
		},
	)

	/**
	 * У `mode` фасадов умолчания нет: «не задано» его сеттер не принимает, и
	 * сбрасывать не к чему. Первая колонка режим оставляет — вторая тоже.
	 */
	it.each(drawing('list-box'))(
		'%s: без умолчания не пишет ничего — ListBox остаётся в multiple в обеих колонках',
		async (framework) => {
			const wrapper = await openPage(framework, 'list-box')
			const row = rowOf(wrapper, 'mode')

			await enter(row, 'multiple')
			await enter(row, undefined)

			expect(await selectedAfterTwoClicks(row)).toEqual([2, 2])
		},
	)

	/**
	 * Значим ключ умолчания, а не значение: `aria_label` объявлен с умолчанием
	 * `undefined`, и пишется оно, как любое другое. Проверка «умолчание не
	 * `undefined`» оставила бы плагину второй колонки прежнее имя.
	 */
	it.each(drawing('button'))(
		'%s: пишет и объявленное undefined — имя уходит из обеих колонок',
		async (framework) => {
			const wrapper = await openPage(framework, 'button')
			const row = rowOf(wrapper, 'aria_label')

			await enter(row, 'Закрыть')
			expect(ariaLabels(row)).toEqual(['Закрыть', 'Закрыть'])

			await enter(row, '')
			expect(ariaLabels(row)).toEqual([undefined, undefined])
		},
	)
})
