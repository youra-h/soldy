import { createSignal, type Accessor, type JSX } from 'solid-js'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/solid'
import type { TPreview, TPreviewProps } from './previews'
import type { TParts } from './events'

/**
 * The header's language — one for all the host's roots: a signal read by each
 * root's provider. A change is a new locale for the provider, which writes it
 * to its source: the components are not remounted.
 */
export const [language, setLanguage] = createSignal<TLocale>(enUS)

export type TRootProps = {
	/** What to draw: the component's preview or a scenario fixture. */
	preview: TPreview
	/** The preview props with the event callbacks — a signal the host's `update` sets. */
	bind: Accessor<TPreviewProps>
	/** Listeners of the preview's parts (`TPreview`). */
	parts: TParts
	/** How many copies of the preview stand side by side (`TPreviewMount.count`). */
	count: number
}

/**
 * The Solid host's root: its own `LocaleProvider` around the preview. The
 * shell's provider context does not reach another root, so the host gives the
 * root the header's language. The copies are built once, like a component
 * body: the root never changes their number.
 */
export function Root(props: TRootProps): JSX.Element {
	return (
		<LocaleProvider locale={language()}>
			{Array.from({ length: props.count }, () => props.preview(props.bind, props.parts))}
		</LocaleProvider>
	)
}
