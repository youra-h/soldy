import fs from 'node:fs'
import path from 'node:path'
import { compile, optimize } from '@tailwindcss/node'

/**
 * The Tailwind step of a shadcn/ui application, run by hand: `globals.css`
 * compiled with the classes of this folder's components into `styles.css`, as
 * `@tailwindcss/vite` would hand it to the app's build (which then minifies
 * it). The stand's Vite config has no Tailwind plugin, so the compiled sheet
 * is kept next to the pages; run again after changing a class, then format it
 * (the repository checks formatting of every file):
 *
 *   node libs/react/shadcn/tailwind.mjs
 *   npx prettier --write libs/react/shadcn/styles.css
 *
 * Candidates are every whitespace-separated token of the string literals of
 * `*.tsx` and `ui/*.tsx` — a superset of the classes, as Tailwind's own
 * scanner takes; tokens that are no utilities produce nothing.
 */
const here = import.meta.dirname
const input = path.join(here, 'globals.css')
const sources = [here, path.join(here, 'ui')].flatMap((dir) =>
	fs
		.readdirSync(dir)
		.filter((file) => /\.tsx?$/.test(file))
		.map((file) => fs.readFileSync(path.join(dir, file), 'utf8')),
)
const candidates = new Set()

/** String literals of a source, comments dropped first: their apostrophes are no quotes. */
function literals(source) {
	const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
	const found = []

	for (let at = 0; at < code.length; at++) {
		const quote = code[at]

		if (quote !== '"' && quote !== "'" && quote !== '`') continue

		let end = at + 1

		while (end < code.length && code[end] !== quote) end += code[end] === '\\' ? 2 : 1

		found.push(code.slice(at + 1, end))
		at = end
	}

	return found
}

for (const source of sources) {
	for (const text of literals(source)) {
		for (const token of text.split(/\s+/)) if (token) candidates.add(token)
	}
}

const compiler = await compile(fs.readFileSync(input, 'utf8'), {
	base: here,
	from: input,
	onDependency: () => {},
})
const { code } = optimize(compiler.build([...candidates]), { minify: false })

fs.writeFileSync(path.join(here, 'styles.css'), code)
console.log(`styles.css: ${code.length} bytes, ${candidates.size} candidates`)
