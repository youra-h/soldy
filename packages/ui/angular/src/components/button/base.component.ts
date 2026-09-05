import { ButtonDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const ButtonInputNames = [...useInputs(ButtonDescriptor()), 'ctrl'] as const
export const ButtonOutputNames = useOutputs(ButtonDescriptor())
