import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Что игнорирует git, то игнорирует и линтер: список игнорируемых путей один —
 * корневой `.gitignore`, который `eslint.config.ts` подключает через
 * `includeIgnoreFile`. Второй список неизбежно расходится с первым, и уже
 * разошёлся: черновики из папок `scratch` под `packages/playground` роняли
 * `npm run lint` файлами, которых в репозитории нет.
 *
 * Сторож нужен с обеих сторон. Пропавший `includeIgnoreFile` вернул бы красный
 * линт на черновиках, а лишний путь в игнорируемых выключил бы блок
 * `eslint.config.ts` молча — и спеки соседних файлов, которые линтят
 * вымышленные пути настоящим конфигом, стали бы проверять пустоту.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

describe('eslint.config.ts: игнорируется то же, что и у git', () => {
	it.each([
		['черновики стенда', 'packages/playground/vue/scratch/869f4kcn6/shot.spec.ts'],
		['выход сборки', 'packages/themes/oren/dist/index.ts'],
		['выход сборки пакета', 'packages/core/lib/index.ts'],
		['покрытие', 'coverage/lcov-report/block.ts'],
		['сторонние плагины', 'packages/_plugins/sample/index.ts'],
		['отчёт браузерного прогона', 'test-results/sample/probe.spec.ts'],
		['кэш Angular', 'packages/ui/angular/.angular/cache/sample.ts'],
	])('%s — игнорируется', async (_title, filePath) => {
		expect(await eslint.isPathIgnored(filePath)).toBe(true)
	})

	it.each([
		['исходники ядра', 'packages/core/src/components/button/button.class.ts'],
		['тесты ядра', 'packages/core/__tests__/aria.spec.ts'],
		['наполнение setup', 'packages/setup/content/descriptors/components/button.ts'],
		['компоненты Vue', 'packages/ui/vue/src/components/button/setup.component.ts'],
		['инструменты', 'tools/eslint/rules/no-explicit-any.ts'],
		['сам конфиг', 'eslint.config.ts'],
		['исходники стенда', 'packages/playground/vue/src/main.ts'],
	])('%s — проверяется', async (_title, filePath) => {
		expect(await eslint.isPathIgnored(filePath)).toBe(false)
	})
})
