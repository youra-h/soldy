import { enUS, type TLocale } from '@soldy-ui/plugins'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { TLocaleProviderElement, isHostProp, toAttributeName } from '@soldy-ui/webc'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { FIXTURES } from './fixtures'
import { PREVIEWS, type TContent, type TPreview, type TPreviewProps } from './previews'
import { listenersOf, type TElementListener } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/** Listeners of the preview's parts, by part name (`partsOf`). */
type TParts = Readonly<Record<string, readonly TElementListener[]>>

/** The header's language, one for all the host's roots. */
let locale: TLocale = enUS

/** The host's live roots: a language change is written to each. */
const roots = new Set<TLocaleProviderElement>()

/** What to draw: the fixture under its key, or without one the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(
			`[playground] хост Web Components не умеет рисовать «${fixture ?? component}»`,
		)
	}

	return found
}

/**
 * Props the element gets as properties: the description's props (for the
 * preview's component, derived from the row's props), with what the shell
 * gave on top (for the preview's component, the preview and row props).
 * `ctrl` is not among them, being set before insertion (see `build`), nor are
 * props the element lacks altogether (`tag`: the tag is the element itself).
 */
function propsOf(preview: TPreview, bind: TPreviewProps): Map<string, unknown> {
	const own = typeof preview.props === 'function' ? preview.props(bind) : preview.props

	return new Map(
		Object.entries({ ...own, ...bind }).filter(
			([name]) => name !== 'ctrl' && !isHostProp(name),
		),
	)
}

/**
 * The description's element: a customized built-in soldy element as a tag
 * with `is`; an autonomous one, or a wrapper without a component, as a bare
 * tag.
 */
function elementOf(preview: TPreview): HTMLElement {
	return preview.is === undefined
		? document.createElement(preview.tag)
		: document.createElement(preview.tag, { is: preview.is })
}

/**
 * What the host built: the component's element and the node that goes into
 * the root, either the wrapper with the component in its default slot or the
 * component itself.
 */
type TBuilt = {
	readonly element: HTMLElement
	readonly outer: HTMLElement
}

/**
 * The component's element, built in code as a consumer builds it. Its first
 * assembly applies everything the element got before insertion, and `ctrl`
 * works only before insertion: an instance assigned to a connected element
 * reaches only the next assembly, after a move. The wrapper
 * (`TPreview.wrapper`) is built the same way, with its own description props
 * and a style from the row's props, and the component becomes its light DOM in
 * the default slot, after the button that opens it (`TPreview.opener`).
 */
function build(
	preview: TPreview,
	bind: TPreviewProps,
	listeners: readonly TElementListener[],
	parts: TParts,
): TBuilt {
	const element = elementOf(preview)

	if (bind.ctrl !== undefined) Reflect.set(element, 'ctrl', bind.ctrl)

	fill(element, preview, propsOf(preview, bind), bind, parts)

	for (const { type, listener } of listeners) element.addEventListener(type, listener)

	const { wrapper, opener } = preview

	if (!wrapper) {
		if (opener !== undefined) {
			throw new Error('[playground] кнопке, которая открывает компонент, нужна обёртка')
		}

		return { element, outer: element }
	}

	const outer = elementOf(wrapper)

	fill(outer, wrapper, propsOf(wrapper, {}), {}, parts)
	applyStyle(outer, wrapper, bind)

	if (opener !== undefined) outer.appendChild(openerOf(opener, element))

	outer.appendChild(element)

	return { element, outer }
}

/**
 * The button that opens the component (`TPreview.opener`): a labelled Button
 * whose press writes `visible = true` to the component, as the Vue preview's
 * button writes its `v-model:visible` state. The component closes itself (its
 * close button, the backdrop, Escape), and the page's `visible` row sets
 * openness from outside.
 */
function openerOf(text: string, element: HTMLElement): HTMLElement {
	const button = document.createElement('button', { is: 'so-button' })

	Reflect.set(button, 'text', text)
	button.addEventListener('click', () => Reflect.set(element, 'visible', true))

	return button
}

/**
 * Style of an element without a component (`TPreview.style`): for the wrapper,
 * from the component's row props; for a child in a slot, without them. Without
 * a style the element is left alone.
 */
function applyStyle(element: HTMLElement, preview: TPreview, bind: TPreviewProps): void {
	if (preview.style) element.style.cssText = preview.style(bind)
}

/**
 * A child in a slot. A soldy element, and markup without a component that has
 * its own content (the row of the DragAndDrop preview), are built from their
 * description, like the wrapper, with the style but without the row's props;
 * markup without content by its function. A part (`TPreview.part`) gets its
 * listeners before insertion, like the component.
 */
function childOf(child: TContent, parts: TParts): Node {
	if (typeof child === 'function') return child()

	const node = elementOf(child)

	fill(node, child, propsOf(child, {}), {}, parts)
	applyStyle(node, child, {})

	for (const { type, listener } of child.part === undefined ? [] : (parts[child.part] ?? [])) {
		node.addEventListener(type, listener)
	}

	return node
}

/**
 * Applies a description to an element: its own attributes as attributes, as
 * in markup; props as properties; children by slot as light DOM, an element
 * with a `slot` attribute (none for the default slot). All before insertion:
 * the first assembly distributes the light DOM over the slots, and collection
 * items assemble right after their owner. Children that depend on the row's
 * props (`TPreview.slots` as a function) are built from `bind`.
 */
function fill(
	element: HTMLElement,
	preview: TPreview,
	props: Map<string, unknown>,
	bind: TPreviewProps,
	parts: TParts,
): void {
	for (const [name, value] of Object.entries(preview.attributes ?? {})) {
		element.setAttribute(toAttributeName(name), value)
	}

	for (const [name, value] of props) {
		if (value !== undefined) Reflect.set(element, name, value)
	}

	const slots = typeof preview.slots === 'function' ? preview.slots(bind) : preview.slots

	for (const [slot, children] of Object.entries(slots ?? {})) {
		for (const child of children) {
			const node = childOf(child, parts)

			if (slot !== DEFAULT_SLOT && node instanceof Element) node.setAttribute('slot', slot)

			element.appendChild(node)
		}
	}
}

/**
 * A prop for an assembled element, as an element property, as app code would
 * set it. A prop on a native string property (`id`: on a root with a field,
 * the `id` attribute is the field's prop) is cleared with an empty string, as
 * the platform does: the native setter would write `undefined` as the string
 * `"undefined"`.
 */
function assign(element: HTMLElement, name: string, value: unknown): void {
	const native =
		(Reflect.has(Element.prototype, name) || Reflect.has(HTMLElement.prototype, name)) &&
		typeof Reflect.get(element, name) === 'string'

	Reflect.set(element, name, value === undefined && native ? '' : value)
}

/**
 * New props as properties, only the changed ones: as with the full prop set
 * of the other frameworks, repeating a previous value does not roll back what
 * the core or code through the instance has changed since. A removed prop is
 * written `undefined`: the binding returns it to the declared default.
 */
function write(element: HTMLElement, before: Map<string, unknown>, after: Map<string, unknown>) {
	for (const [name, value] of after) {
		if (!before.has(name) || before.get(name) !== value) assign(element, name, value)
	}

	for (const name of before.keys()) {
		if (!after.has(name)) assign(element, name, undefined)
	}
}

/**
 * The Web Components host.
 *
 * There is no framework, and the preview has no root of its own: the root is
 * a `<so-locale-provider>` on the shell's node. The shell provider's context
 * does not cross into a foreign root, so the host gives the root the header's
 * language through the `locale` property, into the provider's source: the
 * components are not reassembled.
 *
 * Code builds the component's element (`build`): props go to it as
 * properties, its own attributes as attributes, slot content as children,
 * listeners by the descriptor's surface (`listenersOf`). The preview's wrapper
 * (a label around a checkbox) gets only its own description props. A `ctrl`
 * change recreates the element with its wrapper: assigned to a connected
 * element, it would reach the core only on the next connection. The same goes
 * for a change of a prop the preview's children depend on
 * (`TPreview.rebuild`): the assembled element's light DOM is already
 * distributed.
 *
 * Synchronous: the element assembles on connection and applies the core
 * state to itself in the same call, so on return from `mount` the component is
 * in the DOM, as the contract promises. Prop changes reach the markup in a
 * microtask, before the frame the caller waits for.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),
	// Slot content is the element's light DOM: no component data can reach it
	slotScope: false,
	// The root tag is the element itself: registration sets it, not a prop
	tagProp: false,

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : []
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const root = new TLocaleProviderElement()

		root.locale = locale
		node.appendChild(root)
		roots.add(root)

		let bind = props
		// Copies sit side by side in one root (`TPreviewMount.count`)
		const buildAll = (next: TPreviewProps): TBuilt[] =>
			Array.from({ length: count }, () => build(preview, next, listeners, parts))
		let copies = buildAll(bind)

		for (const built of copies) root.appendChild(built.outer)

		return {
			update(next) {
				// The element takes the instance and the collection engine on assembly,
				// like `ctrl` and `engine` in the other frameworks: a different one means a
				// different element. The same for props the preview's children depend on
				// (`rebuild`)
				const rebuilt = (preview.rebuild ?? []).some((name) => next[name] !== bind[name])

				if (next.ctrl !== bind.ctrl || next.engine !== bind.engine || rebuilt) {
					for (const built of copies) built.outer.remove()
					copies = buildAll(next)
					for (const built of copies) root.appendChild(built.outer)
				} else {
					for (const built of copies) {
						write(built.element, propsOf(preview, bind), propsOf(preview, next))

						if (preview.wrapper) applyStyle(built.outer, preview.wrapper, next)
					}
				}

				bind = next
			},
			unmount() {
				roots.delete(root)
				root.remove()
			},
		}
	},

	setLocale(next) {
		locale = next

		for (const root of roots) root.locale = next
	},

	snippets: { extension: 'html', propSnippet, instanceSnippet },
}

export default host
