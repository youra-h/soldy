/**
 * Сниппет для колонки «Component Instance» обязан быть рабочим кодом.
 *
 * Раньше он писал `instance.mode = …` для любого пропа без разбора — а `mode`
 * существует не на компоненте, а на его коллекции. Вставленный в реальный
 * проект такой код падал бы или молча ничего не менял: у `TAccordion` нет
 * свойства `mode`.
 *
 * Код колонок пишет хост фреймворка — хосты Vue и React, полученные
 * загрузчиком, как их получает оболочка. Случаи у них одни, синтаксис свой.
 */

import { describe, it, expect } from 'vitest'
import type { IPreviewSnippets, TPropControl, TPropOwner } from '@soldy-ui/playground-shared'
import { COMPONENTS } from '@soldy-ui/playground-shared'
import { TAriaPlugin } from '@soldy-ui/plugins'
import { loadHost } from '../src/hosts'

/** Код колонок хоста; без него проверять нечего. */
async function snippetsOf(framework: string): Promise<IPreviewSnippets> {
	const { snippets } = await loadHost(framework)

	if (!snippets) throw new Error(`у хоста ${framework} нет кода колонок`)

	return snippets
}

const [vue, react] = await Promise.all([snippetsOf('vue'), snippetsOf('react')])

const { propSnippet, instanceSnippet } = vue

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

describe('Vue: instanceSnippet', () => {
	it('свойство компонента пишет в сам инстанс', () => {
		const code = instanceSnippet(
			accordion,
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

		expect(code).toContain('const instance = new TAccordion()')
		expect(code).toContain("instance.view = 'plain'")
		expect(code).toContain(':ctrl="instance"')
		expect(code).not.toContain('createEngine')
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

		expect(code).toContain('const engine = createEngineAccordion()')
		expect(code).toContain("engine.extensions.selection.mode = 'multiple'")
		expect(code).toContain(':engine="engine"')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain(':ctrl="instance"')
	})

	/**
	 * Движок — сборщиком самого компонента: у календаря выбор свой, дат, и
	 * общий уровень `createEngineSelection` поставил бы на его место чужой.
	 */
	it('у календаря — его сборщик движка', () => {
		const code = instanceSnippet(
			entryOf('calendar'),
			control({ name: 'mode', scope: 'collection' }),
			'range',
		)

		expect(code).toContain("import { createEngineCalendar } from '@soldy-ui/core'")
		expect(code).toContain('const engine = createEngineCalendar()')
		expect(code).toContain("engine.extensions.selection.mode = 'range'")
		expect(code).toContain('<Calendar :engine="engine" />')
		expect(code).not.toContain('createEngineSelection')
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
describe('Vue: propSnippet', () => {
	it('коллекционное свойство передаётся обычным пропом', () => {
		const code = propSnippet(accordion, 'mode', 'multiple')

		expect(code).toContain(':mode="\'multiple\'"')
	})
})

/**
 * Пресет строки — соседние пропы, без которых её проп не виден. Превью их
 * получает, и код обязан тоже: иначе вставленный пример не повторит стенд.
 */
describe('Vue: пресет строки', () => {
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
])('Vue: пустое поле — %s', (_name, value) => {
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

		expect(code).toContain('const engine = createEngineAccordion()\n</script>')
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

/**
 * Код React — те же случаи синтаксисом JSX: пример — функциональный компонент,
 * строка в кавычках, остальное в `{}`. Экземпляр и движок — один на
 * монтирование: `useState` с инициализатором, и запись свойства там же, до
 * первой отрисовки, а не на каждой.
 */
describe('React: instanceSnippet', () => {
	it('свойство компонента пишет в инстанс — в инициализаторе useState', () => {
		const code = react.instanceSnippet(
			accordion,
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

		expect(code).toBe(
			[
				"import { useState } from 'react'",
				"import { Accordion } from '@soldy-ui/react'",
				"import { TAccordion } from '@soldy-ui/core'",
				'',
				'export function Example() {',
				'\tconst [instance] = useState(() => {',
				'\t\tconst instance = new TAccordion()',
				'',
				"\t\tinstance.view = 'plain'",
				'',
				'\t\treturn instance',
				'\t})',
				'',
				'\treturn <Accordion ctrl={instance} />',
				'}',
			].join('\n'),
		)
	})

	it('коллекционное свойство пишет в движок, а не в компонент', () => {
		const code = react.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			'multiple',
		)

		expect(code).toContain('\t\tconst engine = createEngineAccordion()')
		expect(code).toContain("\t\tengine.extensions.selection.mode = 'multiple'")
		expect(code).toContain('<Accordion engine={engine} />')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain('ctrl={instance}')
	})

	it('у календаря — его сборщик движка', () => {
		const code = react.instanceSnippet(
			entryOf('calendar'),
			control({ name: 'mode', scope: 'collection' }),
			'range',
		)

		expect(code).toContain("import { createEngineCalendar } from '@soldy-ui/core'")
		expect(code).toContain('const engine = createEngineCalendar()')
		expect(code).toContain("engine.extensions.selection.mode = 'range'")
		expect(code).toContain('<Calendar engine={engine} />')
		expect(code).not.toContain('createEngineSelection')
	})

	/** Подписка на bundle — тоже в инициализаторе: один раз на экземпляр. */
	it('свойство плагина пишет в плагин из bundle', () => {
		const code = react.instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			'Закрыть',
		)

		expect(code).toContain('\t\tconst instance = new TButton()')
		expect(code).toContain("import { TPluginBundle, TAriaPlugin } from '@soldy-ui/plugins'")
		expect(code).toContain("\t\tinstance.events.on('bundle:create', (bundle: unknown) => {")
		expect(code).toContain('\t\t\tconst plugin = bundle.get(TAriaPlugin)')
		expect(code).toContain("\t\t\tif (plugin) plugin.label = 'Закрыть'")
		expect(code).toContain('<Button ctrl={instance} />')
		expect(code).not.toContain('instance.aria_label')
		expect(code).not.toContain('instance.label')
	})

	it('строка в коде — в одинарных кавычках, с экранированием', () => {
		const code = react.instanceSnippet(
			entryOf('button'),
			control({ name: 'text', scope: 'component' }),
			"It's",
		)

		expect(code).toContain("instance.text = 'It\\'s'")
	})
})

describe('React: propSnippet', () => {
	it('пример — компонент с JSX: импорт из адаптера, проп атрибутом', () => {
		expect(react.propSnippet(entryOf('button'), 'view', 'plain')).toBe(
			[
				"import { Button } from '@soldy-ui/react'",
				'',
				'export function Example() {',
				'\treturn <Button view="plain" />',
				'}',
			].join('\n'),
		)
	})

	it('коллекционное свойство передаётся обычным пропом', () => {
		expect(react.propSnippet(accordion, 'mode', 'multiple')).toContain(
			'<Accordion mode="multiple" />',
		)
	})

	it('число и булево — выражением в {}', () => {
		const progressLinear = entryOf('progress-linear')

		expect(react.propSnippet(progressLinear, 'max', 50)).toContain(
			'<ProgressLinear max={50} />',
		)
		expect(react.propSnippet(progressLinear, 'indeterminate', true)).toContain(
			'<ProgressLinear indeterminate={true} />',
		)
	})

	/**
	 * Строка JSX не знает экранирования: кавычка оборвала бы её, а `&amp;`
	 * JSX прочёл бы как `&`. Такая строка уходит выражением.
	 */
	it('строка с кавычкой или & — выражением', () => {
		const button = entryOf('button')

		expect(react.propSnippet(button, 'text', 'Он сказал "да"')).toContain(
			`<Button text={'Он сказал "да"'} />`,
		)
		expect(react.propSnippet(button, 'text', 'A &amp; B')).toContain(
			`<Button text={'A &amp; B'} />`,
		)
	})
})

describe('React: пресет строки', () => {
	const select = entryOf('select')
	const preset = { editable: true, mode: 'multiple' }

	it('propSnippet пишет пресет рядом с самим пропом', () => {
		const code = react.propSnippet(select, 'removeOnBackspace', true, preset)

		expect(code).toContain(
			'<Select editable={true} mode="multiple" removeOnBackspace={true} />',
		)
	})

	it('instanceSnippet пишет пресет разметкой рядом с ctrl', () => {
		const code = react.instanceSnippet(
			select,
			control({ name: 'removeOnBackspace', scope: 'component', preset }),
			true,
		)

		expect(code).toContain('instance.removeOnBackspace = true')
		expect(code).toContain('<Select editable={true} mode="multiple" ctrl={instance} />')
	})

	it('без пресета разметка прежняя', () => {
		expect(react.propSnippet(select, 'open', true)).toContain('<Select open={true} />')
	})
})

describe.each([
	['стёртое текстовое поле', ''],
	['стёртое числовое поле или снятый выбор', undefined],
])('React: пустое поле — %s', (_name, value) => {
	const progressLinear = entryOf('progress-linear')
	const preset = { value: 40 }

	it('propSnippet не пишет атрибут пропа, пресет на месте', () => {
		const code = react.propSnippet(progressLinear, 'max', value, preset)

		expect(code).toContain('\treturn <ProgressLinear value={40} />')
		expect(code).not.toContain('max')
	})

	it('свойство компонента: инициализатор только создаёт, пресет рядом с ctrl', () => {
		const code = react.instanceSnippet(
			progressLinear,
			control({ name: 'max', scope: 'component', preset }),
			value,
		)

		expect(code).toContain('\tconst [instance] = useState(() => new TProgressLinear())')
		expect(code).not.toContain('max')
		expect(code).toContain('\treturn <ProgressLinear value={40} ctrl={instance} />')
	})

	it('коллекционное свойство: движок без присваивания', () => {
		const code = react.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			value,
		)

		expect(code).toContain('\tconst [engine] = useState(() => createEngineAccordion())')
		expect(code).not.toContain('mode')
		expect(code).toContain('\treturn <Accordion engine={engine} />')
	})

	it('свойство плагина: ни подписки на bundle, ни импорта плагина', () => {
		const code = react.instanceSnippet(
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
				"import { useState } from 'react'",
				"import { Button } from '@soldy-ui/react'",
				"import { TButton } from '@soldy-ui/core'",
				'',
				'export function Example() {',
				'\tconst [instance] = useState(() => new TButton())',
				'',
				'\treturn <Button ctrl={instance} />',
				'}',
			].join('\n'),
		)
	})
})

/**
 * Файл примера — синтаксиса хоста: «Открыть в VS Code» пишет код Vue в `.vue`,
 * а код React — в `.tsx`, иначе редактор не прочёл бы его как код.
 */
describe('файл примера', () => {
	it('расширение — синтаксиса хоста', () => {
		expect([vue.extension, react.extension]).toEqual(['vue', 'tsx'])
	})
})
