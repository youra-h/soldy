import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Guard of the rule "a part that is off is not mounted" (AGENTS.md, «Часть,
 * которая выключена, не монтируется»). A library template never hands
 * `rendered` to a nested component of its own — the cross of a tab, a tag, a
 * toast, the header buttons of Dialog and Drawer: `rendered=false` hides the
 * root of the part, but the part still assembles its instance, exchange and
 * plugins, in every tab of every set. The template mounts such a part
 * conditionally instead — `v-if`, a ternary, `{#if}`, `Show`, `@if`.
 *
 * Web Components build their parts imperatively and keep an off part
 * detached: a custom element assembles on connection, so a detached part
 * costs only its node, and there is no template attribute to scan.
 *
 * The scan reads the template source without comments, like the other source
 * guards (`framework-mechanisms-components.spec.ts`): it catches the
 * attribute name, not its meaning.
 */

const ROOT = resolve(__dirname, '../../..')

const ADAPTERS = [
	{ framework: 'vue', extensions: /\.vue$/ },
	{ framework: 'react', extensions: /\.tsx$/ },
	{ framework: 'svelte', extensions: /\.svelte$/ },
	{ framework: 'solid', extensions: /\.tsx$/ },
	{ framework: 'angular', extensions: /\.html$/ },
]

/** `rendered` as an attribute of a template element: `:rendered=`, `rendered={`, `[rendered]=`. */
const RENDERED_ATTRIBUTE = /(?:^|[\s<])(?::|v-bind:|\[)?rendered\]?=/m

function stripComments(source: string): string {
	return source
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
		.replace(/\/\/.*$/gm, '')
}

function collectFiles(dir: string, extensions: RegExp, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) collectFiles(full, extensions, files)
		else if (extensions.test(name)) files.push(full)
	}

	return files
}

describe('выключенная часть не монтируется', () => {
	it('сторож узнаёт `rendered` элемента шаблона во всех записях', () => {
		expect(RENDERED_ATTRIBUTE.test('<Button\n\t:rendered="closable"')).toBe(true)
		expect(RENDERED_ATTRIBUTE.test('<Button\n\trendered={closable}')).toBe(true)
		expect(RENDERED_ATTRIBUTE.test('<button so-button [rendered]="closable"')).toBe(true)
		expect(RENDERED_ATTRIBUTE.test('<div v-if="rendered" v-show="visible">')).toBe(false)
		expect(RENDERED_ATTRIBUTE.test('const { rendered, tag } = state')).toBe(false)
		expect(RENDERED_ATTRIBUTE.test('<Show when={state.rendered}>')).toBe(false)
	})

	for (const { framework, extensions } of ADAPTERS) {
		it(`${framework}: шаблоны src/components/** не передают частям \`rendered\``, () => {
			const dir = join(ROOT, 'packages/ui', framework, 'src/components')
			const violations = collectFiles(dir, extensions)
				.filter((file) =>
					RENDERED_ATTRIBUTE.test(stripComments(readFileSync(file, 'utf-8'))),
				)
				.map((file) => relative(ROOT, file).split('\\').join('/'))

			expect(
				violations,
				'Часть с `rendered` собирается и выключенной — монтируйте её условием' +
					` (AGENTS.md, «Выключенная часть не монтируется»):\n${violations.join('\n')}`,
			).toEqual([])
		})
	}
})
