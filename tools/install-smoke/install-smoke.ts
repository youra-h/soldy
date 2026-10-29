/**
 * The install run (docs/agents/build.md, «Прогон установки»): the library
 * packages as npm ships them, installed into clean projects of every framework
 * — Vite with each adapter, Angular CLI and the server frameworks — which then
 * type-check, build, render on the server and come alive in Chromium.
 *
 * The tests of the packages read their neighbors from sources, so none of them
 * sees what only a user sees: a file missing from a tarball, an export
 * condition, `sideEffects`, a directive the bundler drops, the theme's CSS, the
 * range of a peer. The run installs tarballs (`npm pack`), not workspace links,
 * so the manifests and `files` are judged as they are published.
 *
 * This module holds the rules; `cli.ts` runs the processes and the browser.
 */

/** A manifest as it is: fields are checked one by one, not taken on trust. */
export type TManifest = Readonly<Record<string, unknown>>

/** How the run serves a built project. */
export type TServe =
	/** A static site: the run serves the folder itself, and the browser draws the page. */
	| { readonly kind: 'static'; readonly dir: string }
	/**
	 * The project's own server, `npm start` with the port in `PORT`: it renders
	 * the page, and the browser hydrates it.
	 */
	| { readonly kind: 'server' }

/** A project of the run: a folder under `projects/` and a key of the CI matrix. */
export type TProject = {
	readonly name: string
	/** What it is, for the report: `Vite + Vue`. */
	readonly title: string
	readonly serve: TServe
}

/**
 * The projects, one per target: Vite with each adapter, Angular CLI, and the
 * server frameworks of each adapter that has a server render. The order is the
 * order of the CI matrix.
 */
export const PROJECTS: readonly TProject[] = [
	{ name: 'vue', title: 'Vite + Vue', serve: { kind: 'static', dir: 'dist' } },
	{ name: 'react', title: 'Vite + React', serve: { kind: 'static', dir: 'dist' } },
	{ name: 'svelte', title: 'Vite + Svelte', serve: { kind: 'static', dir: 'dist' } },
	{ name: 'solid', title: 'Vite + Solid', serve: { kind: 'static', dir: 'dist' } },
	{
		name: 'webc',
		title: 'Vite + Web Components',
		serve: { kind: 'static', dir: 'dist' },
	},
	{
		name: 'angular',
		title: 'Angular CLI',
		serve: { kind: 'static', dir: 'dist/app/browser' },
	},
	{ name: 'nuxt', title: 'Nuxt', serve: { kind: 'server' } },
	{ name: 'next', title: 'Next.js (App Router)', serve: { kind: 'server' } },
	{ name: 'sveltekit', title: 'SvelteKit', serve: { kind: 'server' } },
	{ name: 'solid-start', title: 'SolidStart', serve: { kind: 'server' } },
	{ name: 'angular-ssr', title: 'Angular SSR', serve: { kind: 'server' } },
]

/** The scope of the library: every package of it is named `@soldy-ui/*`. */
const SCOPE = '@soldy-ui/'

function isObject(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A dependency field of a manifest: name → spec. */
function specsIn(field: unknown): Map<string, string> {
	if (!isObject(field)) {
		return new Map()
	}

	return new Map(
		Object.entries(field).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		),
	)
}

/** The library packages a project names itself, in `dependencies` or `devDependencies`. */
export function libraryNamesOf(manifest: TManifest): string[] {
	return [...specsIn(manifest.dependencies).keys(), ...specsIn(manifest.devDependencies).keys()]
		.filter((name) => name.startsWith(SCOPE))
		.sort()
}

/**
 * The library packages a project installs: the ones it names and, transitively,
 * every library package they depend on — in `dependencies` or as a peer. A name
 * that is not a library package of the workspace is an error: the project
 * would install it from the registry.
 */
export function libraryClosure(
	direct: readonly string[],
	manifests: ReadonlyMap<string, TManifest>,
): string[] {
	const seen = new Set<string>()

	const visit = (name: string): void => {
		if (seen.has(name)) {
			return
		}

		const manifest = manifests.get(name)

		if (manifest === undefined) {
			throw new Error(`${name}: такого библиотечного пакета в воркспейсе нет`)
		}

		seen.add(name)

		for (const dep of [
			...specsIn(manifest.dependencies).keys(),
			...specsIn(manifest.peerDependencies).keys(),
		]) {
			if (dep.startsWith(SCOPE)) {
				visit(dep)
			}
		}
	}

	direct.forEach(visit)

	return [...seen].sort()
}

/** A field with the library specs replaced; the other entries stay as written. */
function replaceSpecs(field: unknown, specs: ReadonlyMap<string, string>): unknown {
	if (!isObject(field)) {
		return field
	}

	return Object.fromEntries(
		Object.entries(field).map(([name, spec]) => [name, specs.get(name) ?? spec]),
	)
}

/**
 * The project's manifest with the library from tarballs. Every library package
 * the project names points to its tarball (`file:`), and the rest of the
 * closure joins `dependencies` as well: a package left to npm would come from
 * the registry — the published version, not the build under test. Hoisting puts
 * them at the top of `node_modules` either way, so the tree is the one a user
 * gets.
 *
 * `specs` maps every package of the closure to its spec.
 */
export function withTarballs(manifest: TManifest, specs: ReadonlyMap<string, string>): TManifest {
	const named = new Set(libraryNamesOf(manifest))
	const missing = Object.fromEntries([...specs].filter(([name]) => !named.has(name)))
	const dependencies = replaceSpecs(manifest.dependencies, specs)

	return {
		...manifest,
		dependencies: { ...(isObject(dependencies) ? dependencies : {}), ...missing },
		devDependencies: replaceSpecs(manifest.devDependencies, specs),
	}
}

/**
 * The project's manifest with the library from the registry: every library
 * package it names takes `spec` — a version or a dist-tag (`0.3.0`, `beta`),
 * and npm brings the rest of the closure by their manifests, as at a user's.
 */
export function withRegistry(manifest: TManifest, spec: string): TManifest {
	const specs = new Map(libraryNamesOf(manifest).map((name) => [name, spec]))

	return {
		...manifest,
		dependencies: replaceSpecs(manifest.dependencies, specs),
		devDependencies: replaceSpecs(manifest.devDependencies, specs),
	}
}

/** The package an entry of `packages` in a lock describes: `node_modules/a/node_modules/@b/c` → `@b/c`. */
function lockedName(key: string): string | undefined {
	const at = key.lastIndexOf('node_modules/')

	return at < 0 ? undefined : key.slice(at + 'node_modules/'.length)
}

/**
 * What is wrong with the library in a project's lock (`package-lock.json`
 * after the install); an empty list — nothing.
 *
 * - every package of the closure is installed, once and at the top: a second
 *   copy is a second class of every component, and the registries, which
 *   recognize a type by `instanceof`, stop recognizing it;
 * - every copy comes from where the run took it: `source` says whether the
 *   `resolved` of the entry is right (the tarball's spec, or the registry).
 */
export function lockProblems(
	lock: TManifest,
	closure: readonly string[],
	source: (name: string, resolved: string | undefined) => boolean,
): string[] {
	const problems: string[] = []
	const packages = isObject(lock.packages) ? lock.packages : {}
	const found = new Set<string>()

	for (const [key, entry] of Object.entries(packages)) {
		const name = lockedName(key)

		if (name === undefined || !name.startsWith(SCOPE)) {
			continue
		}

		if (key !== `node_modules/${name}`) {
			problems.push(`${name}: вторая копия в ${key}`)
			continue
		}

		found.add(name)

		const resolved =
			isObject(entry) && typeof entry.resolved === 'string' ? entry.resolved : undefined

		if (!source(name, resolved)) {
			problems.push(`${name}: поставлен не оттуда — ${resolved ?? 'без resolved'}`)
		}
	}

	for (const name of closure) {
		if (!found.has(name)) {
			problems.push(`${name}: не поставлен`)
		}
	}

	return problems
}

/** A path inside an installed library package: what a bundler or a compiler reports a module by. */
const INSTALLED = /node_modules[\\/]@soldy-ui[\\/]/

/** A warning, as the tools of the projects mark one: npm, Vite, Rolldown, Angular CLI. */
const WARNING = /warn|\(!\)|▲/i

/** Colors of a terminal: the tools color their output, and a color code splits words. */
const COLOR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

/**
 * Lines of a tool's output that report on the library: a path inside an
 * installed package — a module the bundler or the compiler of a framework
 * warns about (`node_modules/@soldy-ui/svelte/dist/…`) — or a warning that
 * names a package (npm on a peer it overrode). The install, the type check
 * and the build of a clean project have nothing to say about the library when
 * it is in order, so such a line is a defect of the package. A file the
 * bundler names after a package (`.output/server/_libs/@soldy-ui/core.mjs`) is
 * neither.
 */
export function libraryLines(output: string): string[] {
	return output
		.split(/\r?\n/)
		.map((line) => line.replace(COLOR, '').trim())
		.filter((line) => INSTALLED.test(line) || (line.includes(SCOPE) && WARNING.test(line)))
}
