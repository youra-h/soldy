import type { TLocale } from '@soldy-ui/plugins'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { TComponentEntry, TPropControl } from './types'
import { isSnippetExtension, type TSnippetExtension } from './snippet-file'

/**
 * Preview host: the framework half of the playground.
 *
 * The shell is one, on Vue: it draws the header, the menu and the prop editors
 * with soldy components. The component on the page is drawn by the host of the
 * framework picked in the header, in its own root, on a node the shell gives.
 * The host knows nothing of the shell; the shell knows only this contract of
 * the host: what it can draw, how to mount it and in which language.
 *
 * The shell holds the page state: a row's value, the core instance and the
 * engine reach the host as props. So switching the framework remounts only the
 * scene, and what was set on the page survives it.
 */

/** Where the host sends a component event: the full core name and the arguments. */
export type TPreviewEventSink = (name: string, args: readonly unknown[]) => void

/** What to mount. */
export type TPreviewMount = {
	/** Component: the registry id (`button`), also the key of the preview map. */
	component: string
	/** Fixture key: markup with slots. Without it the component's preview is drawn. */
	fixture?: string
	/**
	 * Props, named as markup writes them: `aria_label`, `ctrl`, `engine`. No
	 * listeners among them: the host sends events to `onEvent`.
	 */
	props: Readonly<Record<string, unknown>>
	/**
	 * Every event the component declares (its own and its collection
	 * facade's), under the full core name: `change:text`, `action:press`. The
	 * host maps framework names (`onChangeText`) to them. No sink: the host
	 * listens to nothing.
	 *
	 * Events of the parts the preview places in markup (`TComponentEntry.parts`)
	 * come here too, under the part's name: `Tabs.Item>action:press`
	 * (`partsOf`). A fixture's markup is its own, and its parts are not
	 * listened to.
	 */
	onEvent?: TPreviewEventSink
	/**
	 * How many copies of the preview the root holds: one framework tree, side
	 * by side, like dozens of identical components on an app page. The copies
	 * share props and listeners. The page benchmark mounts this way
	 * (`tools/bench-pages`). Unset: one.
	 */
	count?: number
}

/** A mounted preview. */
export interface IPreviewHandle {
	/** New props, whole rather than a diff: the framework draws them on its own tick. */
	update(props: Readonly<Record<string, unknown>>): void
	/** Unmount the component: the mount node is left empty. */
	unmount(): void
}

/** Code of the props page columns, in the host framework's syntax. */
export interface IPreviewSnippets {
	/** Extension of the example file that "Open in VS Code" writes the column code to. */
	readonly extension: TSnippetExtension
	/** The "Component" column: the value comes as a prop. */
	propSnippet(
		entry: TComponentEntry,
		prop: string,
		value: unknown,
		preset?: Record<string, unknown>,
	): string
	/** The "Component Instance" column: the value is written to the core instance. */
	instanceSnippet(entry: TComponentEntry, control: TPropControl, value: unknown): string
}

export interface IPreviewHost {
	/**
	 * Components the host can draw: the keys of its preview map. The shell's
	 * menu and showcase are the registry intersected with them.
	 */
	readonly previews: readonly string[]
	/**
	 * Scenario fixture keys. A scenario is shown when the host has both the
	 * component and its fixture.
	 */
	readonly fixtures: readonly string[]
	/**
	 * Whether slots pass the component's data (scope) to their content. `false`
	 * for Web Components: slot content is the element's light DOM, and no data
	 * can be handed to it. Such a host hides scenarios that check the scope
	 * (`TScenario.slotScope`). Unset: slots have a scope.
	 */
	readonly slotScope?: boolean
	/**
	 * Whether the `tag` prop sets the component's root tag. `false` for Web
	 * Components: the tag is the element itself, set by its registration
	 * (`<label is="so-radio-group-item">`). Such a host hides scenarios whose
	 * fixtures set the tag by prop (`TScenario.tagProp`). Unset: the `tag` prop
	 * exists.
	 */
	readonly tagProp?: boolean
	/**
	 * Mount the component into the node, in a root of the host's framework.
	 *
	 * Synchronous: the component is in the DOM on return. The caller waits for
	 * the frame on which `TElementPlugin` hands the node to plugins.
	 */
	mount(node: HTMLElement, mount: TPreviewMount): IPreviewHandle
	/**
	 * The header's language, for every root of the host, without a remount.
	 * The shell provider's context does not cross into a foreign root, so each
	 * root has its own `LocaleProvider`, and the host gives it the locale.
	 */
	setLocale(locale: TLocale): void
	/** Column code. Without it the columns have no code blocks. */
	readonly snippets?: IPreviewSnippets
}

/**
 * Descriptors whose events the component sends: its own and, for a
 * collection, its facade's, as its adapter declares them.
 */
export function componentDescriptors(entry: TComponentEntry): readonly IComponentDescriptor[] {
	return [
		entry.descriptor(),
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
	]
}

/**
 * Listeners of the parts the preview places in markup (`TComponentEntry.parts`),
 * by part, in the host's form (`listen`, the same as for the component). The
 * sink gets an event under the part's name, `Tabs.Item>action:press`: the
 * owner's export name and the part's, as the consumer writes `<Tabs.Item>`.
 * One format for every host: the parity run compares the journals.
 */
export function partsOf<TListeners>(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
	listen: (descriptors: readonly IComponentDescriptor[], sink: TPreviewEventSink) => TListeners,
): Readonly<Record<string, TListeners>> {
	return Object.fromEntries(
		Object.entries(entry.parts ?? {}).map(([part, descriptors]) => [
			part,
			listen(descriptors(), (name, args) => sink(`${entry.label}.${part}>${name}`, args)),
		]),
	)
}

/** Host module: the host is its default export. */
export type TPreviewHostModule = { default: IPreviewHost }

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null
}

function isKeys(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((key) => typeof key === 'string')
}

function isSnippets(value: unknown): value is IPreviewSnippets {
	return (
		isObject(value) &&
		isSnippetExtension(value.extension) &&
		typeof value.propSnippet === 'function' &&
		typeof value.instanceSnippet === 'function'
	)
}

/** Whether this is a host, by the shape the contract promises. */
export function isPreviewHost(value: unknown): value is IPreviewHost {
	return (
		isObject(value) &&
		isKeys(value.previews) &&
		isKeys(value.fixtures) &&
		(value.slotScope === undefined || typeof value.slotScope === 'boolean') &&
		(value.tagProp === undefined || typeof value.tagProp === 'boolean') &&
		typeof value.mount === 'function' &&
		typeof value.setLocale === 'function' &&
		(value.snippets === undefined || isSnippets(value.snippets))
	)
}

/**
 * Whether what the shell loader returned is a host module.
 *
 * The loader gets the module by a lazy `import()`, typed `unknown`: a cast to
 * the host would hide a module that exports the wrong thing. The guard checks
 * the shape and fails loudly.
 */
export function isPreviewHostModule(value: unknown): value is TPreviewHostModule {
	return isObject(value) && isPreviewHost(value.default)
}
