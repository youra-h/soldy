/**
 * Стенд обязан открываться на каждом компоненте.
 *
 * Смысл проверки шире, чем «страница не упала». Страница строится из
 * дескриптора и рисует компонент **всеми** его пропами разом, в двух режимах —
 * пропом и через экземпляр ядра. Если компонент падает на каком-то сочетании,
 * ломается здесь, а не глазами через месяц. Прежнее демо такой проверки не
 * имело и потому годами показывало не то.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'
import { COMPONENTS, propControls } from '@soldy/playground-shared'
import { AVAILABLE, SHOWCASE } from '../src/catalog'
import { PREVIEW_COMPONENTS } from '../src/previews'
import { router } from '../src/router'
import { useIconPack } from '../src/composables/useIconPack'
import OverviewPage from '../src/views/OverviewPage.vue'
import ComponentPage from '../src/views/ComponentPage.vue'
import PropControl from '../src/components/PropControl.vue'

/**
 * Предупреждения Vue.
 *
 * Стенд — единственное место, где компоненты рисуются всеми пропами разом, и
 * поэтому единственное, где такие предупреждения вообще всплывают. Первый же
 * запуск дал «emitted event "update:anchor_anchor" but it is neither declared
 * in the emits option»: `useEmits` перечислял только собственные пропы, а
 * `useSyncEvents` эмитил и плагинные.
 *
 * Ошибка тихая — в консоли, но не в тестах. Поэтому здесь она превращается в
 * падение: любое предупреждение Vue при отрисовке страницы означает, что
 * контракт компонента и его проводка разошлись.
 */
const warnings: string[] = []

beforeAll(async () => {
	setIcons(material)
	// Компоненты пишут в консоль события — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation((...args) => {
		warnings.push(args.map(String).join(' '))
	})
	router.push('/')
	await router.isReady()
})

beforeEach(() => {
	warnings.length = 0
})

/** Первая строка предупреждения: дальше идёт дерево компонентов, оно шумит. */
function firstLines(): string[] {
	return warnings.map((text) => text.split('\n')[0])
}

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

/** Строка страницы по имени пропа; без неё проверять нечего. */
function rowOf(wrapper: ReturnType<typeof mount>, name: string) {
	const found = wrapper
		.findAll('.pg-prop')
		.find((row) => row.find('.pg-prop__name').text() === name)

	if (!found) throw new Error(`нет строки ${name}`)

	return found
}

describe('каталог адаптера', () => {
	/**
	 * Ключи карты превью — те же идентификаторы, что в общем реестре. Опечатка
	 * (`list_box` вместо `list-box`) не сломает ничего заметного: компонент
	 * просто молча исчезнет из меню, потому что каталог строится пересечением.
	 */
	it('каждое превью соответствует записи реестра', () => {
		const known = new Set(COMPONENTS.map((entry) => entry.id))
		const orphans = Object.keys(PREVIEW_COMPONENTS).filter((id) => !known.has(id))

		expect(orphans).toEqual([])
	})

	it('у каждой записи каталога есть превью', () => {
		expect(AVAILABLE.filter((entry) => !(entry.id in PREVIEW_COMPONENTS))).toEqual([])
	})
})

describe('витрина', () => {
	it('показывает все готовые компоненты', () => {
		const wrapper = mount(OverviewPage, mountOptions)

		expect(wrapper.findAll('.pg-cell')).toHaveLength(SHOWCASE.length)
		expect(firstLines()).toEqual([])

		wrapper.unmount()
	})
})

describe('страница компонента', () => {
	it.each(AVAILABLE.map((entry) => [entry.id, entry] as const))(
		'%s открывается и рисует строку на каждый проп',
		async (id, entry) => {
			const wrapper = mount(ComponentPage, { ...mountOptions, props: { id } })

			// Часть проводки включается кадром позже: `TElementPlugin` отдаёт узел
			// через requestAnimationFrame, и только тогда плагины вроде якоря Frame
			// получают элемент и эмитят свои `update:`. Без ожидания проверка
			// предупреждений ниже была бы вакуумной — до эмита тест не доживал.
			await nextTick()
			await nextFrame()

			// Все три группы: коллекционные свойства (`mode`) объявлены на
			// фасаде, плагинные (`aria_label`) — на плагинах. Счёт из того же
			// источника, из которого строится страница, а не своей копией фильтра
			const { componentControls, collectionControls, pluginControls } = propControls(entry)
			const rows =
				componentControls.length + collectionControls.length + pluginControls.length

			expect(wrapper.findAll('.pg-prop')).toHaveLength(rows)
			expect(firstLines()).toEqual([])

			wrapper.unmount()
		},
	)

	it('на неизвестный идентификатор отвечает, а не падает', () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'нет-такого' } })

		expect(wrapper.find('.pg-empty').exists()).toBe(true)

		wrapper.unmount()
	})
})

/**
 * Переход между страницами — то, чего дымовая проверка выше не видит.
 *
 * Она монтирует `ComponentPage` заново на каждый идентификатор, а в браузере
 * маршрут `/component/:id` обслуживает **один и тот же** экземпляр страницы:
 * меняется только проп `id`. Строки пропов при этом переиспользуются, и всё,
 * что строка успела завести в `setup`, остаётся от прежнего компонента.
 *
 * Так и вышло: правая колонка ListBox рисовала корень с классами Button —
 * `ctrl` в ней оставался экземпляром `TButton`, а элементы приходили уже
 * списочные.
 */
/**
 * Регрессия слота `content`: `Tabs.Content`, положенный в превью не в тот
 * слот, физически оказывается внутри `[role="tablist"]` — панель рядом с
 * табами, а не рядом со списком. Проверяем DOM, а не консоль: страница уже
 * ловит предупреждения Vue целиком, а эта проверка — про саму структуру.
 */
describe('превью tabs', () => {
	it('панель не лежит внутри списка табов', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'tabs' } })

		await nextTick()
		await nextFrame()

		const stages = wrapper.findAll('.pg-col__stage')

		expect(stages.length).toBeGreaterThan(0)

		for (const stage of stages) {
			const list = stage.find('.s-tabs__list')

			expect(list.exists()).toBe(true)
			expect(list.findAll('.s-tabs__panel')).toHaveLength(0)
			expect(stage.findAll('.s-tabs__panel').length).toBeGreaterThan(0)
		}

		wrapper.unmount()
	})
})

describe('переход между компонентами', () => {
	it('правая колонка показывает новый компонент, а не прежний', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'button' } })

		await nextTick()
		await nextFrame()

		await wrapper.setProps({ id: 'list-box' })
		await nextTick()
		await nextFrame()

		const roots = wrapper.findAll('.pg-col__stage > *')

		expect(roots.length).toBeGreaterThan(0)
		expect(roots.every((root) => root.classes('s-list-box'))).toBe(true)

		wrapper.unmount()
	})
})

/**
 * Коллекционные свойства — вторая группа на странице.
 *
 * `mode` объявлен на фасаде коллекции, а не на компоненте, и страница долго
 * его не показывала: строки строились только из компонентного дескриптора.
 * Проверка идёт до самой коллекции, а не до наличия строки: правая колонка
 * пишет `mode` не в инстанс, а в фасад поверх движка из `engine:create`, и
 * молчаливо не сработать там есть чему.
 */
describe('свойства коллекции', () => {
	const modeRow = (wrapper: ReturnType<typeof mount>) =>
		wrapper.findAll('.pg-prop').find((row) => row.find('.pg-prop__name').text() === 'mode')

	it.each(['list-box', 'select', 'accordion'])('%s показывает строку mode', async (id) => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id } })

		await nextTick()
		await nextFrame()

		expect(modeRow(wrapper)).toBeDefined()

		wrapper.unmount()
	})

	it('переключение mode доходит до коллекции в обеих колонках', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'list-box' } })

		await nextTick()
		await nextFrame()

		const row = modeRow(wrapper)

		if (!row) throw new Error('нет строки mode')

		// Значение шлём через сам контрол строки — так же, как это делает клик
		// пользователя. Отрисовку Select проверяют его собственные тесты
		row.findComponent(PropControl).vm.$emit('update:modelValue', 'multiple')
		await nextTick()
		await nextFrame()

		// Наблюдаемое следствие `multiple` — два выбранных разом. У ListBox
		// режим в DOM не выведен, и проверять его можно только поведением
		for (const stage of row.findAll('.pg-col__stage')) {
			const items = stage.findAll('.s-list-box-item .s-button')

			await items[0].trigger('click')
			await items[1].trigger('click')
		}

		await nextTick()

		expect(row.findAll('.s-list-box-item[data-selected="true"]')).toHaveLength(4)

		wrapper.unmount()
	})
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
	const ariaLabels = (wrapper: ReturnType<typeof mount>) =>
		rowOf(wrapper, 'aria_label')
			.findAll('.pg-col__stage .s-button')
			.map((button) => button.attributes('aria-label'))

	it('aria_label доходит до DOM в обеих колонках', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'button' } })

		await nextTick()
		await nextFrame()

		// Значение шлём через контрол строки — так же, как строка `mode`
		rowOf(wrapper, 'aria_label')
			.findComponent(PropControl)
			.vm.$emit('update:modelValue', 'Закрыть')
		await nextTick()
		await nextFrame()

		expect(ariaLabels(wrapper)).toEqual(['Закрыть', 'Закрыть'])

		wrapper.unmount()
	})

	/**
	 * Смена пакета иконок меняет `key` превью, и правая колонка монтируется
	 * заново — с новым bundle, чей плагин стартует без имени и снимает его с
	 * инстанса. Значение обязано доехать и до этого bundle.
	 */
	it('значение переживает перемонтирование колонок', async () => {
		const { version } = useIconPack()
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'button' } })

		await nextTick()
		await nextFrame()

		rowOf(wrapper, 'aria_label')
			.findComponent(PropControl)
			.vm.$emit('update:modelValue', 'Закрыть')
		await nextTick()
		await nextFrame()

		version.value++
		await nextTick()
		await nextFrame()

		expect(ariaLabels(wrapper)).toEqual(['Закрыть', 'Закрыть'])

		wrapper.unmount()
		version.value--
	})
})

/**
 * Пресет строки: `removeOnBackspace` виден только в `editable` + `multiple`,
 * `indicator` у ListBox нужен там, где выбрано несколько элементов.
 *
 * Проверяем DOM обеих колонок, а не сам пресет: во второй колонке он едет
 * разметкой рядом с `ctrl`, и доехать до инстанса и фасада коллекции там
 * есть чему не сработать. Признаки Select — теги (есть только в `multiple`) и
 * снятый `readonly` у поля (снимает только `editable`). У ListBox режим в DOM
 * не выведен, и признак — поведение: после кликов по двум разным элементам
 * оба остаются выбранными только в `multiple`.
 */
describe('пресет строки', () => {
	/**
	 * Клики по двум разным элементам в каждой колонке строки ListBox — те же,
	 * что в проверке строки `mode`. Результат — число выбранных по колонкам,
	 * а не общий счёт по строке: упавшая проверка сразу показывает, в какой
	 * колонке режим не доехал.
	 */
	async function selectedAfterTwoClicks(row: ReturnType<typeof rowOf>): Promise<number[]> {
		const stages = row.findAll('.pg-col__stage')

		for (const stage of stages) {
			const items = stage.findAll('.s-list-box-item .s-button')

			await items[0].trigger('click')
			await items[1].trigger('click')
		}

		await nextTick()

		return stages.map((stage) => stage.findAll('.s-list-box-item[data-selected="true"]').length)
	}

	it('removeOnBackspace рисует Select в editable + multiple в обеих колонках', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'select' } })

		await nextTick()
		await nextFrame()

		const stages = rowOf(wrapper, 'removeOnBackspace').findAll('.pg-col__stage')

		expect(stages).toHaveLength(2)

		for (const stage of stages) {
			expect(stage.find('.s-select__tags').exists()).toBe(true)
			expect(stage.find('.s-select__field input').attributes('readonly')).toBeUndefined()
		}

		wrapper.unmount()
	})

	it('соседние строки пресет не получают', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'select' } })

		await nextTick()
		await nextFrame()

		for (const stage of rowOf(wrapper, 'closeOnSelect').findAll('.pg-col__stage')) {
			expect(stage.find('.s-select__tags').exists()).toBe(false)
		}

		wrapper.unmount()
	})

	it('indicator рисует ListBox в multiple в обеих колонках', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'list-box' } })

		await nextTick()
		await nextFrame()

		expect(await selectedAfterTwoClicks(rowOf(wrapper, 'indicator'))).toEqual([2, 2])

		wrapper.unmount()
	})

	it('соседние строки ListBox пресет не получают', async () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'list-box' } })

		await nextTick()
		await nextFrame()

		expect(await selectedAfterTwoClicks(rowOf(wrapper, 'view'))).toEqual([1, 1])

		wrapper.unmount()
	})
})
