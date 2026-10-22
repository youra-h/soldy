import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Сторож «атрибуты узла разметки компонента Solid — от помощника адаптера»
 * (`packages/ui/solid/src/adapter/common/root.ts`, шапка, «Гидратация») живёт
 * своим правилом `soldy/solid-part-props` — блоком в `eslint.config.ts`, по
 * образцу `react-components-no-framework.spec.ts`. Тест линтит фрагменты
 * настоящим конфигом репозитория: опечатка в `files` отключила бы защиту
 * молча, и CI остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const RULE = 'soldy/solid-part-props'
const COMPONENT = 'packages/ui/solid/src/components/__fixture__/Fixture.tsx'
const ADAPTER = 'packages/ui/solid/src/adapter/common/__fixture__.tsx'

/**
 * Правила, сработавшие на фрагменте. Фрагмент, который не разобрался
 * (`fatal`), — ошибка теста: «правило молчит» на нём ничего не доказывает.
 */
async function ruleIds(code: string, filePath = COMPONENT): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })
	const ids = result.messages.map((message) => message.ruleId ?? 'fatal')

	expect(ids).not.toContain('fatal')

	return ids
}

/** Компонент фикстуры: `body` — его тело, `markup` — что он возвращает. */
const component = (body: string, markup: string) =>
	`export function Fixture(props: { cellAria?: object }) {\n${body}\nreturn (${markup})\n}\n`

describe('eslint.config.ts: спред на узле разметки компонента Solid — от помощника', () => {
	describe('ловит', () => {
		it.each([
			['набор из состояния на div', '', '<div {...state.contentAria} />'],
			[
				'набор записи на span',
				'',
				'<Index each={state.marks}>{(entry) => <span {...entry().aria} />}</Index>',
			],
			[
				'атрибуты контролу без помощника на input',
				'const control = () => toControlAttrs(binding.forwardProps())',
				'<input {...control()} />',
			],
			['набор из состояния на Dynamic', '', '<Dynamic component="td" {...state.aria} />'],
			['пропс на нативном узле', '', '<td {...props.cellAria} />'],
			[
				'помощник не через const',
				'let aria = createPartProps(() => state.aria)',
				'<input {...aria()} />',
			],
			[
				'вызов помощника в выражении спреда',
				'',
				'<input {...createPartProps(() => state.aria)()} />',
			],
		])('%s', async (_title, body, markup) => {
			expect(await ruleIds(component(body, markup))).toContain(RULE)
		})
	})

	describe('пропускает', () => {
		it.each([
			[
				'аксессор от помощника части',
				'const aria = createPartProps(() => state.aria)',
				'<input {...aria()} />',
			],
			[
				'поле аксессора от раскладки обёртки',
				'const layout = createWrappedRootProps(() => source)',
				'<div {...layout().wrapper} />',
			],
			[
				'раскладку корня на Dynamic',
				'const root = createRootProps(() => source)',
				'<Dynamic {...root()} component="div" />',
			],
			[
				'атрибуты текста поля',
				'const text = fieldText(() => state.value)',
				'<input {...text} />',
			],
			[
				'атрибуты текста многострочного поля',
				'const text = textareaText(() => state.value)',
				'<textarea {...text} />',
			],
			['спред на компоненте', '', '<Button {...state.aria} />'],
			['спред на части компонента', '', '<Tabs.Item {...state.aria} />'],
		])('%s', async (_title, body, markup) => {
			expect(await ruleIds(component(body, markup))).not.toContain(RULE)
		})
	})

	it('вне components/ (адаптер) — правило не действует', async () => {
		expect(await ruleIds(component('', '<div {...state.aria} />'), ADAPTER)).not.toContain(RULE)
	})
})
