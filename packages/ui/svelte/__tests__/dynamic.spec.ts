/**
 * The root by `tag` (`Dynamic`) reads its `children` once and renders them by
 * a call, not by a `{@render}` block (AGENTS.md (Svelte), «Корень по `tag`»):
 * the markup between `<Dynamic>` and `</Dynamic>` is one function of the
 * parent instance and never changes. A snippet handed to it as a prop could
 * change, and the root would keep the first one — so no template hands it one.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'svelte/compiler'

const SRC = join(import.meta.dirname, '../src')

function collectFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) collectFiles(full, files)
		else if (name.endsWith('.svelte')) files.push(full)
	}

	return files
}

type TNode = { type?: unknown; name?: unknown; attributes?: unknown }

/** Attributes of every `<Dynamic>` of the template, by name; a spread is `...`. */
function dynamicAttributes(source: string): string[][] {
	const found: string[][] = []

	function walk(value: unknown): void {
		if (Array.isArray(value)) {
			value.forEach(walk)

			return
		}

		if (typeof value !== 'object' || value === null) return

		const node: TNode = value

		if (
			node.type === 'Component' &&
			node.name === 'Dynamic' &&
			Array.isArray(node.attributes)
		) {
			found.push(
				node.attributes.map((attribute: TNode) =>
					attribute.type === 'SpreadAttribute' ? '...' : String(attribute.name),
				),
			)
		}

		Object.values(value).forEach(walk)
	}

	walk(parse(source, { modern: true }).fragment)

	return found
}

describe('Dynamic', () => {
	it('сторож видит атрибуты `Dynamic` в шаблоне', () => {
		expect(
			dynamicAttributes('<Dynamic rendered tag="div" {children} {...rest}>x</Dynamic>'),
		).toEqual([['rendered', 'tag', 'children', '...']])
	})

	it('шаблоны отдают `Dynamic` содержимое только разметкой, а не пропом', () => {
		const files = collectFiles(SRC)
		const violations = files
			.filter((file) =>
				dynamicAttributes(readFileSync(file, 'utf-8')).some(
					(names) => names.includes('children') || names.includes('...'),
				),
			)
			.map((file) => relative(SRC, file).split('\\').join('/'))

		expect(files.some((file) => readFileSync(file, 'utf-8').includes('<Dynamic'))).toBe(true)
		expect(violations).toEqual([])
	})
})
