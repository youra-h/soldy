/**
 * Фабрика опроса событий.
 *
 * Сами сценарии опроса в CI не идут (упавший — находка, а не сломанная
 * сборка). Проверяется, что фабрика берёт ровно те пропы и ждёт ровно те
 * события, что объявлены в дескрипторе: иначе опрос молча проверял бы не то.
 */

import { describe, it, expect } from 'vitest'
import { underscorePropNaming, type IComponentDescriptor } from '@soldy-ui/setup'
import { findComponent } from '../src/registry'
import { propControls } from '../src/props'
import { eventsPoll, pollTargets } from '../src/scenarios'
import type { TComponentEntry } from '../src/types'

function button(): TComponentEntry {
	const entry = findComponent('button')

	if (!entry) throw new Error('нет button в реестре')

	return entry
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
