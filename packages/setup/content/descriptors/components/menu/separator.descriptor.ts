/**
 * Дескриптор разделителя меню (TMenuSeparator) — линия между группами.
 *
 * Наследует ComponentViewDescriptor: своих пропсов нет, роль `separator`
 * пишет ядро. Слотов нет — разделитель ничего не рисует внутри.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TMenuSeparator } from '@soldy-ui/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'

export const MenuSeparatorDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuSeparator,

		extends: ComponentViewDescriptor(),
	}),
)
