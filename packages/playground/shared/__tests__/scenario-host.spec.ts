// @vitest-environment jsdom

/**
 * Хост сценариев на поддельном хосте превью.
 *
 * Хост сценариев общий для всех фреймворков: монтирует хостом превью в узел
 * сцены, пишет события в журнал, снимает компонент. Поддельный хост превью
 * помнит, что и куда ему смонтировали, и кладёт в узел метку — так видно, что
 * компонент попал в узел монтирования, а сцена ушла сценарию. Сквозной прогон
 * через настоящие хосты — в `playground/vue/__tests__/scenarios.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TScenarioHost,
	TScenarioJournal,
	TScenarioRunner,
	isPreviewHost,
	isPreviewHostModule,
	type IPreviewHost,
	type IPreviewSnippets,
	type TInstance,
	type TPreviewMount,
	type TScenario,
	type TSceneNodes,
} from '../src'

/** Что смонтировал поддельный хост: куда, что и снято ли. */
type TMounted = {
	node: HTMLElement
	mount: TPreviewMount
	updates: Readonly<Record<string, unknown>>[]
	unmounted: boolean
}

function fakeHost(): { host: IPreviewHost; mounted: TMounted[] } {
	const mounted: TMounted[] = []

	const host: IPreviewHost = {
		previews: ['button'],
		fixtures: ['button-slot-labels'],
		mount(node, mount) {
			const record: TMounted = { node, mount, updates: [], unmounted: false }
			const probe = document.createElement('span')

			probe.className = 'probe'
			node.append(probe)
			mounted.push(record)

			return {
				update: (props) => record.updates.push(props),
				unmount: () => {
					record.unmounted = true
					probe.remove()
				},
			}
		},
		setLocale: () => {},
	}

	return { host, mounted }
}

/** Блок сценария: сцена и пустой узел монтирования в ней. */
function block(): TSceneNodes {
	const scene = document.createElement('div')
	const target = document.createElement('div')

	scene.append(target)

	return { scene, target }
}

const scenario: TScenario = {
	id: 'button/test',
	component: 'button',
	topic: 'events',
	kind: 'auto',
	title: 'тест',
	description: '',
	props: { text: 'До' },
	run: () => {},
}

const instance: TInstance = { text: 'До' }

describe('хост сценариев', () => {
	it('монтирует в узел сцены пропы сценария с ctrl и отдаёт сцену', async () => {
		const { host, mounted } = fakeHost()
		const scenes = new TScenarioHost(host)
		const nodes = block()

		scenes.attach(scenario.id, nodes)

		const scene = await scenes.mount({
			scenario: { ...scenario, fixture: 'button-slot-labels' },
			instance,
			journal: new TScenarioJournal(scenario.id, () => {}),
		})

		expect(scene).toBe(nodes.scene)
		expect(mounted).toHaveLength(1)
		expect(mounted[0].node).toBe(nodes.target)
		expect(mounted[0].mount.component).toBe('button')
		expect(mounted[0].mount.fixture).toBe('button-slot-labels')
		expect(mounted[0].mount.props).toEqual({ text: 'До', ctrl: instance })
		expect(nodes.scene.querySelector('.probe')).not.toBeNull()
	})

	it('события компонента — в журнал прогона', async () => {
		const { host, mounted } = fakeHost()
		const scenes = new TScenarioHost(host)
		const journal = new TScenarioJournal(scenario.id, () => {})

		scenes.attach(scenario.id, block())
		await scenes.mount({ scenario, instance, journal })

		mounted[0].mount.onEvent?.('change:text', [{ newValue: 'После' }])

		expect(journal.count('change:text')).toBe(1)
		expect(journal.last('change:text')).toEqual([{ newValue: 'После' }])
	})

	it('без блока на странице — ошибка, а не тихая пустая сцена', async () => {
		const scenes = new TScenarioHost(fakeHost().host)

		await expect(
			scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) }),
		).rejects.toThrow('нет блока на странице')
	})

	it('unmount снимает компонент, повторный — ничего', async () => {
		const { host, mounted } = fakeHost()
		const stage = vi.fn<(id: string, staged: boolean) => void>()
		const scenes = new TScenarioHost(host, { onStage: stage })
		const nodes = block()

		scenes.attach(scenario.id, nodes)
		await scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) })

		expect(stage.mock.calls).toEqual([[scenario.id, true]])

		await scenes.unmount(scenario.id)
		await scenes.unmount(scenario.id)

		expect(mounted[0].unmounted).toBe(true)
		expect(nodes.scene.querySelector('.probe')).toBeNull()
		expect(stage.mock.calls).toEqual([
			[scenario.id, true],
			[scenario.id, false],
		])
	})

	it('новое монтирование того же сценария сначала снимает прежнее', async () => {
		const { host, mounted } = fakeHost()
		const scenes = new TScenarioHost(host)

		scenes.attach(scenario.id, block())
		await scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) })
		await scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) })

		expect(mounted.map((record) => record.unmounted)).toEqual([true, false])
	})

	it('detach чужой сцены блок не снимает', async () => {
		const scenes = new TScenarioHost(fakeHost().host)
		const nodes = block()

		scenes.attach(scenario.id, nodes)
		scenes.detach(scenario.id, block().scene)

		await expect(
			scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) }),
		).resolves.toBe(nodes.scene)

		scenes.detach(scenario.id, nodes.scene)

		await expect(
			scenes.mount({ scenario, instance, journal: new TScenarioJournal(scenario.id) }),
		).rejects.toThrow('нет блока на странице')
	})

	/**
	 * Раннер с этим хостом — то же, что на странице: событие компонента
	 * доходит до сценария, перезапуск и уход снимают сцену.
	 */
	it('раннер доводит прогон до итога через хост превью', async () => {
		const { host, mounted } = fakeHost()
		const scenes = new TScenarioHost(host)
		const runner = new TScenarioRunner({
			host: scenes,
			print: () => {},
			create: () => ({ text: 'До' }),
			scenarios: [
				{
					...scenario,
					run: async (ctx) => {
						mounted[0].mount.onEvent?.('change:text', [{ newValue: 'После' }])
						ctx.check(ctx.journal.count('change:text') === 1, 'change:text в журнале')
						ctx.check(ctx.scene.querySelector('.probe') !== null, 'компонент на сцене')
					},
				},
			],
		})

		scenes.attach(scenario.id, block())
		await runner.run(scenario.id)

		expect(runner.state(scenario.id).status).toBe('passed')
		expect(mounted[0].unmounted).toBe(false)

		runner.release([scenario.id])

		await vi.waitFor(() => expect(mounted[0].unmounted).toBe(true))
	})
})

describe('сторож модуля хоста', () => {
	const { host } = fakeHost()
	const snippets: IPreviewSnippets = {
		extension: 'tsx',
		propSnippet: () => '',
		instanceSnippet: () => '',
	}

	it('хост — экспорт по умолчанию', () => {
		expect(isPreviewHostModule({ default: host })).toBe(true)
		expect(isPreviewHostModule({ default: { ...host, snippets: undefined } })).toBe(true)
		expect(isPreviewHostModule({ default: { ...host, snippets } })).toBe(true)
	})

	it('модуль без хоста или с неполным хостом — не модуль хоста', () => {
		expect(isPreviewHostModule(null)).toBe(false)
		expect(isPreviewHostModule({ host })).toBe(false)
		expect(isPreviewHostModule({ default: { ...host, mount: undefined } })).toBe(false)
		expect(isPreviewHostModule({ default: { ...host, previews: [1] } })).toBe(false)
		expect(
			isPreviewHost({ ...host, snippets: { ...snippets, instanceSnippet: undefined } }),
		).toBe(false)
	})

	/**
	 * Расширение файла примера — часть кода колонок: «Открыть в VS Code» пишет
	 * код в файл с ним, и эндпоинт стенда берёт только известные.
	 */
	it('код колонок без расширения файла или с неизвестным — не хост', () => {
		expect(isPreviewHost({ ...host, snippets: { ...snippets, extension: undefined } })).toBe(
			false,
		)
		expect(isPreviewHost({ ...host, snippets: { ...snippets, extension: 'jsx' } })).toBe(false)
		expect(isPreviewHost({ ...host, snippets: { ...snippets, extension: 'vue' } })).toBe(true)
	})
})
