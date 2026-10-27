import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import type { TLocale } from '@soldy-ui/plugins'
import { COLLECTION_ITEMS, COMPONENTS, previewProps } from '@soldy-ui/playground-shared'
import oren from '@soldy-ui/theme-oren/setup'

/**
 * The server page of one framework (see benchmarks/ssr/README.md in the root):
 * every component the developer stand previews, once, under one
 * `LocaleProvider`, rendered to a string by the framework's server renderer.
 *
 * The components are the previews of the stand's hosts
 * (`packages/playground/vue/src/hosts/`) with their shared data
 * (`PREVIEW_PROPS`, `COLLECTION_ITEMS`), the same the page run
 * (`tools/bench-pages`) mounts in the browser: the pages of the five
 * frameworks are comparable.
 */

/** A component of the page: the registry's id and the props of its preview. */
export type TPageComponent = {
	readonly id: string
	readonly props: Readonly<Record<string, unknown>>
}

/** What a framework's entry gives the run (`measure.ts`). */
export type TServerPage = {
	readonly framework: string
	/** Render the page — `components` under a provider of `locale` — to markup. */
	render(locale: TLocale, components: readonly TPageComponent[]): Promise<string>
}

/** Icons and theme behavior — as an application installs them, once per process. */
useIcons(material)
useTheme(oren)

/**
 * Props of a component on the page — its preview's. Select gets its options as
 * data (`items`), as on the browser pages (`tools/bench-pages/bench.ts`).
 */
function propsOf(id: string): Readonly<Record<string, unknown>> {
	return id === 'select' ? { ...previewProps(id), items: COLLECTION_ITEMS } : previewProps(id)
}

/**
 * The components of the page — those the host can draw, in the registry's
 * order. Inheritance layers (group `layers`) are not components of a page, as
 * on the stand's showcase.
 */
export function pageComponents(previews: readonly string[]): TPageComponent[] {
	return COMPONENTS.filter(
		(entry) => entry.group !== 'layers' && previews.includes(entry.id),
	).map((entry) => ({ id: entry.id, props: propsOf(entry.id) }))
}
