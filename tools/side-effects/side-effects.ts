import ts from 'typescript'

/**
 * `"sideEffects"` in a package manifest tells the application's bundler which
 * modules of the package it may drop when nothing is imported from them (see
 * docs/agents/build.md, «Сборка пакетов»). Without the field the bundler keeps
 * every module a barrel re-exports: an application with one button got every
 * component of the core, every plugin and every component of the adapter.
 *
 * The declaration is a promise about the code, and a broken promise is silent:
 * a module that registers something when imported works in development, where
 * nothing is dropped, and loses the registration in a production build. Hence
 * the rule here: a module of a package declared free of side effects does
 * nothing at its top level but declare — no call, no assignment, no import for
 * the effect.
 *
 * Initializers are not effects here: `const X = definePlugin({…})` computes the
 * value the module exports, and a bundler drops it together with the module
 * nobody imports from — which is the point of the declaration.
 */

/** A top-level statement that runs for its effect, not to declare a value. */
export type TModuleEffect = {
	/** 1-based line in the file as written, not in its module view. */
	readonly line: number
	/** The statement, first line only. */
	readonly text: string
}

/** Attribute-aware `<script>` block: quoted values may hold `>` (`generics="…"`). */
const SCRIPT_BLOCK = /<script((?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?)>([\s\S]*?)<\/script\s*>/g

type TScriptBlock = {
	readonly attributes: string
	readonly content: string
	/** Offset of the content in the file. */
	readonly offset: number
}

function scriptBlocks(text: string): TScriptBlock[] {
	return [...text.matchAll(SCRIPT_BLOCK)].map((match) => ({
		attributes: match[1] ?? '',
		content: match[2] ?? '',
		offset: (match.index ?? 0) + match[0].indexOf('>') + 1,
	}))
}

function hasAttribute(attributes: string, name: string): boolean {
	return new RegExp(`(?:^|\\s)${name}(?:[\\s=]|$)`).test(attributes)
}

/** A piece of a file that runs as module code, with its offset in the file. */
type TModuleChunk = {
	readonly source: ts.SourceFile
	readonly offset: number
	/** Only imports of this chunk run at module level. */
	readonly importsOnly: boolean
}

function parse(path: string, content: string): ts.SourceFile {
	const kind = /\.[cm]?tsx$|\.jsx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS

	return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, kind)
}

/**
 * The code of a file that runs once, when the module is imported:
 *
 * - a script module — the whole file;
 * - a Vue component — its `<script>` blocks, except `<script setup>`, which
 *   runs per instance;
 * - a Svelte component — `<script module>`, and of the instance script only
 *   its imports: the compiler lifts them to the module, the rest runs per
 *   instance.
 */
function moduleChunks(path: string, text: string): TModuleChunk[] {
	if (path.endsWith('.vue')) {
		return scriptBlocks(text)
			.filter(({ attributes }) => !hasAttribute(attributes, 'setup'))
			.map(({ content, offset }) => ({
				source: parse(path, content),
				offset,
				importsOnly: false,
			}))
	}

	if (path.endsWith('.svelte')) {
		return scriptBlocks(text).map(({ attributes, content, offset }) => ({
			source: parse(path, content),
			offset,
			importsOnly: !hasAttribute(attributes, 'module'),
		}))
	}

	return [{ source: parse(path, text), offset: 0, importsOnly: false }]
}

/** Statements that only run something: loops, branches, blocks, `throw`. */
const CONTROL_FLOW = new Set([
	ts.SyntaxKind.Block,
	ts.SyntaxKind.IfStatement,
	ts.SyntaxKind.DoStatement,
	ts.SyntaxKind.WhileStatement,
	ts.SyntaxKind.ForStatement,
	ts.SyntaxKind.ForInStatement,
	ts.SyntaxKind.ForOfStatement,
	ts.SyntaxKind.SwitchStatement,
	ts.SyntaxKind.LabeledStatement,
	ts.SyntaxKind.ThrowStatement,
	ts.SyntaxKind.TryStatement,
])

/** Directives such as `'use client'`: string literals alone at the top of the module. */
function prologueLength(statements: readonly ts.Statement[]): number {
	const index = statements.findIndex(
		(statement) =>
			!(ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)),
	)

	return index === -1 ? statements.length : index
}

function isEffect(statement: ts.Statement): boolean {
	if (ts.isImportDeclaration(statement)) {
		return statement.importClause === undefined
	}

	if (ts.isClassDeclaration(statement)) {
		return statement.members.some(ts.isClassStaticBlockDeclaration)
	}

	return ts.isExpressionStatement(statement) || CONTROL_FLOW.has(statement.kind)
}

/** Top-level statements of a module that run for their effect. */
export function findModuleEffects(path: string, text: string): TModuleEffect[] {
	return moduleChunks(path, text).flatMap(({ source, offset, importsOnly }) =>
		source.statements
			.slice(prologueLength(source.statements))
			.filter((statement) => !importsOnly || ts.isImportDeclaration(statement))
			.filter(isEffect)
			.map((statement) => {
				const start = offset + statement.getStart(source)

				return {
					line: text.slice(0, start).split('\n').length,
					text: statement.getText(source).split('\n')[0] ?? '',
				}
			}),
	)
}

/**
 * A `sideEffects` pattern as webpack reads it — the bundler that drops even a
 * stylesheet the field does not cover: a path from the package root, `./`
 * optional; a pattern without `/` matches the file name in any folder; `*` —
 * within one folder, `**` — across folders.
 */
function patternExpression(pattern: string): RegExp {
	const relative = pattern.replace(/^\.\//, '')
	const anywhere = relative.includes('/') ? relative : `**/${relative}`
	const source = anywhere
		.split(/(\*\*\/|\*\*|\*)/)
		.map((part) => {
			if (part === '**/') return '(?:.*/)?'
			if (part === '**') return '.*'
			if (part === '*') return '[^/]*'

			return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		})
		.join('')

	return new RegExp(`^${source}$`)
}

/**
 * Whether the bundler keeps the file for its effect when nothing is imported
 * from it. `path` is from the package root, through `/`.
 */
export function keepsForEffect(sideEffects: unknown, path: string): boolean {
	const relative = path.replace(/^\.\//, '')

	if (Array.isArray(sideEffects)) {
		return sideEffects.some(
			(pattern) => typeof pattern === 'string' && patternExpression(pattern).test(relative),
		)
	}

	return sideEffects !== false
}
