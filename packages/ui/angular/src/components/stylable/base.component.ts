import { StylableDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const StylableInputNames = [...useInputs(StylableDescriptor()), 'ctrl'] as const
export const StylableOutputNames = useOutputs(StylableDescriptor())
