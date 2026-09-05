import { ComponentViewDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const ComponentViewInputNames = [...useInputs(ComponentViewDescriptor()), 'ctrl'] as const
export const ComponentViewOutputNames = useOutputs(ComponentViewDescriptor())
