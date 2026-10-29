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
 * one of the two kinds of module that run nothing of React themselves:
 *
 * - **nothing but imports and exports** (`reexportsOnly`). What it re-exports
 *   carries its own mark. So the entry of the package stays a server module —
 *   a Server Component imports its types and its helpers without React as
 *   they are, and every component comes as a reference from the module that
 *   defines it. With the mark on the entry a Server Component would get a
 *   reference instead of every helper as well;
 * - **a module of parts** (`isPartsModule`): besides imports and exports, only
 *   declarations `X = withParts(<name>, { <key>: <name>, … })`, with
 *   `withParts` imported from `@soldy-ui/setup`. On the server its imports of
 *   client modules are references, and `withParts` — `Object.assign`, it needs
 *   no React — hangs the references of the parts on the reference of the
 *   owner: a Server Component writes `Tabs.Item` as a Client Component does.
 *   With the mark on the module of parts it would get the owner as a
 *   reference of that module, without the parts. Every argument is a name,
 *   since a call there (`withRenderBoundary(Impl)`) would call a reference on
 *   the server, and a reference throws when called: a module with any other
 *   code stays a client one, and its parts are gone again.
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
 * The statements of the module after its directives: what runs when it is
 * imported.
 */
function bodyOf(source: ts.SourceFile): readonly ts.Statement[] {
	return source.statements.slice(prologueOf(source).length)
}

/** An import or an export: `export { … }`, `export … from`, `export * from`. */
function isImportOrExport(statement: ts.Statement): boolean {
	return ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
}

/**
 * Whether the module is nothing but imports and exports, directives aside: it
 * runs nothing itself.
 */
export function reexportsOnly(text: string): boolean {
	return bodyOf(parse(text)).every(isImportOrExport)
}

/** The package of the function that hangs parts on an owner, and its name there. */
const PARTS_PACKAGE = '@soldy-ui/setup'
const PARTS_FUNCTION = 'withParts'

/**
 * The local names the module imports `withParts` of `@soldy-ui/setup` under:
 * its own name, or another one the bundle gave it (`withParts as withParts$1`).
 */
function partsFunctionNames(source: ts.SourceFile): Set<string> {
	const names = new Set<string>()

	for (const statement of source.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier) ||
			statement.moduleSpecifier.text !== PARTS_PACKAGE
		) {
			continue
		}

		const bindings = statement.importClause?.namedBindings

		if (bindings !== undefined && ts.isNamedImports(bindings)) {
			for (const element of bindings.elements) {
				if ((element.propertyName ?? element.name).text === PARTS_FUNCTION) {
					names.add(element.name.text)
				}
			}
		}
	}

	return names
}

/** Whether the module imports `withParts` of `@soldy-ui/setup`, under any local name. */
export function importsWithParts(text: string): boolean {
	return partsFunctionNames(parse(text)).size > 0
}

/** A part as `withParts` takes it: `Item: TabsItem` or `Item`, a name and no call. */
function isPartProperty(property: ts.ObjectLiteralElementLike): boolean {
	if (ts.isShorthandPropertyAssignment(property)) {
		return property.objectAssignmentInitializer === undefined
	}

	return (
		ts.isPropertyAssignment(property) &&
		!ts.isComputedPropertyName(property.name) &&
		ts.isIdentifier(property.initializer)
	)
}

/**
 * Whether the expression is `withParts(<name>, { <key>: <name>, … })`, with
 * `withParts` under one of `names`.
 */
function isPartsCall(expression: ts.Expression, names: ReadonlySet<string>): boolean {
	if (
		!ts.isCallExpression(expression) ||
		!ts.isIdentifier(expression.expression) ||
		!names.has(expression.expression.text) ||
		expression.arguments.length !== 2
	) {
		return false
	}

	const [owner, parts] = expression.arguments

	return (
		ts.isIdentifier(owner) &&
		ts.isObjectLiteralExpression(parts) &&
		parts.properties.every(isPartProperty)
	)
}

/**
 * Whether the statement declares owners with parts, and nothing else:
 * `export const X = withParts(…)` as the source writes it, `var X = withParts(…)`
 * as the bundle does.
 */
function isPartsDeclaration(statement: ts.Statement, names: ReadonlySet<string>): boolean {
	return (
		ts.isVariableStatement(statement) &&
		(statement.modifiers ?? []).every(({ kind }) => kind === ts.SyntaxKind.ExportKeyword) &&
		statement.declarationList.declarations.every(
			({ name, initializer }) =>
				ts.isIdentifier(name) &&
				initializer !== undefined &&
				isPartsCall(initializer, names),
		)
	)
}

/**
 * Whether the module is a module of parts — see the rule above: besides
 * imports and exports, directives aside, nothing but declarations of owners
 * with parts, and one of them at least.
 */
export function isPartsModule(text: string): boolean {
	const source = parse(text)
	const names = partsFunctionNames(source)
	const body = bodyOf(source)

	return (
		body.some((statement) => isPartsDeclaration(statement, names)) &&
		body.every(
			(statement) => isImportOrExport(statement) || isPartsDeclaration(statement, names),
		)
	)
}

/** Whether the module of the build is a client module — see the rule above. */
export function isClientModule(module: string, text: string, importsOf: TImportsOf): boolean {
	return reachesReact(module, importsOf) && !reexportsOnly(text) && !isPartsModule(text)
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
