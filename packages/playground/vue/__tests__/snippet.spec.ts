/**
 * Сниппет для колонки «Component Instance» обязан быть рабочим кодом.
 *
 * Раньше он писал `instance.mode = …` для любого пропа без разбора — а `mode`
 * существует не на компоненте, а на его коллекции. Вставленный в реальный
 * проект такой код падал бы или молча ничего не менял: у `TAccordion` нет
 * свойства `mode`.
 */

import { describe, it, expect } from 'vitest'
import type { TPropControl, TPropOwner } from '@soldy-ui/playground-shared'
import { COMPONENTS } from '@soldy-ui/playground-shared'
import { TAriaPlugin } from '@soldy-ui/plugins'
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
	 * Коллекция календаря движка снаружи не берёт: дни кладёт в неё вид. До её
	 * фасада проп доносит разметка рядом с `ctrl` — так его передаёт и сам
	 * стенд, — а движка и `:engine` в коде нет.
	 */
	it('коллекционное свойство без движка снаружи — разметкой рядом с ctrl', () => {
		const code = instanceSnippet(
			entryOf('calendar'),
			control({ name: 'mode', scope: 'collection' }),
			'range',
		)

		expect(code).toContain('const instance = new TCalendar()')
		expect(code).toContain('<Calendar :mode="\'range\'" :ctrl="instance" />')
		expect(code).not.toContain('engine')
		expect(code).not.toContain('instance.mode')
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
		expect(code).toContain("import { TPluginBundle, TAriaPlugin } from '@soldy-ui/plugins'")
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

/**
 * Пустое поле — проп не задан: превью его не получает, экземпляр остаётся на
 * умолчании, и код говорит то же. Раньше разметка оставляла голое имя — у
 * булева пропа Vue читает его как `true`, — а экземпляру присваивалось `true`.
 * Литерала умолчания в коде тоже нет: свежий экземпляр уже на нём стоит.
 */
describe.each([
	['стёртое текстовое поле', ''],
	['стёртое числовое поле или снятый выбор', undefined],
])('пустое поле — %s', (_name, value) => {
	const progressLinear = entryOf('progress-linear')
	const preset = { value: 40 }

	it('propSnippet не пишет атрибут пропа, пресет на месте', () => {
		const code = propSnippet(progressLinear, 'max', value, preset)

		expect(code).toContain('\t<ProgressLinear :value="40" />')
		expect(code).not.toContain('max')
	})

	it('свойство компонента: экземпляр без присваивания, пресет рядом с ctrl', () => {
		const code = instanceSnippet(
			progressLinear,
			control({ name: 'max', scope: 'component', preset }),
			value,
		)

		expect(code).toContain('const instance = new TProgressLinear()\n</script>')
		expect(code).not.toContain('max')
		expect(code).toContain('\t<ProgressLinear :value="40" :ctrl="instance" />')
	})

	it('коллекционное свойство: движок без присваивания', () => {
		const code = instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			value,
		)

		expect(code).toContain('const engine = createEngineSelection()\n</script>')
		expect(code).not.toContain('mode')
		expect(code).toContain('\t<Accordion :engine="engine" />')
	})

	/**
	 * Писать в плагин нечего, и вместе с записью уходят подписка на bundle и
	 * импорт плагина: остаётся экземпляр, который превью получает пропом.
	 */
	it('свойство плагина: ни подписки на bundle, ни импорта плагина', () => {
		const code = instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			value,
		)

		expect(code).toBe(
			[
				'<script setup lang="ts">',
				"import { Button } from '@soldy-ui/vue'",
				"import { TButton } from '@soldy-ui/core'",
				'',
				'const instance = new TButton()',
				'</script>',
				'',
				'<template>',
				'\t<Button :ctrl="instance" />',
				'</template>',
			].join('\n'),
		)
	})
})
