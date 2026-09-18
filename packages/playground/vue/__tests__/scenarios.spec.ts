/**
 * Страница тестов стенда.
 *
 * Сценарии реестра здесь не запускаются — в CI они не идут: упавший сценарий
 * — найденная проблема компонента, а не сломанная сборка. Проверяется сама
 * площадка: что страница открывается, что фикстуры и сценарии не разошлись и
 * что настоящий хост Vue доводит прогон до итога. Для последнего сценарии
 * свои, из теста, — и подкладываются странице через `provide`.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { SCENARIOS as SCENARIO_REGISTRY, type TScenario } from '@soldy/playground-shared'
import { findAvailable, SCENARIOS, TOPICS } from '../src/catalog'
import { FIXTURES, fixtureOf } from '../src/scenarios/fixtures'
import { createScenarioBench, SCENARIO_BENCH } from '../src/composables/useScenarios'
import { router } from '../src/router'
import TestsPage from '../src/views/TestsPage.vue'
import AppHeader from '../src/components/AppHeader.vue'

/**
 * Кнопки страницы слушают DOM с кадра после монтирования: `TElementPlugin`
 * отдаёт узел плагинам через requestAnimationFrame. Клик раньше ушёл бы в
 * пустоту.
 */
async function rendered(): Promise<void> {
	await nextTick()
	await new Promise((resolve) => requestAnimationFrame(resolve))
}

/** Предупреждения Vue роняют тест — как в `smoke.spec.ts`. */
const warnings: string[] = []

beforeAll(async () => {
	// Журнал сценариев печатает каждое событие — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation((...args) => {
		warnings.push(args.map(String).join(' ').split('\n')[0])
	})
	router.push('/')
	await router.isReady()
})

beforeEach(() => {
	warnings.length = 0
})

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

describe('каталог сценариев', () => {
	it('есть хотя бы одна тема', () => {
		expect(TOPICS.length).toBeGreaterThan(0)
	})

	/**
	 * Сценарий без фикстуры не падает — он молча пропадает со страницы:
	 * каталог строится пересечением. Поэтому пропажа ловится здесь.
	 */
	it('у каждого сценария доступного компонента есть чем его нарисовать', () => {
		const orphans = SCENARIO_REGISTRY.filter(
			(scenario) => findAvailable(scenario.component) && !fixtureOf(scenario),
		).map((scenario) => scenario.id)

		expect(orphans).toEqual([])
	})

	it('нет фикстур, на которые не ссылается ни один сценарий', () => {
		const used = new Set(SCENARIO_REGISTRY.map((scenario) => scenario.fixture))

		expect(Object.keys(FIXTURES).filter((key) => !used.has(key))).toEqual([])
	})
})

describe('страница темы', () => {
	it.each(TOPICS.map((topic) => [topic.id] as const))(
		'%s открывается с блоком на каждый сценарий',
		async (topic) => {
			const wrapper = mount(TestsPage, { ...mountOptions, props: { topic } })

			await nextTick()

			const expected = SCENARIOS.filter((scenario) => scenario.topic === topic)

			expect(wrapper.findAll('.pg-scenario')).toHaveLength(expected.length)
			expect(warnings).toEqual([])

			wrapper.unmount()
		},
	)

	it('на неизвестную тему отвечает, а не падает', () => {
		const wrapper = mount(TestsPage, { ...mountOptions, props: { topic: 'нет-такой' } })

		expect(wrapper.find('.pg-empty').exists()).toBe(true)

		wrapper.unmount()
	})
})

/**
 * Сквозной прогон: раннер, хост Vue, настоящий Button, журнал из его событий.
 */
describe('прогон через хост Vue', () => {
	const scenarios: TScenario[] = [
		{
			id: 'test/auto',
			component: 'button',
			topic: 'events',
			kind: 'auto',
			title: 'авто',
			description: '',
			props: { text: 'До' },
			run: async (ctx) => {
				const from = ctx.journal.entries.length

				ctx.instance.text = 'После'
				await ctx.frame()

				ctx.check(ctx.journal.count('change:text', from) === 1, 'change:text в журнале')
				ctx.check(ctx.journal.count('update:text', from) === 1, 'update:text в журнале')
				ctx.check(ctx.scene.textContent?.includes('После') === true, 'новый текст в DOM')
			},
		},
		{
			id: 'test/press',
			component: 'button',
			topic: 'events',
			kind: 'manual',
			title: 'нажатие',
			description: '',
			steps: ['нажать дважды'],
			run: async (ctx) => {
				await ctx.events('action:press', 2)
				ctx.check(true, 'два нажатия')
			},
		},
		{
			id: 'test/verdict',
			component: 'button',
			topic: 'events',
			kind: 'manual',
			title: 'вердикт',
			description: '',
			steps: ['посмотреть'],
		},
	]

	function setup() {
		const bench = createScenarioBench(scenarios, { timeout: 2000 })
		const wrapper = mount(TestsPage, {
			...mountOptions,
			props: { topic: 'events' },
			global: { ...mountOptions.global, provide: { [SCENARIO_BENCH]: bench } },
		})

		const block = (id: string) => wrapper.get(`.pg-scenario[data-id="${id}"]`)
		const status = (id: string) => bench.runner.state(id).status

		return { bench, wrapper, block, status }
	}

	it('«Запустить все»: автоматический проходит, ручные ждут, каждый в своём блоке', async () => {
		const { wrapper, block, status } = setup()

		await rendered()
		await wrapper.get('.pg-tests__run-all').trigger('click')

		await vi.waitFor(() => expect(status('test/auto')).toBe('passed'))
		await vi.waitFor(() => expect(status('test/press')).toBe('waiting'))
		await vi.waitFor(() => expect(status('test/verdict')).toBe('waiting'))

		expect(block('test/auto').findAll('.pg-checks__item--failed')).toHaveLength(0)
		expect(block('test/auto').findAll('.pg-checks__item')).toHaveLength(3)
		expect(block('test/press').find('.pg-scenario__scene .s-button').exists()).toBe(true)
		expect(wrapper.find('.pg-badge--failed').exists()).toBe(false)
		expect(warnings).toEqual([])

		wrapper.unmount()
	})

	it('ручной засчитывается сам по нажатиям на сцене', async () => {
		const { wrapper, block, status } = setup()

		await rendered()
		await block('test/press').get('.pg-scenario__run').trigger('click')
		await vi.waitFor(() => expect(status('test/press')).toBe('waiting'))

		const button = block('test/press').get('.pg-scenario__scene .s-button')

		await button.trigger('click')
		await button.trigger('click')

		await vi.waitFor(() => expect(status('test/press')).toBe('passed'))
		await nextTick()

		expect(block('test/press').attributes('data-status')).toBe('passed')

		wrapper.unmount()
	})

	it('✗ роняет ручной, и сводка показывает errors', async () => {
		const { wrapper, block, status } = setup()

		await rendered()
		await block('test/verdict').get('.pg-scenario__run').trigger('click')
		await vi.waitFor(() => expect(status('test/verdict')).toBe('waiting'))
		await nextTick()

		await block('test/verdict').get('.pg-scenario__fail').trigger('click')
		await nextTick()

		expect(status('test/verdict')).toBe('failed')
		expect(wrapper.get('.pg-badge--failed').text()).toBe('errors: 1')

		wrapper.unmount()
	})

	it('уход со страницы снимает ожидание: ручной возвращается в idle', async () => {
		const { bench, wrapper, block, status } = setup()

		await rendered()
		await block('test/verdict').get('.pg-scenario__run').trigger('click')
		await vi.waitFor(() => expect(status('test/verdict')).toBe('waiting'))

		wrapper.unmount()
		await flushPromises()

		expect(status('test/verdict')).toBe('idle')
		expect(bench.stages.size).toBe(0)
	})
})

describe('ссылка в шапке', () => {
	it('ведёт на тесты и обратно на ту же страницу свойств', async () => {
		await router.push('/component/button')

		const wrapper = mount(AppHeader, mountOptions)
		const link = () => wrapper.get('.pg__switch')

		expect(link().text()).toBe('Тесты')

		await link().trigger('click')
		await flushPromises()

		expect(router.currentRoute.value.path).toBe(`/tests/${TOPICS[0].id}`)
		expect(link().text()).toBe('Свойства')

		await link().trigger('click')
		await flushPromises()

		expect(router.currentRoute.value.path).toBe('/component/button')

		wrapper.unmount()
	})
})
