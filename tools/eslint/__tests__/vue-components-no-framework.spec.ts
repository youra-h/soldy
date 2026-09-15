import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Сторож «механизмы Vue — только в адаптерном слое» (AGENTS.md, «Механизмы
 * фреймворка — только в адаптерном слое») живёт блоком
 * `soldy/vue-components-no-framework` в `eslint.config.ts`, а не отдельным
 * AST-тестом — так уже устроен запрет приведений (`no-casts.spec.ts`). Тест
 * линтит фрагменты настоящим конфигом репозитория: опечатка в `files`
 * отключила бы защиту молча, и CI остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const COMPONENT_TS = 'packages/ui/vue/src/components/__fixture__/setup.component.ts'
const COMPONENT_VUE = 'packages/ui/vue/src/components/__fixture__/base.component.vue'
const ADAPTER = 'packages/ui/vue/src/adapter/common/__fixture__.ts'

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

describe('eslint.config.ts: компоненты Vue не импортируют фреймворк', () => {
	it("import из 'vue' в .ts под components/ — ошибка", async () => {
		expect(
			await ruleIds("import { toRaw } from 'vue'\nexport const x = toRaw({})", COMPONENT_TS),
		).toContain('no-restricted-imports')
	})

	it("import из 'vue' в <script> .vue под components/ — ошибка", async () => {
		const code =
			"<script>\nimport { toRaw } from 'vue'\nexport default { setup: () => toRaw({}) }\n</script>"

		expect(await ruleIds(code, COMPONENT_VUE)).toContain('no-restricted-imports')
	})

	it('createAdapterContext из @soldy/setup под components/ — ошибка', async () => {
		const code =
			"import { createAdapterContext } from '@soldy/setup'\nexport const x = createAdapterContext"

		expect(await ruleIds(code, COMPONENT_TS)).toContain('no-restricted-imports')
	})

	it('другой импорт из @soldy/setup под components/ — допустимо', async () => {
		const code =
			"import { ButtonDescriptor } from '@soldy/setup'\nexport const x = ButtonDescriptor"

		expect(await ruleIds(code, COMPONENT_TS)).toEqual([])
	})

	it("import из 'vue' вне components/ (адаптер) — допустимо", async () => {
		expect(
			await ruleIds("import { toRaw } from 'vue'\nexport const x = toRaw({})", ADAPTER),
		).not.toContain('no-restricted-imports')
	})

	it('createAdapterContext из @soldy/setup вне components/ (адаптер) — допустимо', async () => {
		const code =
			"import { createAdapterContext } from '@soldy/setup'\nexport const x = createAdapterContext"

		expect(await ruleIds(code, ADAPTER)).not.toContain('no-restricted-imports')
	})
})
