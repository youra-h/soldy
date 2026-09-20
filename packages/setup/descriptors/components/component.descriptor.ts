/**
 * Дескриптор Component (TComponent) — невизуальная база.
 *
 * Наследует EntityDescriptor и ничего не добавляет: видимость объявлена в
 * ComponentViewDescriptor.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TComponent } from '@soldy/core'
import { EntityDescriptor } from './entity.descriptor'

export const ComponentDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TComponent,

		extends: EntityDescriptor(),

		/**
		 * TComponent — невизуальная база. Ни props, ни событий отображения:
		 * видимость объявлена в ComponentViewDescriptor.
		 */
		contribution: {},
	}),
)
