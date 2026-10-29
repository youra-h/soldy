import { posix } from 'node:path'
import ts from 'typescript'
import { specifiersOf } from '../published-imports/published-imports.ts'

/**
 * React Server Components — the Next.js App Router and the like — run every
 * module a Server Component imports on the server, under the server build of
 * React (the `react-server` condition): it has no state, no effects and no
 * context, so `createContext` at the top of a module throws on import, and a
 * hook throws when called. A module that opens with the directive
 * `'use client'` is not run there: the application's bundler hands its exports
 * to the Server Component as references and renders them on the client (see
 * docs/agents/build.md, «Сборка пакетов»).
 *
 * The rule of the React adapter: a module of the build is a client module, and
 * opens with the directive, when React is reachable from it through its
 * imports — its own or of the modules it imports, however deep — unless it is
 * nothing but imports and exports. A module like that runs nothing itself:
 * what it re-exports carries its own mark. So the entry of the package stays a
 * server module — a Server Component imports its types and its helpers
 * without React as they are, and every component comes as a reference from
 * the module that defines it. With the mark on the entry a Server Component
 * would get a reference instead of every helper as well.
 *
 * The bundle sets the marks (`plugin.ts`); `findClientModules` reads them back
 * from the files of a build.
 */

/** The directive that opens a client module. */
export const CLIENT_DIRECTIVE = 'use client'

/** What a module imports: modules of the same build and packages. */
export type TModuleImports = {
	/** Modules of the build, by their path in it. */
	readonly modules: readonly string[]
	/** Packages, by specifier as written: `react/jsx-runtime`, `@soldy-ui/setup`. */
	readonly packages: readonly string[]
}

/** The imports of a module of the build by its path; a path outside the build has none. */
export type TImportsOf = (module: string) => TModuleImports

/** A module of a build as it lies: its path through `/` and its text. */
export type TBuiltModule = {
	readonly path: string
	readonly text: string
}

/** React itself: `react`, `react-dom` and their subpaths (`react/jsx-runtime`, `react-dom/client`). */
export function isReactSpecifier(specifier: string): boolean {
	return /^react(?:-dom)?(?:\/|$)/.test(specifier)
}

/** Whether React is reachable from the module through its imports, however deep. */
export function reachesReact(module: string, importsOf: TImportsOf): boolean {
	const seen = new Set([module])
	const queue = [module]

	for (const current of queue) {
		const { modules, packages } = importsOf(current)

		if (packages.some(isReactSpecifier)) {
			return true
		}

		for (const next of modules) {
			if (!seen.has(next)) {
				seen.add(next)
				queue.push(next)
			}
		}
	}

	return false
}

function parse(text: string): ts.SourceFile {
	return ts.createSourceFile('module.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
}

/** Directives: the string literals that stand alone at the top of a module. */
function prologueOf(source: ts.SourceFile): string[] {
	const prologue: string[] = []

	for (const statement of source.statements) {
		if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) {
			break
		}

		prologue.push(statement.expression.text)
	}

	return prologue
}

/**
 * Whether the module opens with `'use client'`: the directive stands in its
 * prologue, before the first statement that is not a directive. Further down
 * it is a plain string, and the application's bundler does not take it for a
 * mark.
 */
export function hasClientDirective(text: string): boolean {
	return prologueOf(parse(text)).includes(CLIENT_DIRECTIVE)
}

/**
 * Whether the module is nothing but imports and exports (`export { … }`,
 * `export … from`, `export * from`), directives aside: it runs nothing itself.
 */
export function reexportsOnly(text: string): boolean {
	const source = parse(text)

	return source.statements
		.slice(prologueOf(source).length)
		.every(
			(statement) => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement),
		)
}

/** Whether the module of the build is a client module — see the rule above. */
export function isClientModule(module: string, text: string, importsOf: TImportsOf): boolean {
	return reachesReact(module, importsOf) && !reexportsOnly(text)
}

/** A specifier of a module of the same build: `./a.js`, `../b/c.js`. */
function isRelative(specifier: string): boolean {
	return specifier.startsWith('./') || specifier.startsWith('../')
}

/**
 * What a module of a build imports, read from its text: a relative specifier
 * is a module of the build, resolved against the module's folder, the rest are
 * packages. Every kind of import counts — `import`, `export … from`,
 * `import()`.
 */
export function importsOfModule({ path, text }: TBuiltModule): TModuleImports {
	const specifiers = [...new Set(specifiersOf({ path, text }))]

	return {
		modules: specifiers
			.filter(isRelative)
			.map((specifier) => posix.normalize(posix.join(posix.dirname(path), specifier))),
		packages: specifiers.filter((specifier) => !isRelative(specifier)),
	}
}

/** The paths of the client modules among the modules of a build, read from their files. */
export function findClientModules(modules: readonly TBuiltModule[]): string[] {
	const imports = new Map(modules.map((module) => [module.path, importsOfModule(module)]))
	const importsOf: TImportsOf = (module) => imports.get(module) ?? { modules: [], packages: [] }

	return modules
		.filter(({ path, text }) => isClientModule(path, text, importsOf))
		.map(({ path }) => path)
}
