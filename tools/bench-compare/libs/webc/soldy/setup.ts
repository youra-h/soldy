import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { enUS } from '@soldy-ui/plugins'
import { TLocaleProviderElement } from '@soldy-ui/webc'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'

/**
 * soldy as an application sets it up (README of the packages): the icon pack,
 * the theme with its behavior, the locale provider at the root — as the host
 * of the developer stand does. Elements register on import of the package.
 * Only the size entries use these files: the runtime pages of soldy are the
 * hosts themselves (`tools/bench-pages`).
 */
useIcons(material)
useTheme(oren)

export function root(): HTMLElement {
	const provider = new TLocaleProviderElement()

	provider.locale = enUS

	return provider
}
