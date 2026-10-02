// @vitest-environment jsdom

/**
 * Фабрика опроса событий.
 *
 * Сами сценарии опроса в CI не идут (упавший — находка, а не сломанная
 * сборка). Проверяется, что фабрика берёт ровно те пропы и ждёт ровно те
 * события, что объявлены в дескрипторе: иначе опрос молча проверял бы не то.
 *
 * Окружение jsdom — ради сцены, которую хост отдаёт раннеру: прогон опроса
 * поля «число или текст» идёт через раннер на поддельном хосте.
 */

import { describe, it, expect } from 'vitest'
import { isEventSource } from '@soldy-ui/core'
import { underscorePropNaming, type IComponentDescriptor } from '@soldy-ui/setup'
import { findComponent } from '../src/registry'
import { propControls } from '../src/props'
import { TScenarioRunner, eventsPoll, pollTargets, type IScenarioHost } from '../src/scenarios'
import { createInstance } from '../src/instance'
import type { TComponentEntry } from '../src/types'

function entryOf(id: string): TComponentEntry {
	const entry = findComponent(id)

	if (!entry) throw new Error(`нет ${id} в реестре`)

	return entry
}

function button(): TComponentEntry {
	return entryOf('button')
}

/**
 * Button, у которого с одного пропа сняты триггеры. У настоящих компонентов
 * записываемых пропов без триггеров сейчас нет, а правило фабрики проверить
 * надо. Прототип сохраняется: дескриптор — экземпляр класса.
 */
function withoutTriggers(prop: string): TComponentEntry {
	const entry = button()

	return {
		...entry,
		descriptor: (): IComponentDescriptor => {
			const descriptor = entry.descriptor()

			return Object.assign(Object.create(Object.getPrototypeOf(descriptor)), descriptor, {
				props: descriptor.props.map((declaration) =>
					underscorePropNaming(declaration.name) === prop
						? { ...declaration, triggers: [] }
						: declaration,
				),
			})
		},
	}
}

describe('опрос событий', () => {
	it('Button: по сценарию на каждый записываемый компонентный проп с триггерами', () => {
		const entry = button()
		const declarations = entry.descriptor().props
		const expected = propControls(entry)
			.componentControls.map((control) => control.name)
			.filter((name) =>
				declarations.some(
					(prop) => underscorePropNaming(prop.name) === name && prop.triggers?.length,
				),
			)

		expect(expected.length).toBeGreaterThan(0)
		expect(eventsPoll(entry).map((scenario) => scenario.id)).toEqual(
			expected.map((name) => `button/events/poll-${name}`),
		)
	})

	it('ждёт полные имена триггеров из декларации', () => {
		const targets = new Map(
			pollTargets(button()).map((target) => [target.control.name, target.triggers]),
		)

		expect(targets.get('text')).toEqual(['change:text'])
		expect(targets.get('disabled')).toEqual(['change:disabled'])
		expect(targets.get('view')).toEqual(['change:view'])
	})

	it('проп без триггеров сценария не получает', () => {
		const names = pollTargets(withoutTriggers('view')).map((target) => target.control.name)

		expect(names).not.toContain('view')
		expect(names).toContain('text')
	})

	it('сценарии опроса — автоматические в теме events', () => {
		for (const scenario of eventsPoll(button())) {
			expect(scenario).toMatchObject({ kind: 'auto', topic: 'events', component: 'button' })
		}
	})
})

/**
 * Поле «число или текст» опрос пишет числом, как числовое. Без своего случая
 * он записал бы `undefined`: `offset` окна и так не задан, свойство не
 * сменилось бы, и `change:offset` не пришло бы ни разу.
 *
 * Прогон через раннер на поддельном хосте: журнал ведёт подписка на шину
 * экземпляра — так события получил бы потребитель.
 */
describe('опрос поля «число или текст»', () => {
	it('offset у Dialog получает число, change:offset приходит один раз', async () => {
		const dialog = entryOf('dialog')
		const scenario = eventsPoll(dialog).find(
			(candidate) => candidate.id === 'dialog/events/poll-offset',
		)

		if (!scenario) throw new Error('нет опроса offset у Dialog')

		const instance = createInstance(dialog)

		const host: IScenarioHost = {
			async mount({ journal }) {
				const events = instance.events

				if (isEventSource(events)) {
					events.on('change:offset', (...args) => journal.record('change:offset', args))
				}

				return document.createElement('div')
			},
			async unmount() {},
		}

		const runner = new TScenarioRunner({
			host,
			scenarios: [scenario],
			create: () => instance,
			print: () => {},
		})

		await runner.run(scenario.id)

		expect(runner.state(scenario.id)).toMatchObject({ status: 'passed' })
		expect(instance.offset).toBe(1)
	})
})
