/**
 * The binding reaches the template whole: a spread of it in `setup()` reads
 * every value once and unties the markup from the core — the template would
 * show the state of the setup moment (`src/adapter/runtime/view.ts`). A
 * component joins its facades with `joinBindings` and adds its own values with
 * `extendBinding`; the one spread left in a component's setup is
 * `...useSplitAttrs()`, whose values are computed refs.
 *
 * The guard parses every `setup.component.ts` under `src/components` and lists
 * the spreads — in objects, arrays and arguments — of anything other than a
 * call of `useSplitAttrs()`.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import * as ts from 'typescript'

const COMPONENTS = resolve(import.meta.dirname, '../src/components')

/** Setups of the components — the path from `src/components`, with `/`. */
const setups = readdirSync(COMPONENTS, { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('setup.component.ts'))
	.map((file) => file.split(sep).join('/'))
	.sort()

/** A call of `useSplitAttrs()` without arguments. */
function isSplitAttrs(expression: ts.Expression): boolean {
	return (
		ts.isCallExpression(expression) &&
		ts.isIdentifier(expression.expression) &&
		expression.expression.text === 'useSplitAttrs' &&
		expression.arguments.length === 0
	)
}

/** Spreads other than `...useSplitAttrs()` in the source: the line and the text. */
function spreadsIn(text: string): string[] {
	const source = ts.createSourceFile('setup.ts', text, ts.ScriptTarget.Latest, true)
	const found: string[] = []
	const visit = (node: ts.Node): void => {
		if (
			(ts.isSpreadAssignment(node) || ts.isSpreadElement(node)) &&
			!isSplitAttrs(node.expression)
		) {
			const { line } = source.getLineAndCharacterOfPosition(node.getStart())

			found.push(`${line + 1}: ${node.getText()}`)
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return found
}

describe('сторож находит спред', () => {
	it('связки, свой и в массиве — да; useSplitAttrs() — нет', () => {
		expect(
			spreadsIn(
				[
					'const a = { ...useAdapter(adapter, props, emit), tag }',
					'const b = { ...refs, ...refsCollection }',
					'const c = [...items]',
					'const d = extendBinding(binding, { ...useSplitAttrs() })',
				].join('\n'),
			),
		).toEqual([
			'1: ...useAdapter(adapter, props, emit)',
			'2: ...refs',
			'2: ...refsCollection',
			'3: ...items',
		])
	})
})

describe('связка уходит в шаблон целиком: спред в setup — только useSplitAttrs()', () => {
	it('setup компонентов найдены', () => {
		expect(setups.length).toBeGreaterThan(50)
	})

	it.each(setups)('%s', (file) => {
		expect(spreadsIn(readFileSync(join(COMPONENTS, file), 'utf8'))).toEqual([])
	})
})
