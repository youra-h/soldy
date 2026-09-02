/**
 * Дескриптор ListBox (TListBox).
 *
 * Наследует ListDescriptor (maxRows, autoWidth, wordWrap, scrollBehavior, ...)
 * и добавляет view + плагины.
 */

import { defineComponent, definePlugin } from '../../base'
import { TListBox } from '@soldy/core'
import {
	TListLayoutPlugin,
	TListScrollPlugin,
	TListKeyboardPlugin,
	TListItemAccumulationPlugin,
} from '@soldy/plugins'
import { ListBoxContribution } from '../../../contributions'
import { ListDescriptor } from '../list'

export const ListBoxDescriptor = defineComponent({
	ctor: TListBox,

	extends: ListDescriptor,

	contribution: ListBoxContribution,

	plugins: [
		definePlugin({
			ctor: TListItemAccumulationPlugin,
		}),
		definePlugin({
			ctor: TListLayoutPlugin,
		}),
		definePlugin({
			ctor: TListKeyboardPlugin,
		}),
		definePlugin({
			ctor: TListScrollPlugin,
		}),
	],
})
