import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «никаких костылей»: `as never` в наборах владельческих
 * расширений (`_OWNER_EXTENSIONS` в `custom/<component>/collection/factory.ts`)
 * глушит проверку типов вместо того, чтобы соответствовать `TOwnerExtensionSet`
 * (см. AGENTS.md, «Никаких костылей»; задача 869f1g882).
 *
 * Сканируются только `collection/factory.ts` — в остальном коде `as never`
 * не запрещён этим сторожем.
 */

const ROOT = resolve(__dirname, '../../..')
const COMPONENTS_DIR = resolve(__dirname, '../src/components')

const FACTORY_FILE = /[\\/]collection[\\/]factory\.ts$/
const AS_NEVER = /\bas\s+never\b/

function collectSourceFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			collectSourceFiles(full, files)
		} else if (/\.ts$/.test(name)) {
			files.push(full)
		}
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

describe('owner extensions as never guard', () => {
	it('в collection/factory.ts нет `as never`', () => {
		const factoryFiles = collectSourceFiles(COMPONENTS_DIR).filter((file) =>
			FACTORY_FILE.test(file),
		)

		expect(factoryFiles.length, 'не найдено ни одного collection/factory.ts').toBeGreaterThan(0)

		const violations = factoryFiles
			.filter((file) => AS_NEVER.test(readFileSync(file, 'utf-8')))
			.map(toRelative)

		expect(
			violations,
			`\`as never\` в наборе владельческих расширений (см. AGENTS.md, "Никаких костылей"):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
