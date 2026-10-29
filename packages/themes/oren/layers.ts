import postcss from 'postcss'
import type { ChildNode, Container, Plugin as TPostcssPlugin } from 'postcss'
import type { Plugin } from 'vite'
// The extension is required: the native loader of Vite reads the config with it
import { COMMON_PARTS, COMPONENTS } from './entries.ts'

/**
 * The cascade layers of the sheet — the steps of the CSS build that keep every
 * rule of the theme in its layer and cut the whole sheet into the shared part,
 * the parts and the stylesheets of components (`AGENTS.md` of the package,
 * «Слои: лист целиком и по компонентам»).
 *
 * The whole sheet is compiled once (`src/index.scss`): Sass loads every part
 * into its layer, and Tailwind expands `@apply` for all of them in one pass and
 * puts out its variables and registrations once. The build then cuts the
 * result by its layers: a part is the set of its layers, and the rules of the
 * shared part and of the parts together are exactly the rules of the whole
 * sheet. So the whole sheet and an application that imports stylesheets of
 * components get one cascade — the same layers in the same order.
 */

/** A registration of a variable — `@property`. */
const PROPERTY = 'property'

/**
 * Registrations out of the layers of the parts, to the top level of the sheet.
 *
 * A registration is global and needs no layer, and the `@property` polyfill of
 * Tailwind — the initial values of registered variables in Firefox before 128
 * (`tailwind-postcss.ts`) — sees only a registration outside layers: inside
 * the layer of Tags the edges of the mask of a scrolling row lost their
 * initial width there. So this step goes before Tailwind, and a registration
 * lands in the shared part next to those of Tailwind.
 */
export function hoistRegistrations(): TPostcssPlugin {
	return {
		postcssPlugin: 'soldy-theme-registrations',
		Once(root) {
			root.walkAtRules(PROPERTY, (rule) => {
				if (rule.parent === root) return

				rule.remove()
				root.append(rule)
			})
		},
	}
}

/** Layers whose content is other layers: they are walked, not owned by a part. */
const CONTAINERS = new Set([
	'base',
	'base.so',
	'components',
	'components.so',
	'components.so.modifiers',
])

/** The owner of the shared part: not a file of its own but `common.css`. */
const COMMON = ''

/**
 * The owner of a leaf layer: the shared part (`COMMON`) or a part. Tailwind's
 * own layers, the tokens and the shared parts of the shared layer of themes go
 * to the shared part; a layer of the shared layer of themes (`base.so.<part>`),
 * of the theme (`components.so.<part>`) and of its modifiers
 * (`components.so.modifiers.<part>`) — to its part. Another layer is an error:
 * the build does not know where its rules belong.
 */
function ownerOf(layer: string, commonParts: ReadonlySet<string>): string {
	if (layer === 'properties' || layer === 'theme' || layer === 'components.so.tokens') {
		return COMMON
	}

	const base = /^base\.so\.([\w-]+)$/.exec(layer)?.[1]

	if (base !== undefined) return commonParts.has(base) ? COMMON : base

	const part = /^components\.so\.(?:modifiers\.)?([\w-]+)$/.exec(layer)?.[1]

	if (part !== undefined) return part

	throw new Error(`слой ${layer}: чья это часть, сборка не знает`)
}

/** What a node is, for the text of an error. */
function describe(node: ChildNode): string {
	if (node.type === 'rule') return node.selector
	if (node.type === 'atrule') return `@${node.name} ${node.params}`

	return node.type
}

/** Names of a layer at-rule — a block or a statement — under the layer it stands in. */
function layerNames(params: string, prefix: string): string[] {
	return params.split(',').map((name) => (prefix ? `${prefix}.${name.trim()}` : name.trim()))
}

/** A default of the document root: a rule of `:root` alone. */
const isRootDefault = (node: ChildNode): boolean =>
	node.type === 'rule' && node.selector.trim() === ':root'

/** The whole sheet cut by its layers. */
export type TSplitSheet = {
	/** Every layer of the sheet in the order of its first appearance — the order of the cascade. */
	readonly layers: readonly string[]
	/** The parts in the order of their first layer in the sheet. */
	readonly order: readonly string[]
	/** The shared part: the statement of the order of every layer, then what every entry needs. */
	readonly common: string
	/** Part → its file: the blocks of its layers. */
	readonly parts: ReadonlyMap<string, string>
	/** The whole sheet: the statement of every layer, then the compiled sheet with the same rules. */
	readonly whole: string
}

/**
 * Cuts the compiled sheet into the shared part and the parts.
 *
 * The shared part opens with one statement of the order of every layer: a
 * layer is ordered by its first appearance, and the shared part is the first
 * import of every entry. In it go Tailwind's layers and registrations, the
 * tokens and the schemes, the shared parts of the shared layer of themes and
 * the defaults of the document root of every other part — the scales a
 * neighbour stands by. The rest of a layer goes to its part. A rule outside
 * the layers is an error: it would stand over every layer of the theme and
 * over the utilities of an application.
 */
export function splitSheet(
	css: string,
	commonParts: readonly string[] = COMMON_PARTS,
): TSplitSheet {
	const shared = new Set(commonParts)
	const layers: string[] = []
	const banner: string[] = []
	const common: string[] = []
	const parts = new Map<string, string[]>()

	const declare = (layer: string) => {
		if (!layers.includes(layer)) layers.push(layer)
	}

	/** Layers inside an owned block — the statement declares them too. */
	const declareNested = (container: Container, prefix: string) => {
		for (const child of container.nodes ?? []) {
			if (child.type !== 'atrule') continue

			if (child.name !== 'layer') {
				declareNested(child, prefix)
				continue
			}

			const names = layerNames(child.params, prefix)

			names.forEach(declare)
			declareNested(child, names[0])
		}
	}

	const add = (owner: string, text: string) => {
		if (owner === COMMON) common.push(text)
		else parts.set(owner, [...(parts.get(owner) ?? []), text])
	}

	const visit = (nodes: readonly ChildNode[], prefix: string) => {
		for (const node of nodes) {
			if (node.type === 'comment') {
				if (prefix === '') banner.push(node.toString())
				continue
			}

			if (node.type === 'atrule' && node.name === 'layer') {
				const names = layerNames(node.params, prefix)

				names.forEach(declare)

				if (node.nodes === undefined) continue

				const [layer] = names

				if (CONTAINERS.has(layer)) {
					visit(node.nodes, layer)
					continue
				}

				declareNested(node, layer)

				const owner = ownerOf(layer, shared)
				const own = layer.startsWith('base.so.') && owner !== COMMON
				const defaults = own ? node.nodes.filter(isRootDefault) : []
				const rest = node.nodes.filter((child) => !defaults.includes(child))

				if (defaults.length > 0) common.push(`@layer ${layer}{${defaults.join('')}}`)
				if (rest.length > 0) add(owner, `@layer ${layer}{${rest.join('')}}`)

				continue
			}

			if (prefix === '' && node.type === 'atrule' && node.name === PROPERTY) {
				common.push(node.toString())
				continue
			}

			throw new Error(`${prefix || 'вне слоёв'}: ${describe(node)} — правило вне слоя части`)
		}
	}

	const root = postcss.parse(css)

	visit(root.nodes, '')

	const order = [...parts.keys()]
	const files = new Map(order.map((part) => [part, (parts.get(part) ?? []).join('')]))
	const statement = `${banner.join('')}@layer ${layers.join(',')};`
	// The whole sheet keeps the order of the compiled one — the shared layer of
	// themes first, then the theme: the same rules in the same layers as in the
	// pieces, and gzip finds the repeats of neighbouring parts next to each
	// other. Its own statements give way to the one of every layer
	const compiled = root.nodes.filter(
		(node) => node.type !== 'comment' && !(node.type === 'atrule' && node.nodes === undefined),
	)

	return {
		layers,
		order,
		common: statement + common.join(''),
		parts: files,
		whole: statement + compiled.join(''),
	}
}

/**
 * The stylesheet of a component: the shared part, then its parts in the order
 * of the sheet. The order of the imports does not decide the cascade — the
 * shared part declares the order of the layers, — it only keeps the file
 * readable.
 */
export function entrySheet(parts: readonly string[], order: readonly string[]): string {
	const unknown = parts.filter((part) => !order.includes(part))

	if (unknown.length > 0) throw new Error(`частей ${unknown.join(', ')} в листе нет`)

	const sorted = [...new Set(parts)].sort((a, b) => order.indexOf(a) - order.indexOf(b))

	return [
		"@import '../common.css';",
		...sorted.map((part) => `@import '../parts/${part}.css';`),
		'',
	].join('\n')
}

/** The file of the whole sheet — the CSS output of the build (`vite.config.ts`). */
export const WHOLE = 'index.css'

/**
 * Next to the whole sheet — the shared part (`common.css`), a file per part
 * (`parts/<part>.css`) and a stylesheet per component of the export
 * (`components/<component>.css`, the entries `./<component>.css` of the
 * manifest). The whole sheet itself is written as the shared part and the
 * parts, with the statement of the order of the layers first. A part no entry
 * imports is an error: its rules would reach an application only with the
 * whole sheet.
 */
export function componentSheets(): Plugin {
	return {
		name: 'soldy-theme-component-sheets',
		enforce: 'post',
		generateBundle(_options, bundle) {
			const sheet = bundle[WHOLE]

			if (sheet?.type !== 'asset') throw new Error(`CSS-сборка не отдала ${WHOLE}`)

			const source =
				typeof sheet.source === 'string'
					? sheet.source
					: new TextDecoder().decode(sheet.source)
			const split = splitSheet(source)
			const imported = new Set(Object.values(COMPONENTS).flat())
			const orphans = split.order.filter((part) => !imported.has(part))

			if (orphans.length > 0) {
				throw new Error(`частей ${orphans.join(', ')} не берёт ни один вход (entries.ts)`)
			}

			sheet.source = split.whole

			this.emitFile({ type: 'asset', fileName: 'common.css', source: split.common })

			for (const [part, css] of split.parts) {
				this.emitFile({ type: 'asset', fileName: `parts/${part}.css`, source: css })
			}

			for (const [component, parts] of Object.entries(COMPONENTS)) {
				this.emitFile({
					type: 'asset',
					fileName: `components/${component}.css`,
					source: entrySheet(parts, split.order),
				})
			}
		},
	}
}
