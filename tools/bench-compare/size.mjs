import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { parseArgs } from 'node:util'

/**
 * Build size of a page: a production build where every page of every library
 * — soldy included — is an entry of its own, and tree-shaking leaves it what
 * the page imports (see benchmarks/compare/README.md, «Размер сборки»).
 *
 *   npm run size                     # every framework
 *   npm run size -- --fw react,vue
 *
 * An entry is the library's setup (provider, theme, styles) and one page,
 * mounted once by the framework's `libs/<framework>/mount`; `all` is every
 * compared page of the library. Shared chunks are fine: the size of an entry
 * is the closure of its static imports in the Vite manifest — JS and the CSS
 * those chunks bring — raw, gzip and brotli, each file compressed on its own.
 * Fonts and images the CSS refers to are not counted.
 *
 * The result is `results/size-<framework>.json`. Every framework is a build of
 * its own, into `dist-size/<framework>`: runs of two frameworks never share a
 * folder.
 */
const { values } = parseArgs({
	options: { fw: { type: 'string', default: 'vue,react,angular,svelte,solid,webc' } },
})
const here = (...parts) => path.resolve(import.meta.dirname, ...parts)
const COMPARED = [
	'button',
	'input',
	'check-box',
	'switch',
	'select',
	'tabs',
	'dialog',
	'tooltip',
	'menu',
	'date-picker',
]

/** Pages of a library folder: `<id>.<ext>` for the compared ids. */
function pagesOf(dir) {
	return fs
		.readdirSync(dir)
		.map((file) => ({ file, id: file.replace(/\.[^.]+$/, '') }))
		.filter(({ id }) => COMPARED.includes(id))
		.sort((a, b) => COMPARED.indexOf(a.id) - COMPARED.indexOf(b.id))
}

/** The entry source: setup, pages and the framework's mount. */
function entry(fw, lib, pages) {
	const base = `../../../libs/${fw}`

	return [
		`import { mountPage } from '${base}/mount'`,
		`import * as setup from '${base}/${lib}/setup'`,
		...pages.map((page, index) => `import Page${index} from '${base}/${lib}/${page.file}'`),
		'',
		`const app = document.querySelector('#app') ?? document.body`,
		...pages.map(
			(_, index) =>
				`mountPage(app.appendChild(document.createElement('div')), setup, Page${index}, 1)`,
		),
		'',
	].join('\n')
}

/** Writes the size entries of a framework into `size/<framework>`. */
function writeEntries(fw) {
	const dir = here('libs', fw)
	const root = here('size', fw)

	fs.rmSync(root, { recursive: true, force: true })

	for (const lib of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!lib.isDirectory()) continue

		const pages = pagesOf(path.join(dir, lib.name))
		const target = path.join(root, lib.name)

		fs.mkdirSync(target, { recursive: true })

		for (const page of pages) {
			fs.writeFileSync(path.join(target, `${page.id}.ts`), entry(fw, lib.name, [page]))
		}

		fs.writeFileSync(path.join(target, 'all.ts'), entry(fw, lib.name, pages))
	}
}

/** Raw, gzip and brotli bytes of a built file. */
function weigh(dist, file) {
	const data = fs.readFileSync(path.join(dist, file))

	return {
		raw: data.length,
		gzip: zlib.gzipSync(data, { level: 9 }).length,
		brotli: zlib.brotliCompressSync(data, {
			params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
		}).length,
	}
}

function add(sum, size) {
	for (const key of Object.keys(size)) sum[key] += size[key]
}

/** JS and CSS of an entry: its chunk, its static imports, and their CSS. */
function closure(dist, manifest, key) {
	const js = { raw: 0, gzip: 0, brotli: 0 }
	const css = { raw: 0, gzip: 0, brotli: 0 }
	const seen = new Set()
	const styles = new Set()
	const walk = (name) => {
		if (seen.has(name)) return

		seen.add(name)

		const chunk = manifest[name]

		add(js, weigh(dist, chunk.file))

		for (const file of chunk.css ?? []) styles.add(file)
		for (const next of chunk.imports ?? []) walk(next)
	}

	walk(key)

	for (const file of styles) add(css, weigh(dist, file))

	return { js, css }
}

for (const fw of values.fw.split(',')) {
	if (!fs.existsSync(here('libs', fw))) continue

	writeEntries(fw)
	process.env.SIZE = fw
	await build({ configFile: here('vite.config.ts') })

	const dist = here('dist-size', fw)
	const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'))
	const result = {}

	for (const [key, chunk] of Object.entries(manifest)) {
		const [, lib, id] = key.match(/^size\/[^/]+\/([^/]+)\/([^/.]+)\.ts$/) ?? []

		if (!chunk.isEntry || !lib) continue

		result[lib] ??= {}
		result[lib][id] = closure(dist, manifest, key)
	}

	fs.mkdirSync(here('results'), { recursive: true })
	fs.writeFileSync(here('results', `size-${fw}.json`), JSON.stringify(result, null, '\t'))

	for (const [lib, pages] of Object.entries(result)) {
		const line = Object.entries(pages)
			.map(([id, { js, css }]) => `${id} ${Math.round((js.gzip + css.gzip) / 1024)}`)
			.join(', ')

		console.log(fw, lib, `gzip КБ: ${line}`)
	}
}
