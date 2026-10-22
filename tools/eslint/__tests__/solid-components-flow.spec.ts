import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Сторож «ветки и петли компонента Solid — примитивы адаптера»
 * (`packages/ui/solid/src/adapter/runtime/flow.ts`, шапка) живёт блоком
 * `soldy/solid-components-flow` в `eslint.config.ts` — по образцу
 * `react-components-no-framework.spec.ts`. Тест линтит фрагменты настоящим
 * конфигом репозитория: опечатка в `files` отключила бы защиту молча, и CI
 * остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const RULE = 'no-restricted-imports'
const COMPONENT_TSX = 'packages/ui/solid/src/components/__fixture__/Fixture.tsx'
const COMPONENT_TS = 'packages/ui/solid/src/components/__fixture__/setup.component.ts'
const ADAPTER = 'packages/ui/solid/src/adapter/runtime/__fixture__.tsx'

/**
 * Правила, сработавшие на фрагменте. Фрагмент, который не разобрался
 * (`fatal`), — ошибка теста: «правило молчит» на нём ничего не доказывает.
 */
async function ruleIds(code: string, filePath = COMPONENT_TSX): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })
	const ids = result.messages.map((message) => message.ruleId ?? 'fatal')

	expect(ids).not.toContain('fatal')

	return ids
}

describe('eslint.config.ts: ветки и петли компонента Solid — примитивы адаптера', () => {
	it.each(['Show', 'For', 'Index', 'Switch', 'Match'])(
		"%s из 'solid-js' в компоненте — ошибка",
		async (name) => {
			expect(
				await ruleIds(`import { ${name} } from 'solid-js'\nexport const x = ${name}`),
			).toContain(RULE)
		},
	)

	it("Show из 'solid-js' в модуле компонента без JSX — ошибка", async () => {
		expect(
			await ruleIds("import { Show } from 'solid-js'\nexport const x = Show", COMPONENT_TS),
		).toContain(RULE)
	})

	it("namespace-импорт 'solid-js' в компоненте — ошибка", async () => {
		expect(
			await ruleIds("import * as Solid from 'solid-js'\nexport const x = Solid.Show"),
		).toContain(RULE)
	})

	it('примитивы адаптера в компоненте — допустимо', async () => {
		const code =
			"import { For, Index, Show } from '../../adapter/runtime/flow'\nexport const x = [For, Index, Show]"

		expect(await ruleIds(code)).not.toContain(RULE)
	})

	it("типы из 'solid-js' в компоненте — допустимо", async () => {
		const code =
			"import { type Accessor, type JSX } from 'solid-js'\nexport const x: Accessor<JSX.Element> | null = null"

		expect(await ruleIds(code)).not.toContain(RULE)
	})

	it("Show из 'solid-js' вне components/ (адаптер) — допустимо", async () => {
		expect(
			await ruleIds("import { Show } from 'solid-js'\nexport const x = Show", ADAPTER),
		).not.toContain(RULE)
	})
})
