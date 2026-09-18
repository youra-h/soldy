// @vitest-environment jsdom

/**
 * Раннер сценариев на поддельном хосте.
 *
 * Хост здесь — голый `div` на каждый сценарий, один на все его прогоны, как
 * сцена блока на странице. Экземпляр — объект со шпионом
 * `destroy`: раннер обязан работать без фреймворка и без компонентов, иначе
 * стенду следующего фреймворка его не взять. Сквозной прогон через настоящий
 * хост Vue — в `playground/vue/__tests__/scenarios.spec.ts`.
 */

import { describe, it, expect, vi, type Mock } from 'vitest'
import {
	TScenarioRunner,
	type IScenarioHost,
	type IScenarioJournal,
	type TInstance,
	type TScenario,
} from '../src'

type TFakeInstance = TInstance & { destroy: Mock<() => void> }

function setup(scenarios: TScenario[], timeout = 200) {
	const scenes = new Map<string, HTMLElement>()
	const journals = new Map<string, IScenarioJournal>()
	const instances: TFakeInstance[] = []
	const unmounted: string[] = []

	const host: IScenarioHost = {
		async mount({ scenario, journal }) {
			const scene = scenes.get(scenario.id) ?? document.createElement('div')

			scenes.set(scenario.id, scene)
			journals.set(scenario.id, journal)

			return scene
		},
		async unmount(id) {
			unmounted.push(id)
		},
	}

	const runner = new TScenarioRunner({
		host,
		scenarios,
		timeout,
		print: () => {},
		create: () => {
			const instance: TFakeInstance = { destroy: vi.fn<() => void>() }

			instances.push(instance)

			return instance
		},
	})

	/** Журнал текущего прогона — через него тест «нажимает» за человека. */
	function journal(id: string): IScenarioJournal {
		const found = journals.get(id)

		if (!found) throw new Error(`сценарий ${id} не монтировался`)

		return found
	}

	return { runner, scenes, instances, unmounted, journal }
}

/** Дождаться, пока раннер не доведёт сценарий до статуса. */
async function statusOf(runner: TScenarioRunner, id: string, status: string): Promise<void> {
	await vi.waitFor(() => expect(runner.state(id).status).toBe(status))
}

function auto(id: string, run: Extract<TScenario, { kind: 'auto' }>['run']): TScenario {
	return {
		id,
		component: 'button',
		topic: 'events',
		kind: 'auto',
		title: id,
		description: '',
		run,
	}
}

function manual(id: string, run?: Extract<TScenario, { kind: 'manual' }>['run']): TScenario {
	return {
		id,
		component: 'button',
		topic: 'events',
		kind: 'manual',
		title: id,
		description: '',
		steps: ['шаг'],
		run,
	}
}

describe('автоматический сценарий', () => {
	it('проходит, если ни одна проверка не упала', async () => {
		const { runner } = setup([
			auto('a', (ctx) => {
				ctx.check(true, 'первая')
				ctx.check(true, 'вторая')
			}),
		])

		await runner.run('a')

		expect(runner.state('a')).toEqual({
			status: 'passed',
			checks: [
				{ ok: true, text: 'первая' },
				{ ok: true, text: 'вторая' },
			],
		})
	})

	it('падает с текстом упавшей проверки и доходит до конца', async () => {
		const { runner } = setup([
			auto('a', (ctx) => {
				ctx.check(false, 'кнопка нажалась')
				ctx.check(true, 'после упавшей')
			}),
		])

		await runner.run('a')

		expect(runner.state('a').status).toBe('failed')
		expect(runner.state('a').checks).toEqual([
			{ ok: false, text: 'кнопка нажалась' },
			{ ok: true, text: 'после упавшей' },
		])
	})

	it('падает по лимиту, называя, чего не дождался', async () => {
		const { runner } = setup([auto('a', (ctx) => ctx.until(() => false, 'события press'))], 50)

		await runner.run('a')

		expect(runner.state('a').status).toBe('failed')
		expect(runner.state('a').error).toContain('не дождались')
		expect(runner.state('a').error).toContain('события press')
	})

	it('падает по лимиту и без ожиданий — зависнуть навсегда не может', async () => {
		const { runner } = setup([auto('a', () => new Promise<void>(() => {}))], 50)

		await runner.run('a')

		expect(runner.state('a')).toMatchObject({ status: 'failed', error: 'не уложился в 50 мс' })
	})

	it('исключение сценария — итог failed с текстом', async () => {
		const { runner } = setup([
			auto('a', () => {
				throw new Error('сломался')
			}),
		])

		await runner.run('a')

		expect(runner.state('a')).toMatchObject({ status: 'failed', error: 'сломался' })
	})
})

describe('ручной сценарий', () => {
	it('ждёт человека и засчитывается сам, когда условие выполнилось', async () => {
		const { runner, journal } = setup([
			manual('m', async (ctx) => {
				await ctx.events('action:press', 2)
				ctx.check(true, 'два нажатия')
			}),
		])

		const done = runner.run('m')

		await statusOf(runner, 'm', 'waiting')

		journal('m').record('action:press', [])
		journal('m').record('action:press', [])
		await done

		expect(runner.state('m')).toEqual({
			status: 'passed',
			checks: [{ ok: true, text: 'два нажатия' }],
		})
	})

	it('лимита у ручного нет: он ждёт дольше лимита автоматического', async () => {
		const { runner } = setup([manual('m', (ctx) => ctx.until(() => false, 'человека'))], 20)

		void runner.run('m')
		await new Promise((resolve) => setTimeout(resolve, 80))

		expect(runner.state('m').status).toBe('waiting')
	})

	it('без run ждёт только отметки: ✓ — прошёл', async () => {
		const { runner } = setup([manual('m')])

		const done = runner.run('m')

		await statusOf(runner, 'm', 'waiting')
		runner.mark('m', true)
		await done

		expect(runner.state('m')).toMatchObject({ status: 'passed', marked: true })
	})

	it('✗ роняет и снимает ожидание: условие, выполненное позже, итог не меняет', async () => {
		const { runner, journal } = setup([
			manual('m', async (ctx) => {
				await ctx.events('action:press')
				ctx.check(true, 'нажатие')
			}),
		])

		const done = runner.run('m')

		await statusOf(runner, 'm', 'waiting')
		runner.mark('m', false)
		await done

		journal('m').record('action:press', [])
		await new Promise((resolve) => setTimeout(resolve, 40))

		expect(runner.state('m')).toMatchObject({ status: 'failed', marked: true })
	})

	it('отметка только у ручного', () => {
		const { runner } = setup([auto('a', () => {})])

		expect(() => runner.mark('a', true)).toThrow()
	})
})

describe('перезапуск', () => {
	it('уничтожает прежний экземпляр после снятия сцены и заводит новый журнал', async () => {
		const { runner, instances, unmounted, journal } = setup([manual('m')])

		void runner.run('m')
		await statusOf(runner, 'm', 'waiting')

		const first = journal('m')

		void runner.run('m')
		await statusOf(runner, 'm', 'waiting')

		expect(instances).toHaveLength(2)
		expect(instances[0].destroy).toHaveBeenCalledOnce()
		expect(instances[1].destroy).not.toHaveBeenCalled()
		expect(unmounted).toEqual(['m'])
		expect(journal('m')).not.toBe(first)
	})

	it('запоздавший результат отменённого прогона статус не перетирает', async () => {
		const gates: Array<() => void> = []
		const { runner } = setup([
			auto('a', async (ctx) => {
				const index = gates.length

				await new Promise<void>((resolve) => gates.push(resolve))
				ctx.check(index === 1, `прогон ${index + 1}`)
			}),
		])

		void runner.run('a')
		await vi.waitFor(() => expect(gates).toHaveLength(1))

		const second = runner.run('a')

		await vi.waitFor(() => expect(gates).toHaveLength(2))

		// Первый прогон «доделался» — но его уже отменили
		gates[0]()
		await new Promise((resolve) => setTimeout(resolve, 20))

		expect(runner.state('a')).toEqual({ status: 'running', checks: [] })

		gates[1]()
		await second

		expect(runner.state('a')).toEqual({
			status: 'passed',
			checks: [{ ok: true, text: 'прогон 2' }],
		})
	})
})

describe('runAll', () => {
	it('гонит автоматические строго по очереди, ручные переводит в waiting', async () => {
		const order: string[] = []
		const step =
			(id: string) =>
			async (ctx: Parameters<Extract<TScenario, { kind: 'auto' }>['run']>[0]) => {
				order.push(`${id}:начало`)
				await ctx.pause(20)
				order.push(`${id}:конец`)
			}

		const { runner } = setup([auto('a', step('a')), manual('m'), auto('b', step('b'))])

		await runner.runAll(['a', 'm', 'b'])

		expect(order).toEqual(['a:начало', 'a:конец', 'b:начало', 'b:конец'])
		expect(runner.state('a').status).toBe('passed')
		expect(runner.state('b').status).toBe('passed')
		expect(runner.state('m').status).toBe('waiting')
	})
})

describe('сводка', () => {
	it('считает автоматические и ручные раздельно', async () => {
		const { runner } = setup([
			auto('ok', (ctx) => void ctx.check(true, 'да')),
			auto('bad', (ctx) => void ctx.check(false, 'нет')),
			manual('wait'),
			manual('yes'),
			manual('no'),
			auto('idle', () => {}),
		])

		await runner.run('ok')
		await runner.run('bad')
		void runner.run('wait')
		void runner.run('yes')
		runner.mark('yes', true)
		runner.mark('no', false)
		await statusOf(runner, 'wait', 'waiting')

		expect(runner.summary(['ok', 'bad', 'wait', 'yes', 'no', 'idle'])).toEqual({
			auto: { total: 3, passed: 1, failed: 1 },
			manual: { total: 3, passed: 1, waiting: 1, failed: 1 },
			failed: 2,
			passed: false,
		})
	})

	it('passed — только когда прошли все', async () => {
		const { runner } = setup([auto('a', () => {}), manual('m')])

		await runner.run('a')
		runner.mark('m', true)

		expect(runner.summary(['a', 'm']).passed).toBe(true)
		expect(runner.summary([]).passed).toBe(false)
	})
})

describe('release', () => {
	it('незаконченные возвращает в idle, законченным оставляет итог, экземпляры уничтожает', async () => {
		const { runner, instances, unmounted } = setup([auto('a', () => {}), manual('m')])

		await runner.run('a')
		const waiting = runner.run('m')

		await statusOf(runner, 'm', 'waiting')
		runner.release(['a', 'm'])
		await waiting

		expect(runner.state('a').status).toBe('passed')
		expect(runner.state('m').status).toBe('idle')

		await vi.waitFor(() => expect(unmounted.sort()).toEqual(['a', 'm']))
		expect(instances.every((instance) => instance.destroy.mock.calls.length === 1)).toBe(true)
	})

	it('обрывает runAll: следующие автоматические не стартуют', async () => {
		const started: string[] = []
		let finish = () => {}
		const { runner } = setup([
			auto('a', async () => {
				started.push('a')
				await new Promise<void>((resolve) => (finish = resolve))
			}),
			auto('b', () => void started.push('b')),
		])

		const all = runner.runAll(['a', 'b'])

		await vi.waitFor(() => expect(started).toEqual(['a']))
		runner.release(['a', 'b'])
		finish()
		await all

		expect(started).toEqual(['a'])
		expect(runner.state('b').status).toBe('idle')
	})
})

describe('контекст', () => {
	it('resize задаёт сцене ширину, новый прогон стартует с чистой', async () => {
		let widths: string[] = []
		const { runner, scenes } = setup([
			auto('a', (ctx) => {
				widths.push(ctx.scene.style.width)
				ctx.resize(120)
				widths.push(ctx.scene.style.width)
			}),
		])

		await runner.run('a')

		expect(widths).toEqual(['', '120px'])
		expect(scenes.get('a')?.style.width).toBe('120px')

		widths = []
		await runner.run('a')

		expect(widths).toEqual(['', '120px'])
	})

	it('signal снимает нативные слушатели в конце прогона', async () => {
		const heard: string[] = []
		const { runner, scenes } = setup([
			auto('a', (ctx) => {
				ctx.scene.addEventListener('click', () => heard.push('click'), {
					signal: ctx.signal,
				})
				ctx.scene.click()
			}),
		])

		await runner.run('a')
		scenes.get('a')?.click()

		expect(heard).toEqual(['click'])
	})
})
