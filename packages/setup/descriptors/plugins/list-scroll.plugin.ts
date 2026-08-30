import { definePlugin } from '../base'
import { TListScrollPlugin } from '@soldy/plugins'

/**
 * Плагин автоматической прокрутки списка к выделенному элементу.
 */
export const ListScrollPluginDescriptor = () =>
	definePlugin({
		ctor: TListScrollPlugin,
	})
