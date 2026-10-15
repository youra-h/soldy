import { describe, it, expect } from 'vitest'
import * as core from '@soldy-ui/core'

/**
 * Сторож правила «Префикс — только в глобальном пространстве имён» (AGENTS.md):
 * блок CSS компонента (`baseClass`) — глобальное имя библиотеки, и префикс у
 * него тот же `so`, что у Custom Elements, селекторов Angular и событий.
 *
 * Обходятся все классы экспорта ядра, у которых есть `baseClass`, и новый
 * компонент попадает под проверку сам. Без сторожа компонент из ветки, открытой
 * до перехода классов на `so-`, вернул бы прежний префикс после слияния с
 * `main` молча: юнит-тесты CSS не грузят, а тема такой блок не стилизует.
 */
describe('префикс блока CSS', () => {
	it('baseClass каждого класса экспорта ядра начинается с so-', () => {
		const blocks = Object.entries(core).flatMap(([name, value]) =>
			typeof value === 'function' &&
			'baseClass' in value &&
			typeof value.baseClass === 'string'
				? [{ name, block: value.baseClass }]
				: [],
		)

		expect(blocks.length, 'классов с baseClass в экспорте не нашлось').toBeGreaterThan(30)
		expect(
			blocks
				.filter(({ block }) => !block.startsWith('so-'))
				.map(({ name, block }) => `${name}: ${block}`),
		).toEqual([])
	})
})
