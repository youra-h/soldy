import { defineComponent } from '../base'
import { TComponent } from '@soldy/core'
import { ComponentContribution } from '../../contributions'
import { EntityDescriptor } from './entity.descriptor'

export const ComponentDescriptor = defineComponent({
    ctor: TComponent,

    extends: EntityDescriptor,

    contribution: ComponentContribution,
})
