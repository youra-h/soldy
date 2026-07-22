import { defineComponent } from '../define-component'
import { TAccessorProvider } from '../../providers/components'
import { TComponent } from '@soldy/core'
import { ComponentContribution } from '../../contributions'

export const ComponentDescriptor = defineComponent({
	ctor: TComponent,

	extends: EntityContribution,

	contribution: ComponentContribution,

	provider: TAccessorProvider,
})
