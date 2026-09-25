/**
 * Дескриптор Switch (TSwitch).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет слоты ручки `on` и `off` + плагин InputBool.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TSwitch } from '@soldy-ui/core'
import type { ISwitch } from '@soldy-ui/core'
import { InputBoolPluginDescriptor } from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const SwitchDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSwitch,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Содержимое ручки по состоянию: рисуется один из двух слотов.
			 * Дорожка вокруг них остаётся за компонентом: она уносит содержимое
			 * из доступного имени, которое переключателю даёт подпись.
			 */
			slots: {
				on: {
					scope: {
						value: defineType<boolean | undefined>(Boolean),
						ctrl: defineType<ISwitch>(Object),
					},
					description: 'Содержимое ручки включённого переключателя',
				},
				off: {
					scope: {
						value: defineType<boolean | undefined>(Boolean),
						ctrl: defineType<ISwitch>(Object),
					},
					description: 'Содержимое ручки выключенного переключателя',
				},
			},
		},

		plugins: [InputBoolPluginDescriptor],
	}),
)
