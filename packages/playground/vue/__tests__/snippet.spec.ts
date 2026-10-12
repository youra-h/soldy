/**
 * Сниппет для колонки «Component Instance» обязан быть рабочим кодом.
 *
 * Раньше он писал `instance.mode = …` для любого пропа без разбора — а `mode`
 * существует не на компоненте, а на его коллекции. Вставленный в реальный
 * проект такой код падал бы или молча ничего не менял: у `TAccordion` нет
 * свойства `mode`.
 *
 * Код колонок пишет хост фреймворка — хосты Vue, React, Svelte, Solid и Web
 * Components, полученные загрузчиком, как их получает оболочка. Случаи у них
 * одни, синтаксис свой.
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

const [vue, react, svelte, solid, webc] = await Promise.all([
	snippetsOf('vue'),
	snippetsOf('react'),
	snippetsOf('svelte'),
	snippetsOf('solid'),
	snippetsOf('webc'),
])

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
 * Код Svelte — те же случаи синтаксисом компонента `.svelte`: скрипт с
 * импортами и телом, под ним разметка. Скрипт выполняется один раз на
 * монтирование, поэтому экземпляр и движок — обычные константы, и запись
 * свойства — там же, до первой отрисовки.
 */
describe('Svelte: instanceSnippet', () => {
	it('свойство компонента пишет в инстанс — в скрипте компонента', () => {
		const code = svelte.instanceSnippet(
			accordion,
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

		expect(code).toBe(
			[
				'<script lang="ts">',
				"\timport { Accordion } from '@soldy-ui/svelte'",
				"\timport { TAccordion } from '@soldy-ui/core'",
				'',
				'\tconst instance = new TAccordion()',
				'',
				"\tinstance.view = 'plain'",
				'</script>',
				'',
				'<Accordion ctrl={instance} />',
			].join('\n'),
		)
	})

	it('коллекционное свойство пишет в движок, а не в компонент', () => {
		const code = svelte.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			'multiple',
		)

		expect(code).toContain('\tconst engine = createEngineAccordion()')
		expect(code).toContain("\tengine.extensions.selection.mode = 'multiple'")
		expect(code).toContain('<Accordion engine={engine} />')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain('ctrl={instance}')
	})

	it('у календаря — его сборщик движка', () => {
		const code = svelte.instanceSnippet(
			entryOf('calendar'),
			control({ name: 'mode', scope: 'collection' }),
			'range',
		)

		expect(code).toContain("\timport { createEngineCalendar } from '@soldy-ui/core'")
		expect(code).toContain('\tconst engine = createEngineCalendar()')
		expect(code).toContain("\tengine.extensions.selection.mode = 'range'")
		expect(code).toContain('<Calendar engine={engine} />')
		expect(code).not.toContain('createEngineSelection')
	})

	it('свойство плагина пишет в плагин из bundle', () => {
		const code = svelte.instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			'Закрыть',
		)

		expect(code).toContain('\tconst instance = new TButton()')
		expect(code).toContain("\timport { TPluginBundle, TAriaPlugin } from '@soldy-ui/plugins'")
		expect(code).toContain("\tinstance.events.on('bundle:create', (bundle: unknown) => {")
		expect(code).toContain('\t\tconst plugin = bundle.get(TAriaPlugin)')
		expect(code).toContain("\t\tif (plugin) plugin.label = 'Закрыть'")
		expect(code).toContain('<Button ctrl={instance} />')
		expect(code).not.toContain('instance.aria_label')
		expect(code).not.toContain('instance.label')
	})

	it('строка в коде — в одинарных кавычках, с экранированием', () => {
		const code = svelte.instanceSnippet(
			entryOf('button'),
			control({ name: 'text', scope: 'component' }),
			"It's",
		)

		expect(code).toContain("instance.text = 'It\\'s'")
	})
})

describe('Svelte: propSnippet', () => {
	it('пример — компонент .svelte: импорт из адаптера, проп атрибутом', () => {
		expect(svelte.propSnippet(entryOf('button'), 'view', 'plain')).toBe(
			[
				'<script lang="ts">',
				"\timport { Button } from '@soldy-ui/svelte'",
				'</script>',
				'',
				'<Button view="plain" />',
			].join('\n'),
		)
	})

	it('коллекционное свойство передаётся обычным пропом', () => {
		expect(svelte.propSnippet(accordion, 'mode', 'multiple')).toContain(
			'<Accordion mode="multiple" />',
		)
	})

	it('число и булево — выражением в {}', () => {
		const progressLinear = entryOf('progress-linear')

		expect(svelte.propSnippet(progressLinear, 'max', 50)).toContain(
			'<ProgressLinear max={50} />',
		)
		expect(svelte.propSnippet(progressLinear, 'indeterminate', true)).toContain(
			'<ProgressLinear indeterminate={true} />',
		)
	})

	/**
	 * В кавычках Svelte читает `{…}` выражением, а `&` — началом сущности, и
	 * кавычка оборвала бы строку. Такая строка уходит выражением.
	 */
	it('строка с кавычкой, & или фигурной скобкой — выражением', () => {
		const button = entryOf('button')

		expect(svelte.propSnippet(button, 'text', 'Он сказал "да"')).toContain(
			`<Button text={'Он сказал "да"'} />`,
		)
		expect(svelte.propSnippet(button, 'text', 'A &amp; B')).toContain(
			`<Button text={'A &amp; B'} />`,
		)
		expect(svelte.propSnippet(button, 'text', '{name}')).toContain(`<Button text={'{name}'} />`)
	})
})

describe('Svelte: пресет строки', () => {
	const select = entryOf('select')
	const preset = { editable: true, mode: 'multiple' }

	it('propSnippet пишет пресет рядом с самим пропом', () => {
		const code = svelte.propSnippet(select, 'removeOnBackspace', true, preset)

		expect(code).toContain(
			'<Select editable={true} mode="multiple" removeOnBackspace={true} />',
		)
	})

	it('instanceSnippet пишет пресет разметкой рядом с ctrl', () => {
		const code = svelte.instanceSnippet(
			select,
			control({ name: 'removeOnBackspace', scope: 'component', preset }),
			true,
		)

		expect(code).toContain('instance.removeOnBackspace = true')
		expect(code).toContain('<Select editable={true} mode="multiple" ctrl={instance} />')
	})
})

describe.each([
	['стёртое текстовое поле', ''],
	['стёртое числовое поле или снятый выбор', undefined],
])('Svelte: пустое поле — %s', (_name, value) => {
	const progressLinear = entryOf('progress-linear')
	const preset = { value: 40 }

	it('propSnippet не пишет атрибут пропа, пресет на месте', () => {
		const code = svelte.propSnippet(progressLinear, 'max', value, preset)

		expect(code).toContain('<ProgressLinear value={40} />')
		expect(code).not.toContain('max')
	})

	it('свойство компонента: экземпляр без присваивания, пресет рядом с ctrl', () => {
		const code = svelte.instanceSnippet(
			progressLinear,
			control({ name: 'max', scope: 'component', preset }),
			value,
		)

		expect(code).toContain('\tconst instance = new TProgressLinear()\n</script>')
		expect(code).not.toContain('max')
		expect(code).toContain('<ProgressLinear value={40} ctrl={instance} />')
	})

	it('коллекционное свойство: движок без присваивания', () => {
		const code = svelte.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			value,
		)

		expect(code).toContain('\tconst engine = createEngineAccordion()\n</script>')
		expect(code).not.toContain('mode')
		expect(code).toContain('<Accordion engine={engine} />')
	})

	it('свойство плагина: ни подписки на bundle, ни импорта плагина', () => {
		const code = svelte.instanceSnippet(
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
				'<script lang="ts">',
				"\timport { Button } from '@soldy-ui/svelte'",
				"\timport { TButton } from '@soldy-ui/core'",
				'',
				'\tconst instance = new TButton()',
				'</script>',
				'',
				'<Button ctrl={instance} />',
			].join('\n'),
		)
	})
})

/**
 * Код Solid — те же случаи синтаксисом JSX, как у React: пример —
 * функциональный компонент, строка в кавычках, остальное в `{}`. Но тело
 * компонента Solid выполняется один раз на монтирование, поэтому экземпляр и
 * движок — обычные константы в теле, без хука, и запись свойства — там же, до
 * первой отрисовки.
 */
describe('Solid: instanceSnippet', () => {
	it('свойство компонента пишет в инстанс — константой в теле компонента', () => {
		const code = solid.instanceSnippet(
			accordion,
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

		expect(code).toBe(
			[
				"import { Accordion } from '@soldy-ui/solid'",
				"import { TAccordion } from '@soldy-ui/core'",
				'',
				'export function Example() {',
				'\tconst instance = new TAccordion()',
				'',
				"\tinstance.view = 'plain'",
				'',
				'\treturn <Accordion ctrl={instance} />',
				'}',
			].join('\n'),
		)
		expect(code).not.toContain('useState')
	})

	it('коллекционное свойство пишет в движок, а не в компонент', () => {
		const code = solid.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			'multiple',
		)

		expect(code).toContain('\tconst engine = createEngineAccordion()')
		expect(code).toContain("\tengine.extensions.selection.mode = 'multiple'")
		expect(code).toContain('<Accordion engine={engine} />')
		expect(code).not.toContain('instance.mode')
		expect(code).not.toContain('ctrl={instance}')
	})

	it('у календаря — его сборщик движка', () => {
		const code = solid.instanceSnippet(
			entryOf('calendar'),
			control({ name: 'mode', scope: 'collection' }),
			'range',
		)

		expect(code).toContain("import { createEngineCalendar } from '@soldy-ui/core'")
		expect(code).toContain('\tconst engine = createEngineCalendar()')
		expect(code).toContain("\tengine.extensions.selection.mode = 'range'")
		expect(code).toContain('<Calendar engine={engine} />')
		expect(code).not.toContain('createEngineSelection')
	})

	it('свойство плагина пишет в плагин из bundle', () => {
		const code = solid.instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			'Закрыть',
		)

		expect(code).toContain('\tconst instance = new TButton()')
		expect(code).toContain("import { TPluginBundle, TAriaPlugin } from '@soldy-ui/plugins'")
		expect(code).toContain("\tinstance.events.on('bundle:create', (bundle: unknown) => {")
		expect(code).toContain('\t\tconst plugin = bundle.get(TAriaPlugin)')
		expect(code).toContain("\t\tif (plugin) plugin.label = 'Закрыть'")
		expect(code).toContain('<Button ctrl={instance} />')
		expect(code).not.toContain('instance.aria_label')
		expect(code).not.toContain('instance.label')
	})

	it('строка в коде — в одинарных кавычках, с экранированием', () => {
		const code = solid.instanceSnippet(
			entryOf('button'),
			control({ name: 'text', scope: 'component' }),
			"It's",
		)

		expect(code).toContain("instance.text = 'It\\'s'")
	})
})

describe('Solid: propSnippet', () => {
	it('пример — компонент с JSX: импорт из адаптера, проп атрибутом', () => {
		expect(solid.propSnippet(entryOf('button'), 'view', 'plain')).toBe(
			[
				"import { Button } from '@soldy-ui/solid'",
				'',
				'export function Example() {',
				'\treturn <Button view="plain" />',
				'}',
			].join('\n'),
		)
	})

	it('коллекционное свойство передаётся обычным пропом', () => {
		expect(solid.propSnippet(accordion, 'mode', 'multiple')).toContain(
			'<Accordion mode="multiple" />',
		)
	})

	it('число и булево — выражением в {}', () => {
		const progressLinear = entryOf('progress-linear')

		expect(solid.propSnippet(progressLinear, 'max', 50)).toContain(
			'<ProgressLinear max={50} />',
		)
		expect(solid.propSnippet(progressLinear, 'indeterminate', true)).toContain(
			'<ProgressLinear indeterminate={true} />',
		)
	})

	/**
	 * Строка JSX не знает экранирования: кавычка оборвала бы её, а `&amp;`
	 * JSX прочёл бы как `&`. Такая строка уходит выражением.
	 */
	it('строка с кавычкой или & — выражением', () => {
		const button = entryOf('button')

		expect(solid.propSnippet(button, 'text', 'Он сказал "да"')).toContain(
			`<Button text={'Он сказал "да"'} />`,
		)
		expect(solid.propSnippet(button, 'text', 'A &amp; B')).toContain(
			`<Button text={'A &amp; B'} />`,
		)
	})
})

describe('Solid: пресет строки', () => {
	const select = entryOf('select')
	const preset = { editable: true, mode: 'multiple' }

	it('propSnippet пишет пресет рядом с самим пропом', () => {
		const code = solid.propSnippet(select, 'removeOnBackspace', true, preset)

		expect(code).toContain(
			'<Select editable={true} mode="multiple" removeOnBackspace={true} />',
		)
	})

	it('instanceSnippet пишет пресет разметкой рядом с ctrl', () => {
		const code = solid.instanceSnippet(
			select,
			control({ name: 'removeOnBackspace', scope: 'component', preset }),
			true,
		)

		expect(code).toContain('instance.removeOnBackspace = true')
		expect(code).toContain('<Select editable={true} mode="multiple" ctrl={instance} />')
	})
})

describe.each([
	['стёртое текстовое поле', ''],
	['стёртое числовое поле или снятый выбор', undefined],
])('Solid: пустое поле — %s', (_name, value) => {
	const progressLinear = entryOf('progress-linear')
	const preset = { value: 40 }

	it('propSnippet не пишет атрибут пропа, пресет на месте', () => {
		const code = solid.propSnippet(progressLinear, 'max', value, preset)

		expect(code).toContain('\treturn <ProgressLinear value={40} />')
		expect(code).not.toContain('max')
	})

	it('свойство компонента: экземпляр без присваивания, пресет рядом с ctrl', () => {
		const code = solid.instanceSnippet(
			progressLinear,
			control({ name: 'max', scope: 'component', preset }),
			value,
		)

		expect(code).toContain('\tconst instance = new TProgressLinear()\n\n\treturn')
		expect(code).not.toContain('max')
		expect(code).toContain('\treturn <ProgressLinear value={40} ctrl={instance} />')
	})

	it('коллекционное свойство: движок без присваивания', () => {
		const code = solid.instanceSnippet(
			accordion,
			control({ name: 'mode', scope: 'collection' }),
			value,
		)

		expect(code).toContain('\tconst engine = createEngineAccordion()\n\n\treturn')
		expect(code).not.toContain('mode')
		expect(code).toContain('\treturn <Accordion engine={engine} />')
	})

	it('свойство плагина: ни подписки на bundle, ни импорта плагина', () => {
		const code = solid.instanceSnippet(
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
				"import { Button } from '@soldy-ui/solid'",
				"import { TButton } from '@soldy-ui/core'",
				'',
				'export function Example() {',
				'\tconst instance = new TButton()',
				'',
				'\treturn <Button ctrl={instance} />',
				'}',
			].join('\n'),
		)
	})
})

/**
 * Код Web Components — те же случаи страницей HTML: модуль регистрирует
 * элементы, компонент — элемент своего тега с `is`. Колонка пропа —
 * разметка, значение уходит атрибутом, а чего атрибут не передаст, модуль
 * пишет свойством. Колонка экземпляра — элемент строит код, и `ctrl`
 * ставится до вставки.
 */
describe('Web Components: propSnippet', () => {
	it('пример — страница: модуль регистрирует элементы, проп — атрибутом', () => {
		expect(webc.propSnippet(entryOf('button'), 'view', 'plain')).toBe(
			[
				'<script type="module">',
				"\timport '@soldy-ui/webc'",
				'</script>',
				'',
				'<button is="so-button" view="plain"></button>',
			].join('\n'),
		)
	})

	/**
	 * Атрибут элемент приводит по типу пропа: у Skeleton `width` —
	 * `[Number, String]`, и `40` атрибут отдаёт числом, `10%` — строкой. Строку
	 * `'40'` атрибут отдал бы числом — она уходит свойством.
	 */
	it('число и строка — атрибутом, если тип пропа прочтёт их тем же значением', () => {
		const skeleton = entryOf('skeleton')

		expect(webc.propSnippet(skeleton, 'width', 40)).toContain(
			'<div is="so-skeleton" width="40"></div>',
		)
		expect(webc.propSnippet(skeleton, 'width', '10%')).toContain(
			'<div is="so-skeleton" width="10%"></div>',
		)
		expect(webc.propSnippet(skeleton, 'width', '40')).toContain("\telement.width = '40'")
	})

	/** У флага значимо наличие атрибута: `false` атрибутом не задать, только свойством. */
	it('флаг: true — атрибут без значения, false — свойством из модуля', () => {
		const spinner = entryOf('progress-spinner')

		expect(webc.propSnippet(spinner, 'indeterminate', true)).toContain(
			'<span is="so-progress-spinner" indeterminate></span>',
		)
		expect(webc.propSnippet(spinner, 'indeterminate', false)).toBe(
			[
				'<script type="module">',
				"\timport '@soldy-ui/webc'",
				'',
				'\tconst element = document.querySelector(\'span[is="so-progress-spinner"]\')',
				'',
				'\telement.indeterminate = false',
				'</script>',
				'',
				'<span is="so-progress-spinner"></span>',
			].join('\n'),
		)
	})

	it('имя атрибута — как у элемента: camelCase пропа — через дефис', () => {
		expect(webc.propSnippet(entryOf('button'), 'aria_labelledBy', 'caption')).toContain(
			'<button is="so-button" aria_labelled-by="caption"></button>',
		)
	})

	it('кавычка и & в значении атрибута — сущностями HTML', () => {
		const button = entryOf('button')

		expect(webc.propSnippet(button, 'text', 'Он сказал "да"')).toContain(
			'<button is="so-button" text="Он сказал &quot;да&quot;"></button>',
		)
		expect(webc.propSnippet(button, 'text', 'A & B')).toContain(
			'<button is="so-button" text="A &amp; B"></button>',
		)
	})

	/** Тег — сам элемент: ни атрибута, ни свойства `tag` у него нет. */
	it('тега в коде нет', () => {
		expect(webc.propSnippet(entryOf('button'), 'tag', 'a')).toContain(
			'<button is="so-button"></button>',
		)
	})

	it('пресет — атрибутами рядом с самим пропом', () => {
		const code = webc.propSnippet(entryOf('progress-spinner'), 'max', 50, { value: 40 })

		expect(code).toContain('<span is="so-progress-spinner" value="40" max="50"></span>')
	})
})

describe('Web Components: instanceSnippet', () => {
	it('свойство компонента пишет в инстанс, ctrl — до вставки элемента', () => {
		const code = webc.instanceSnippet(
			entryOf('button'),
			control({ name: 'view', scope: 'component' }),
			'plain',
		)

		expect(code).toBe(
			[
				'<script type="module">',
				"\timport '@soldy-ui/webc'",
				"\timport { TButton } from '@soldy-ui/core'",
				'',
				'\tconst instance = new TButton()',
				'',
				"\tinstance.view = 'plain'",
				'',
				"\tconst element = document.createElement('button', { is: 'so-button' })",
				'',
				'\telement.ctrl = instance',
				'\tdocument.body.append(element)',
				'</script>',
			].join('\n'),
		)
	})

	it('свойство плагина пишет в плагин из bundle', () => {
		const code = webc.instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			'Закрыть',
		)

		expect(code).toContain('\tconst instance = new TButton()')
		expect(code).toContain("\timport { TPluginBundle, TAriaPlugin } from '@soldy-ui/plugins'")
		expect(code).toContain("\tinstance.events.on('bundle:create', (bundle) => {")
		expect(code).toContain('\t\tconst plugin = bundle.get(TAriaPlugin)')
		expect(code).toContain("\t\tif (plugin) plugin.label = 'Закрыть'")
		expect(code).toContain('\telement.ctrl = instance')
		expect(code).not.toContain('instance.aria_label')
		expect(code).not.toContain('instance.label')
	})

	it('строка в коде — в одинарных кавычках, с экранированием', () => {
		const code = webc.instanceSnippet(
			entryOf('button'),
			control({ name: 'text', scope: 'component' }),
			"It's",
		)

		expect(code).toContain("instance.text = 'It\\'s'")
	})

	it('пресет — свойствами элемента рядом с ctrl', () => {
		const code = webc.instanceSnippet(
			entryOf('progress-spinner'),
			control({ name: 'max', scope: 'component', preset: { value: 40 } }),
			50,
		)

		expect(code).toContain('\tinstance.max = 50')
		expect(code).toContain(
			'\telement.ctrl = instance\n\telement.value = 40\n\tdocument.body.append(element)',
		)
	})

	/** Коллекции адаптер ещё не перенёс: коллекционной строки у страницы хоста нет. */
	it('коллекционной строки у хоста нет', () => {
		expect(() =>
			webc.instanceSnippet(
				entryOf('button'),
				control({ name: 'mode', scope: 'collection' }),
				'multiple',
			),
		).toThrow('нет коллекций')
	})
})

describe.each([
	['стёртое текстовое поле', ''],
	['стёртое числовое поле или снятый выбор', undefined],
])('Web Components: пустое поле — %s', (_name, value) => {
	const spinner = entryOf('progress-spinner')
	const preset = { value: 40 }

	it('propSnippet не пишет атрибут пропа, пресет на месте', () => {
		const code = webc.propSnippet(spinner, 'max', value, preset)

		expect(code).toContain('<span is="so-progress-spinner" value="40"></span>')
		expect(code).not.toContain('max')
	})

	it('свойство компонента: экземпляр без присваивания', () => {
		const code = webc.instanceSnippet(
			spinner,
			control({ name: 'max', scope: 'component', preset }),
			value,
		)

		expect(code).toContain('\tconst instance = new TProgressSpinner()\n\n\tconst element')
		expect(code).not.toContain('max')
	})

	it('свойство плагина: ни подписки на bundle, ни импорта плагина', () => {
		const code = webc.instanceSnippet(
			entryOf('button'),
			control({
				name: 'aria_label',
				scope: 'plugin',
				plugin: { ctor: TAriaPlugin, name: 'label' },
			}),
			value,
		)

		expect(code).not.toContain('bundle')
		expect(code).not.toContain('@soldy-ui/plugins')
		expect(code).toContain('\telement.ctrl = instance')
	})
})

/**
 * Файл примера — синтаксиса хоста: «Открыть в VS Code» пишет код Vue в `.vue`,
 * код React и Solid — в `.tsx`, код Svelte — в `.svelte`, код Web Components —
 * в `.html`, иначе редактор не прочёл бы его как код.
 */
describe('файл примера', () => {
	it('расширение — синтаксиса хоста', () => {
		expect([
			vue.extension,
			react.extension,
			svelte.extension,
			solid.extension,
			webc.extension,
		]).toEqual(['vue', 'tsx', 'svelte', 'tsx', 'html'])
	})
})
