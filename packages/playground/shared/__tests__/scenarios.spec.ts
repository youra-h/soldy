/**
 * Реестр сценариев страницы тестов.
 *
 * Сами сценарии в CI не идут: упавший сценарий — найденная проблема
 * компонента, а не сломанная сборка. Здесь проверяется только то, без чего
 * реестр молча врёт: дубль id склеил бы два блока в один статус, опечатка в
 * компоненте или теме убрала бы сценарий из меню, а ручной без шагов не
 * говорит человеку, что делать.
 */

import { describe, it, expect } from 'vitest'
import { COMPONENTS } from '../src/registry'
import { SCENARIOS, TOPICS } from '../src/scenarios'

describe('реестр сценариев', () => {
	it('id уникальны', () => {
		const ids = SCENARIOS.map((scenario) => scenario.id)

		expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
	})

	it('компонент каждого сценария есть в реестре', () => {
		const known = new Set(COMPONENTS.map((entry) => entry.id))

		expect(SCENARIOS.filter((scenario) => !known.has(scenario.component))).toEqual([])
	})

	it('тема каждого сценария известна', () => {
		const known = new Set(TOPICS.map((topic) => topic.id))

		expect(SCENARIOS.filter((scenario) => !known.has(scenario.topic))).toEqual([])
	})

	it('у ручного есть шаги, у автоматического — нет', () => {
		const broken = SCENARIOS.filter((scenario) =>
			scenario.kind === 'manual' ? !scenario.steps.length : scenario.steps !== undefined,
		).map((scenario) => scenario.id)

		expect(broken).toEqual([])
	})
})
