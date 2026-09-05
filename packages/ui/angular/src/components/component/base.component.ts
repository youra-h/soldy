import { ComponentDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const ComponentInputNames = [...useInputs(ComponentDescriptor()), 'ctrl'] as const
export const ComponentOutputNames = useOutputs(ComponentDescriptor())
