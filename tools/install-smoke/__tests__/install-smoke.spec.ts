import { describe, it, expect } from 'vitest'
import {
	libraryClosure,
	libraryLines,
	libraryNamesOf,
	lockProblems,
	withRegistry,
	withTarballs,
} from '../install-smoke.ts'
import type { TManifest } from '../install-smoke.ts'

/**
 * The rules of the install run on fixtures (docs/agents/build.md, «Прогон
 * установки»): which library packages a project installs and from where, what
 * a project's lock may hold, which lines of a tool's output are about the
 * library. A rule that let a package of the registry or a second copy through
 * would make the run green for nothing.
 */

/** The library of the fixtures: an adapter over the core, a theme with a peer on it. */
const LIBRARY = new Map<string, TManifest>([
	['@soldy-ui/core', { name: '@soldy-ui/core' }],
	[
		'@soldy-ui/plugins',
		{ name: '@soldy-ui/plugins', dependencies: { '@soldy-ui/core': '1.0.0' } },
	],
	[
		'@soldy-ui/setup',
		{
			name: '@soldy-ui/setup',
			dependencies: { '@soldy-ui/core': '1.0.0', '@soldy-ui/plugins': '1.0.0' },
		},
	],
	[
		'@soldy-ui/vue',
		{
			name: '@soldy-ui/vue',
			dependencies: { '@soldy-ui/setup': '1.0.0' },
			peerDependencies: { vue: '^3.5.0' },
		},
	],
	['@soldy-ui/theme-base', { name: '@soldy-ui/theme-base' }],
	[
		'@soldy-ui/theme-oren',
		{
			name: '@soldy-ui/theme-oren',
			dependencies: { '@soldy-ui/theme-base': '1.0.0' },
			peerDependencies: { '@soldy-ui/core': '1.0.0' },
		},
	],
])

/** A project as it lies in `projects/`: the library under the placeholder `*`. */
const PROJECT: TManifest = {
	name: 'app',
	dependencies: { vue: '^3.5.44', '@soldy-ui/vue': '*' },
	devDependencies: { vite: '^8.3.5', '@soldy-ui/theme-oren': '*' },
}

describe('библиотека проекта', () => {
	it('пакеты библиотеки, которые проект называет сам, — из обоих полей', () => {
		expect(libraryNamesOf(PROJECT)).toEqual(['@soldy-ui/theme-oren', '@soldy-ui/vue'])
	})

	it('замыкание — по dependencies и peerDependencies, вглубь, без чужих пакетов', () => {
		expect(libraryClosure(['@soldy-ui/vue', '@soldy-ui/theme-oren'], LIBRARY)).toEqual([
			'@soldy-ui/core',
			'@soldy-ui/plugins',
			'@soldy-ui/setup',
			'@soldy-ui/theme-base',
			'@soldy-ui/theme-oren',
			'@soldy-ui/vue',
		])
	})

	// Otherwise npm would take the package from the registry
	it('пакет библиотеки, которого нет в воркспейсе, — ошибка', () => {
		expect(() => libraryClosure(['@soldy-ui/svelte'], LIBRARY)).toThrow('@soldy-ui/svelte')
	})
})

describe('манифест проекта', () => {
	const closure = libraryClosure(libraryNamesOf(PROJECT), LIBRARY)
	const specs = new Map(closure.map((name) => [name, `file:../tarballs/${name.slice(10)}.tgz`]))

	it('из тарболлов: названные пакеты — на свой тарболл, остальные замыкания — в dependencies', () => {
		expect(withTarballs(PROJECT, specs)).toEqual({
			name: 'app',
			dependencies: {
				vue: '^3.5.44',
				'@soldy-ui/vue': 'file:../tarballs/vue.tgz',
				'@soldy-ui/core': 'file:../tarballs/core.tgz',
				'@soldy-ui/plugins': 'file:../tarballs/plugins.tgz',
				'@soldy-ui/setup': 'file:../tarballs/setup.tgz',
				'@soldy-ui/theme-base': 'file:../tarballs/theme-base.tgz',
			},
			devDependencies: {
				vite: '^8.3.5',
				'@soldy-ui/theme-oren': 'file:../tarballs/theme-oren.tgz',
			},
		})
	})

	it('из реестра: названные пакеты — под версией или тегом, остальное ставит npm', () => {
		expect(withRegistry(PROJECT, 'latest')).toEqual({
			name: 'app',
			dependencies: { vue: '^3.5.44', '@soldy-ui/vue': 'latest' },
			devDependencies: { vite: '^8.3.5', '@soldy-ui/theme-oren': 'latest' },
		})
	})
})

describe('библиотека в lock проекта', () => {
	const closure = ['@soldy-ui/core', '@soldy-ui/vue']
	const fromTarball = (name: string, resolved: string | undefined): boolean =>
		resolved === `file:../tarballs/${name.slice(10)}.tgz`

	/** A lock with these entries of `packages`. */
	const lock = (packages: Readonly<Record<string, TManifest>>): TManifest => ({
		lockfileVersion: 3,
		packages: { '': { name: 'app' }, 'node_modules/vue': { version: '3.5.44' }, ...packages },
	})

	it('каждый пакет — один раз, наверху и из тарболла: без нарушений', () => {
		const entries = {
			'node_modules/@soldy-ui/core': { resolved: 'file:../tarballs/core.tgz' },
			'node_modules/@soldy-ui/vue': { resolved: 'file:../tarballs/vue.tgz' },
		}

		expect(lockProblems(lock(entries), closure, fromTarball)).toEqual([])
	})

	it('вторая копия, пакет не из тарболла и непоставленный пакет — нарушения', () => {
		const entries = {
			'node_modules/@soldy-ui/core': {
				resolved: 'https://registry.npmjs.org/@soldy-ui/core/-/core-1.0.0.tgz',
			},
			'node_modules/@soldy-ui/theme-oren/node_modules/@soldy-ui/core': {
				resolved: 'file:../tarballs/core.tgz',
			},
		}

		expect(lockProblems(lock(entries), closure, fromTarball)).toEqual([
			'@soldy-ui/core: поставлен не оттуда — https://registry.npmjs.org/@soldy-ui/core/-/core-1.0.0.tgz',
			'@soldy-ui/core: вторая копия в node_modules/@soldy-ui/theme-oren/node_modules/@soldy-ui/core',
			'@soldy-ui/vue: не поставлен',
		])
	})
})

describe('строки вывода о библиотеке', () => {
	it('модуль внутри поставленного пакета и предупреждение с именем пакета — о библиотеке', () => {
		const output = [
			'✓ 1077 modules transformed.',
			'[vite-plugin-svelte] node_modules/@soldy-ui/svelte/dist/components/Button.svelte:3:1 Unused CSS',
			'npm warn ERESOLVE overriding peer dependency @soldy-ui/core@1.0.0',
			'node_modules\\@soldy-ui\\react\\dist\\index.js (1:0): Module level directives cause errors',
		].join('\n')

		expect(libraryLines(output)).toEqual([
			'[vite-plugin-svelte] node_modules/@soldy-ui/svelte/dist/components/Button.svelte:3:1 Unused CSS',
			'npm warn ERESOLVE overriding peer dependency @soldy-ui/core@1.0.0',
			'node_modules\\@soldy-ui\\react\\dist\\index.js (1:0): Module level directives cause errors',
		])
	})

	// Nitro names the chunks of the server after the packages in them
	it('файл сборки, названный по пакету, — не о библиотеке', () => {
		expect(
			libraryLines('.output/server/_libs/@soldy-ui/core.mjs   813.05 kB │ gzip: 207.05 kB'),
		).toEqual([])
	})

	it('цвета терминала снимаются', () => {
		const escape = String.fromCharCode(27)

		expect(
			libraryLines(`${escape}[33mnpm warn${escape}[39m peer @soldy-ui/core@1.0.0`),
		).toEqual(['npm warn peer @soldy-ui/core@1.0.0'])
	})
})
