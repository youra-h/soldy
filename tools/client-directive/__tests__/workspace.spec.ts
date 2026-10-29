import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import {
	findClientModules,
	hasClientDirective,
	importsOfModule,
	importsWithParts,
} from '../client-directive.ts'
import type { TBuiltModule } from '../client-directive.ts'

/**
 * Guard of the mark of client modules (docs/agents/build.md, «Сборка пакетов»)
 * on the built workspace: a package that renders React — `react` in its
 * `peerDependencies` — opens every client module of its build with
 * `'use client'` and no other module, and its entry and its modules of parts
 * stay server modules. The rule is in `client-directive.ts`, the bundle
 * applies it (`plugin.ts`); here are the modules as they lie in `dist`.
 *
 * The packages are the queue of the root `build`, each found through its
 * workspace link in `node_modules`, as `package-builds.spec.ts` finds them: a
 * new package that renders React falls under the check by itself. The modules
 * are the ones the entries of the package reach through their imports — the
 * application loads nothing else.
 *
 * The output of the build is read, so the check runs after `npm run build` —
 * the CI step «Директива 'use client' у модулей React» — and not in the
 * `__tests__` of the package: the test jobs build nothing. An unbuilt package
 * fails: its entries are not there.
 */

const ROOT = resolve(__dirname, '../../..')

type TManifest = Readonly<Record<string, unknown>>

function isRecord(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readManifest(dir: string): TManifest {
	const parsed: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))

	if (!isRecord(parsed)) {
		throw new Error(`${dir}/package.json: ожидается объект JSON`)
	}

	return parsed
}

/** A built package that renders React: its name, folder and entries. */
type TReactPackage = {
	readonly name: string
	readonly dir: string
	/** The JS targets of `main` and `exports`, from the package root, without `./`. */
	readonly entries: readonly string[]
}

/** The string targets of an entry field, however deep: conditions, subpaths, arrays. */
function targetsOf(value: unknown): string[] {
	if (typeof value === 'string') {
		return [value]
	}

	if (Array.isArray(value)) {
		return value.flatMap(targetsOf)
	}

	return isRecord(value) ? Object.values(value).flatMap(targetsOf) : []
}

function reactPackages(): TReactPackage[] {
	const { scripts } = readManifest(ROOT)
	const build = isRecord(scripts) ? scripts.build : undefined

	if (typeof build !== 'string') {
		throw new Error('В корневом package.json нет скрипта build')
	}

	return [...build.matchAll(/--workspace=(\S+)/g)].flatMap(([, name]) => {
		const dir = realpathSync(resolve(ROOT, 'node_modules', name))
		const manifest = readManifest(dir)
		const peers = manifest.peerDependencies

		if (!isRecord(peers) || !('react' in peers)) {
			return []
		}

		const entries = [...targetsOf(manifest.main), ...targetsOf(manifest.exports)]
			.filter((target) => /\.m?js$/.test(target))
			.map((target) => posix.normalize(target))

		return [{ name, dir, entries: [...new Set(entries)] }]
	})
}

/** The modules the entries reach through their imports, read from disk. */
function readModules(dir: string, entries: readonly string[]): TBuiltModule[] {
	const modules = new Map<string, TBuiltModule>()
	const queue = [...entries]

	for (const path of queue) {
		if (!modules.has(path)) {
			const module = { path, text: readFileSync(join(dir, path), 'utf-8') }

			modules.set(path, module)
			queue.push(...importsOfModule(module).modules)
		}
	}

	return [...modules.values()]
}

const packages = reactPackages()

describe("модули React открываются 'use client'", () => {
	it('воркспейс собирает пакеты на React', () => {
		expect(packages.map(({ name }) => name)).not.toEqual([])
	})

	describe.each(packages)('$name', ({ dir, entries }) => {
		const missing = entries.filter((entry) => !existsSync(join(dir, entry)))

		it('точки входа собраны', () => {
			expect(entries).not.toEqual([])
			expect(missing, 'запусти npm run build').toEqual([])
		})

		it.runIf(missing.length === 0)(
			'директива — у каждого клиентского модуля, и только у них',
			() => {
				const modules = readModules(dir, entries)
				const client = new Set(findClientModules(modules))
				const violations = modules.flatMap(({ path, text }) => {
					const marked = hasClientDirective(text)

					if (client.has(path) && !marked) {
						return [
							`${path}: React достижим через импорты, а 'use client' в начале нет`,
						]
					}

					if (!client.has(path) && marked) {
						return [
							`${path}: 'use client' у модуля, которому React не нужен, который только реэкспортирует или только вешает части на владельца`,
						]
					}

					return []
				})

				// Not idle: the build has client modules at all
				expect(client.size).toBeGreaterThan(0)
				expect(violations).toEqual([])
			},
		)

		// A Server Component imports the types and the helpers of the package
		// from its entry. A client entry would hand it a reference instead of
		// every export, a helper without React too
		it.runIf(missing.length === 0)('вход — серверный модуль', () => {
			const client = new Set(findClientModules(readModules(dir, entries)))

			expect(entries.filter((entry) => client.has(entry))).toEqual([])
		})

		// A Server Component writes the parts through the owner (`Tabs.Item`)
		// only while the module that hangs them on it is a server module: any
		// other code in that module makes it a client one, and the Server
		// Component gets the owner as a reference without its parts
		it.runIf(missing.length === 0)('модуль частей — серверный', () => {
			const modules = readModules(dir, entries)
			const client = new Set(findClientModules(modules))
			const parts = modules
				.filter(({ text }) => importsWithParts(text))
				.map(({ path }) => path)

			// Not idle: the build hangs parts at all
			expect(parts).not.toEqual([])
			expect(parts.filter((path) => client.has(path))).toEqual([])
		})
	})
})
