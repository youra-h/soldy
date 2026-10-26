import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { enUS } from '@soldy-ui/plugins'
import { TLocaleProviderElement } from '@soldy-ui/webc/locale-provider'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'

/**
 * soldy as an application sets it up (README of the packages): the icon pack,
 * the theme with its behavior, the locale provider at the root — as the host
 * of the developer stand does. Elements register on import of their entries:
 * each page imports the entries of the elements it writes, as the pages of the
 * neighbors import their components, and the provider comes from an entry of
 * its own. Only the size entries use these files: the runtime pages of soldy
 * are the hosts themselves (`tools/bench-pages`).
 */
useIcons(material)
useTheme(oren)

export function root(): HTMLElement {
	const provider = new TLocaleProviderElement()

	provider.locale = enUS

	return provider
}
