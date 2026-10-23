import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lowerBound, pinsOf, readTree, workspaceOf } from '../min-peers.ts'

/**
 * Настоящие манифесты адаптеров и матрица задачи CI «Минимальные версии»
 * (docs/agents/build.md, «Версии пакетов»). Дерево — то, что стоит в
 * репозитории: версии lock или уже подменённые, список от этого не зависит.
 */

const ROOT = resolve(import.meta.dirname, '../../..')

const tree = await readTree(ROOT)

function specs(field: unknown): [string, string][] {
	return typeof field === 'object' && field !== null
		? Object.entries(field).filter(
				(entry): entry is [string, string] => typeof entry[1] === 'string',
			)
		: []
}

/**
 * Адаптеры фреймворков — воркспейсы с peer на чужой пакет. Peer на соседа
 * `@soldy-ui/*` (у темы) — точная общая версия, нижней границы у него нет.
 */
const adapters = tree
	.filter(({ location }) => !location.split('/').includes('node_modules'))
	.filter(({ manifest }) =>
		specs(manifest.peerDependencies).some(([name]) => !name.startsWith('@soldy-ui/')),
	)
	.map(({ manifest }) => String(manifest.name))
	.sort()

describe('список подмены настоящих адаптеров', () => {
	it('адаптеры найдены', () => {
		expect(adapters).toEqual(
			expect.arrayContaining([
				'@soldy-ui/angular',
				'@soldy-ui/react',
				'@soldy-ui/solid',
				'@soldy-ui/svelte',
				'@soldy-ui/vue',
			]),
		)
	})

	it.each(adapters)('%s: каждый peer — нижней границей своего диапазона', (name) => {
		const manifest = workspaceOf(name, tree)
		const pins = pinsOf(manifest, tree)

		for (const [peer, range] of specs(manifest.peerDependencies)) {
			expect(pins).toContainEqual({ name: peer, version: lowerBound(range) })
		}
	})

	it('Angular: пакеты фреймворка из devDependencies — в списке, инструменты сборки — нет', () => {
		const pinned = pinsOf(workspaceOf('@soldy-ui/angular', tree), tree).map(({ name }) => name)

		expect(pinned).toEqual(
			expect.arrayContaining([
				'@angular/animations',
				'@angular/compiler',
				'@angular/compiler-cli',
				'@angular/platform-server',
			]),
		)
		expect(pinned).not.toContain('@angular/build')
		expect(pinned).not.toContain('@angular/cli')
		expect(pinned).not.toContain('ng-packagr')
	})

	it('Vue: пакеты выпуска vue — в списке, версией vue', () => {
		const pins = pinsOf(workspaceOf('@soldy-ui/vue', tree), tree)
		const vue = pins.find(({ name }) => name === 'vue')

		expect(pins).toContainEqual({ name: '@vue/server-renderer', version: vue?.version })
		expect(pins).toContainEqual({ name: '@vue/compiler-dom', version: vue?.version })
	})
})

describe('матрица задачи «Минимальные версии»', () => {
	const ci = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf-8')
	const matrix = /^\s*adapter:\s*\[([^\]]*)\]/m.exec(ci)?.[1] ?? ''
	const listed = matrix
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '')
	const scripts: unknown = JSON.parse(
		readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
	).scripts

	it('в матрице — каждый адаптер фреймворка, и только они', () => {
		expect(listed.map((adapter) => `@soldy-ui/${adapter}`).sort()).toEqual(adapters)
	})

	it.each(listed)('%s: у корня есть скрипт его спеков', (adapter) => {
		expect(scripts).toHaveProperty(`test:${adapter}`)
	})
})
