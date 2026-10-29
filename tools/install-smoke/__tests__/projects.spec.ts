import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PROJECTS, libraryNamesOf } from '../install-smoke.ts'
import type { TManifest } from '../install-smoke.ts'

/**
 * The projects of the install run as they lie in the repository, against the
 * run's table and the CI matrix (docs/agents/build.md, «Прогон установки»). A
 * project folder the table does not list would never run, and a project the
 * matrix does not list would run only locally.
 */

const ROOT = resolve(import.meta.dirname, '../../..')
const PROJECTS_DIR = resolve(import.meta.dirname, '../projects')

function isObject(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(file: string): TManifest {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'))

	if (!isObject(parsed)) {
		throw new Error(`${file}: ожидается объект JSON`)
	}

	return parsed
}

/** A field of a manifest that is an object; any other reads as empty. */
function fieldOf(manifest: TManifest, key: string): TManifest {
	const field = manifest[key]

	return isObject(field) ? field : {}
}

/** The adapters of the library: the workspaces under `packages/ui`. */
const ADAPTERS = readdirSync(join(ROOT, 'packages/ui'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => readJson(join(ROOT, 'packages/ui', entry.name, 'package.json')).name)
	.filter((name): name is string => typeof name === 'string')
	.sort()

const projects = PROJECTS.map((project) => ({
	...project,
	manifest: readJson(join(PROJECTS_DIR, project.name, 'package.json')),
}))

describe('проекты прогона установки', () => {
	it('каждая папка projects/ — в таблице прогона, и только они', () => {
		const folders = readdirSync(PROJECTS_DIR, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort()

		expect(PROJECTS.map(({ name }) => name).sort()).toEqual(folders)
	})

	it('каждый адаптер библиотеки ставит хотя бы один проект', () => {
		const installed = new Set(projects.flatMap(({ manifest }) => libraryNamesOf(manifest)))

		expect(ADAPTERS.filter((adapter) => !installed.has(adapter))).toEqual([])
	})

	it.each(projects)(
		'$name: один адаптер, тема oren и иконки — под заглушкой «*»',
		({ manifest }) => {
			const named = libraryNamesOf(manifest)
			const specs = {
				...fieldOf(manifest, 'dependencies'),
				...fieldOf(manifest, 'devDependencies'),
			}

			expect(named.filter((name) => ADAPTERS.includes(name))).toHaveLength(1)
			expect(named).toEqual(
				expect.arrayContaining(['@soldy-ui/theme-oren', '@soldy-ui/icons-material']),
			)
			expect(named.filter((name) => specs[name] !== '*')).toEqual([])
		},
	)

	it.each(projects)(
		'$name: скрипты typecheck и build, а свой сервер — start',
		({ manifest, serve }) => {
			const scripts = fieldOf(manifest, 'scripts')

			expect(Object.keys(scripts)).toEqual(expect.arrayContaining(['typecheck', 'build']))
			expect('start' in scripts).toBe(serve.kind === 'server')
		},
	)
})

describe('матрица задачи CI', () => {
	const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8')
	const matrix = /^\s*project:\s*\[([^\]]*)\]/m.exec(ci)?.[1] ?? ''

	it('в матрице — каждый проект таблицы, в её порядке', () => {
		const listed = matrix
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry !== '')

		expect(listed).toEqual(PROJECTS.map(({ name }) => name))
	})
})
