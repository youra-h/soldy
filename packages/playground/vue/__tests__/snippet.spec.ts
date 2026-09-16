/**
 * Сниппет для колонки «Component Instance» обязан быть рабочим кодом.
 *
 * Раньше он писал `instance.mode = …` для любого пропа без разбора — а `mode`
 * существует не на компоненте, а на его коллекции. Вставленный в реальный
 * проект такой код падал бы или молча ничего не менял: у `TAccordion` нет
 * свойства `mode`.
 */

import { describe, it, expect } from 'vitest'
import type { TPropControl, TPropOwner } from '@soldy/playground-shared'
import { COMPONENTS } from '@soldy/playground-shared'
import { TAriaPlugin } from '@soldy/plugins'
import { propSnippet, instanceSnippet } from '../src/snippet'

/** Запись манифеста по id; без неё проверять нечего. */
function entryOf(id: string) {
	const entry = COMPONENTS.find((candidate) => candidate.id === id)

	if (!entry) throw new Error(`нет компонента «${id}»`)

	return entry
}

const accordion = entryOf('accordion')

/**
 * Владелец строки задаётся всегда: у плагинной вместе со `scope` приходит адрес
 * плагина, и подставленный по умолчанию `scope` разошёлся бы с ним.
 */
const control = (overrides: Partial<TPropControl> & TPropOwner): TPropControl => ({
	name: 'view',
	kind: 'text',
	description: '',
	...overrides,
})

describe('instanceSnippet', () => {
	it('свойство компонента пишет в сам инстанс', () => {
		const code = instanceSnippet(
			accordion,
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

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
		const code = instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			'multiple',
		)

		expect(code).toContain('const engine = createEngineSelection()')
		expect(code).toContain("engine.extensions.selection.mode = 'multiple'")
		expect(code).toContain(':engine="engine"')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain(':ctrl="instance"')
	})

	/**
	 * Плагинный проп — ни `instance.aria_label`, ни `instance.label`: таких
	 * свойств у инстанса нет. Плагин берут из bundle, который компонент отдаёт
	 * событием `bundle:create`, и пишут ему имя без неймспейса.
	 */
	it('свойство плагина пишет в плагин из bundle', () => {
		const code = instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			'Закрыть',
		)

		expect(code).toContain('const instance = new TButton()')
		expect(code).toContain("import { TPluginBundle, TAriaPlugin } from '@soldy/plugins'")
		expect(code).toContain("instance.events.on('bundle:create'")
		expect(code).toContain('const plugin = bundle.get(TAriaPlugin)')
		expect(code).toContain("plugin.label = 'Закрыть'")
		expect(code).toContain(':ctrl="instance"')
		expect(code).not.toContain('instance.aria_label')
		expect(code).not.toContain('instance.label')
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

/**
 * Пресет строки — соседние пропы, без которых её проп не виден. Превью их
 * получает, и код обязан тоже: иначе вставленный пример не повторит стенд.
 */
describe('пресет строки', () => {
	const select = entryOf('select')
	const preset = { editable: true, mode: 'multiple' }

	it('propSnippet пишет пресет рядом с самим пропом', () => {
		const code = propSnippet(select, 'removeOnBackspace', true, preset)

		expect(code).toContain(
			'<Select :editable="true" :mode="\'multiple\'" :removeOnBackspace="true" />',
		)
	})

	it('instanceSnippet пишет пресет разметкой рядом с ctrl', () => {
		const code = instanceSnippet(
			select,
			control({ name: 'removeOnBackspace', scope: 'component', preset }),
			true,
		)

		expect(code).toContain('instance.removeOnBackspace = true')
		expect(code).toContain('<Select :editable="true" :mode="\'multiple\'" :ctrl="instance" />')
	})

	it('без пресета разметка прежняя', () => {
		expect(propSnippet(select, 'open', true)).toContain('<Select :open="true" />')
	})
})
