import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Сторож «механизмы React — только в адаптерном слое» (AGENTS.md, «Механизмы
 * фреймворка — только в адаптерном слое») живёт блоком
 * `soldy/react-components-no-framework` в `eslint.config.ts` — по образцу
 * `soldy/vue-components-no-framework` и `vue-components-no-framework.spec.ts`.
 * Тест линтит фрагменты настоящим конфигом репозитория: опечатка в `files`
 * отключила бы защиту молча, и CI остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const COMPONENT_TS = 'packages/ui/react/src/components/__fixture__/setup.component.ts'
const COMPONENT_TSX = 'packages/ui/react/src/components/__fixture__/Fixture.tsx'
const ADAPTER = 'packages/ui/react/src/adapter/runtime/__fixture__.ts'

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

describe('eslint.config.ts: компоненты React не импортируют фреймворк', () => {
	it("value-импорт из 'react' в компоненте — ошибка", async () => {
		expect(
			await ruleIds(
				"import { useRef } from 'react'\nexport const x = useRef(null)",
				COMPONENT_TS,
			),
		).toContain('@typescript-eslint/no-restricted-imports')
	})

	it("namespace-импорт из 'react' (React.useRef) в компоненте — ошибка", async () => {
		const code = "import * as React from 'react'\nexport const x = React.useRef(null)"

		expect(await ruleIds(code, COMPONENT_TSX)).toContain(
			'@typescript-eslint/no-restricted-imports',
		)
	})

	it("import type из 'react' в компоненте — допустимо", async () => {
		const code =
			"import type { ReactElement } from 'react'\nexport const x: ReactElement | null = null"

		expect(await ruleIds(code, COMPONENT_TSX)).not.toContain(
			'@typescript-eslint/no-restricted-imports',
		)
	})

	it('createAdapterContext из @soldy-ui/setup под components/ — ошибка', async () => {
		// Контекст собирает `create` из `useAdapterContext`: прямой вызов
		// потерял бы основу `id` от `useId`
		const code =
			"import { createAdapterContext } from '@soldy-ui/setup'\nexport const x = createAdapterContext"

		expect(await ruleIds(code, COMPONENT_TS)).toContain(
			'@typescript-eslint/no-restricted-imports',
		)
	})

	it('другой импорт из @soldy-ui/setup под components/ — допустимо', async () => {
		const code =
			"import { ButtonDescriptor } from '@soldy-ui/setup'\nexport const x = ButtonDescriptor"

		expect(await ruleIds(code, COMPONENT_TS)).not.toContain(
			'@typescript-eslint/no-restricted-imports',
		)
	})

	it('createAdapterContext из @soldy-ui/setup вне components/ (адаптер) — допустимо', async () => {
		const code =
			"import { createAdapterContext } from '@soldy-ui/setup'\nexport const x = createAdapterContext"

		expect(await ruleIds(code, ADAPTER)).not.toContain(
			'@typescript-eslint/no-restricted-imports',
		)
	})

	it("import из 'react' вне components/ (адаптер) — допустимо", async () => {
		expect(
			await ruleIds("import { useRef } from 'react'\nexport const x = useRef(null)", ADAPTER),
		).not.toContain('@typescript-eslint/no-restricted-imports')
	})
})
