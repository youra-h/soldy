import { TextableDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const TextableInputNames = [...useInputs(TextableDescriptor()), 'ctrl'] as const
export const TextableOutputNames = useOutputs(TextableDescriptor())
