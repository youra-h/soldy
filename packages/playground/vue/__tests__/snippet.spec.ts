/**
 * Сниппет для колонки «Component Instance» обязан быть рабочим кодом.
 *
 * Раньше он писал `instance.mode = …` для любого пропа без разбора — а `mode`
 * существует не на компоненте, а на его коллекции. Вставленный в реальный
 * проект такой код падал бы или молча ничего не менял: у `TAccordion` нет
 * свойства `mode`.
 */

import { describe, it, expect } from 'vitest'
import type { TComponentEntry, TPropControl } from '@soldy/playground-shared'
import { COMPONENTS } from '@soldy/playground-shared'
import { propSnippet, instanceSnippet } from '../src/snippet'

const accordion = COMPONENTS.find((entry) => entry.id === 'accordion')!

const control = (overrides: Partial<TPropControl>): TPropControl => ({
	name: 'view',
	kind: 'text',
	description: '',
	scope: 'component',
	...overrides,
})

describe('instanceSnippet', () => {
	it('свойство компонента пишет в сам инстанс', () => {
		const code = instanceSnippet(accordion, control({ name: 'view', scope: 'component' }), 'plain')

		expect(code).toContain('const instance = new TAccordion()')
		expect(code).toContain("instance.view = 'plain'")
		expect(code).toContain(':ctrl="instance"')
		expect(code).not.toContain('createEngineSelection')
	})

	/**
	 * `mode` — коллекционный проп: второй способ управления идёт не через
	 * `instance.mode`, а через движок, переданный пропом `:engine` — тот же
	 * механизм, каким сам стенд управляет правой колонкой (`PropRow.vue`).
	 */
	it('коллекционное свойство пишет в движок, а не в компонент', () => {
		const code = instanceSnippet(accordion, control({ name: 'mode', scope: 'collection' }), 'multiple')

		expect(code).toContain('const engine = createEngineSelection()')
		expect(code).toContain("engine.extensions.selection.mode = 'multiple'")
		expect(code).toContain(':engine="engine"')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain(':ctrl="instance"')
	})
})

/**
 * `propSnippet` веток по scope не делает — и не должен: пропом что компонентное,
 * что коллекционное свойство передаётся одинаково, потому что Vue-адаптер
 * склеивает оба набора пропов в один (`base.component.ts`).
 */
describe('propSnippet', () => {
	it('коллекционное свойство передаётся обычным пропом', () => {
		const code = propSnippet(accordion, 'mode', 'multiple')

		expect(code).toContain(':mode="\'multiple\'"')
	})
})
