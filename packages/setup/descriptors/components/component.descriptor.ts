import { defineComponent, defineDescriptor } from '../../define'
import { TComponent } from '@soldy/core'
import type { IComponentProps, TComponentEvents } from '@soldy/core'
import { EntityDescriptor } from './entity.descriptor'

export const ComponentDescriptor = defineDescriptor(() =>
	defineComponent<IComponentProps, TComponentEvents>()({
		ctor: TComponent,

		extends: EntityDescriptor(),

		/**
		 * TComponent — невизуальная база. Ни props, ни событий отображения:
		 * видимость объявлена в ComponentViewDescriptor.
		 */
		contribution: {},
	}),
)
