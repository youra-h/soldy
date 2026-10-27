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
 * The root of a component is not a part: the root by `tag` of the Svelte
 * adapter (`Dynamic`) takes `rendered` as the condition of its own branches
 * — it mounts nothing while off, as `{#if}` around it did, and saves the
 * block (AGENTS.md (Svelte), «Корень по `tag`»).
 *
 * The scan reads the template source without comments, like the other source
 * guards (`framework-mechanisms-components.spec.ts`): it catches the
 * attribute name, not its meaning.
 */

const ROOT = resolve(__dirname, '../../..')

const ADAPTERS = [
	{ framework: 'vue', extensions: /\.vue$/, roots: [] },
	{ framework: 'react', extensions: /\.tsx$/, roots: [] },
	{ framework: 'svelte', extensions: /\.svelte$/, roots: ['Dynamic'] },
	{ framework: 'solid', extensions: /\.tsx$/, roots: [] },
	{ framework: 'angular', extensions: /\.html$/, roots: [] },
]

/** `rendered` as an attribute of a template element: `:rendered=`, `rendered={`, `[rendered]=`. */
const RENDERED_ATTRIBUTE = /(?:^|[\s<])(?::|v-bind:|\[)?rendered\]?=/gm

/** An element opened in the template: `<Name`. */
const ELEMENT = /<([A-Za-z][\w.:-]*)/g

/** The nearest element opened before `index` — the one the attribute belongs to. */
function elementAt(source: string, index: number): string | undefined {
	let name: string | undefined

	for (const match of source.slice(0, index).matchAll(ELEMENT)) name = match[1]

	return name
}

/** `rendered` handed to an element that is not the root of the component. */
function passesRendered(source: string, roots: readonly string[]): boolean {
	return [...source.matchAll(RENDERED_ATTRIBUTE)].some(
		(match) => !roots.includes(elementAt(source, match.index) ?? ''),
	)
}

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
		expect(passesRendered('<Button\n\t:rendered="closable"', [])).toBe(true)
		expect(passesRendered('<Button\n\trendered={closable}', [])).toBe(true)
		expect(passesRendered('<button so-button [rendered]="closable"', [])).toBe(true)
		expect(passesRendered('<div v-if="rendered" v-show="visible">', [])).toBe(false)
		expect(passesRendered('const { rendered, tag } = state', [])).toBe(false)
		expect(passesRendered('<Show when={state.rendered}>', [])).toBe(false)
	})

	it('сторож пропускает `rendered` корня компонента, но не части в нём', () => {
		const root = '<Dynamic\n\trendered={state.rendered}\n\ttag={state.tag}\n>'

		expect(passesRendered(root, ['Dynamic'])).toBe(false)
		expect(passesRendered(`${root}<Button rendered={closable} /></Dynamic>`, ['Dynamic'])).toBe(
			true,
		)
	})

	for (const { framework, extensions, roots } of ADAPTERS) {
		it(`${framework}: шаблоны src/components/** не передают частям \`rendered\``, () => {
			const dir = join(ROOT, 'packages/ui', framework, 'src/components')
			const violations = collectFiles(dir, extensions)
				.filter((file) => passesRendered(stripComments(readFileSync(file, 'utf-8')), roots))
				.map((file) => relative(ROOT, file).split('\\').join('/'))

			expect(
				violations,
				'Часть с `rendered` собирается и выключенной — монтируйте её условием' +
					` (AGENTS.md, «Выключенная часть не монтируется»):\n${violations.join('\n')}`,
			).toEqual([])
		})
	}
})
