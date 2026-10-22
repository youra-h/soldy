import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { readTree, strayCopies } from '../min-peers.ts'
import type { TCopy } from '../min-peers.ts'

/**
 * Проверка дерева на фикстуре: каталог с `node_modules`, где у пакета списка
 * есть вложенная копия другой версии, — так у npm остаётся копия из
 * `devDependencies` воркспейса, которой нижняя граница не подходит. Дерево
 * читает сам npm (`npm query`), поэтому фикстура — настоящий каталог, а не
 * список: проверяется, что вложенные копии, и со скоупом тоже, npm называет.
 */

let root = ''
let tree: TCopy[] = []

/** Манифест в каталоге фикстуры: путь от её корня. */
function manifest(path: string, content: Readonly<Record<string, unknown>>): void {
	const file = join(root, path, 'package.json')

	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, JSON.stringify(content))
}

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), 'min-peers-'))
	manifest('.', {
		name: 'fixture',
		version: '1.0.0',
		dependencies: { consumer: '1.0.0', vue: '3.5.21', '@angular/core': '22.2.0' },
	})
	manifest('node_modules/vue', { name: 'vue', version: '3.5.21' })
	manifest('node_modules/@angular/core', { name: '@angular/core', version: '22.2.0' })
	manifest('node_modules/consumer', {
		name: 'consumer',
		version: '1.0.0',
		dependencies: { vue: '^3.5.32', '@angular/core': '^22.2.3' },
	})
	manifest('node_modules/consumer/node_modules/vue', { name: 'vue', version: '3.5.44' })
	manifest('node_modules/consumer/node_modules/@angular/core', {
		name: '@angular/core',
		version: '22.2.3',
	})
	tree = readTree(root)
})

afterAll(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('проверка дерева, которое называет npm', () => {
	it('вложенная копия другой версии — расхождение с её местом', () => {
		const pins = [
			{ name: 'vue', version: '3.5.21' },
			{ name: '@angular/core', version: '22.2.0' },
		]

		expect(strayCopies(pins, tree)).toEqual([
			{
				name: 'vue',
				expected: '3.5.21',
				found: { version: '3.5.44', location: 'node_modules/consumer/node_modules/vue' },
			},
			{
				name: '@angular/core',
				expected: '22.2.0',
				found: {
					version: '22.2.3',
					location: 'node_modules/consumer/node_modules/@angular/core',
				},
			},
		])
	})

	it('в списке версия вложенной копии — расхождение у копии корня', () => {
		expect(strayCopies([{ name: 'vue', version: '3.5.44' }], tree)).toEqual([
			{
				name: 'vue',
				expected: '3.5.44',
				found: { version: '3.5.21', location: 'node_modules/vue' },
			},
		])
	})
})
