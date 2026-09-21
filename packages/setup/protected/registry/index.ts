export { usePlugins, resolveRegisteredPlugins } from './plugins'
export { useExtensions, applyRegisteredExtensions } from './extensions'
export { defineTheme, useTheme } from './theme'
export { MISSING_ICON, getIcon, hasIcon, resetIcons, setIcons } from './icons'
export type {
	IPluginRegistrationOptions,
	IResolvedPlugin,
	ITheme,
	IThemeExtensions,
	IThemePlugins,
	TExtensionFactory,
	TIconSource,
	TPluginScope,
	TRegisteredPlugin,
} from './types'
