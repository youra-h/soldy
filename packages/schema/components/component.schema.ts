import type { TComponentEvents, IComponentProps } from '@soldy/core'
import { TComponent } from '@soldy/core'
import { entitySchema } from './entity.schema'

/**
 * Контракт Component — расширяет entitySchema.
 * Добавляет rendered, visible, present и события жизненного цикла.
 */
export const componentSchema = entitySchema.extend<IComponentProps, TComponentEvents>({
	Ctor: TComponent,

	props: {
		rendered: {
			get: (i) => i.rendered,
			set: (i, v) => {
				i.rendered = v
			},
			triggers: ['change:rendered'],
		},
		visible: {
			get: (i) => i.visible,
			set: (i, v) => {
				i.visible = v
			},
			triggers: ['change:visible'],
		},
	},

	readonly: {
		present: {
			get: (i) => i.present,
			triggers: ['change:rendered', 'change:visible'],
		},
	},

	events: [
		'created',
		'show',
		'hide',
		'show:before',
		'show:after',
		'hide:before',
		'hide:after',
	],

	plugins: [],
})
