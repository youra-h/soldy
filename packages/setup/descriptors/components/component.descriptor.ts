import { defineComponent } from '../define-component'
import { TObservingAccessorProvider } from '../../providers/components'
import { TComponent } from '@soldy/core'
import { ComponentContribution } from '../../contributions/components'

export const ComponentDescriptor = defineComponent({
	ctor: TComponent,
	contribution: ComponentContribution,
	provider: TObservingAccessorProvider,
})
