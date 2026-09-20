export { usePlugins, resolveRegisteredPlugins } from './plugins'
export { useExtensions, applyRegisteredExtensions } from './extensions'
export { defineTheme, useTheme } from './theme'
export {
	ICON_ROLES,
	MISSING_ICON,
	getIcon,
	hasIcon,
	missingIconRoles,
	resetIcons,
	setIcons,
} from './icons'
export type { TIconPack, TIconRole, TIconSource } from './icons'
export type {
	IPluginRegistrationOptions,
	IResolvedPlugin,
	ITheme,
	IThemeExtensions,
	IThemePlugins,
	TExtensionFactory,
	TPluginScope,
	TRegisteredPlugin,
} from './types'
