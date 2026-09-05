import { ControlDescriptor } from '@soldy/setup'
import { useInputs, useOutputs } from '../../adapter'

export const ControlInputNames = [...useInputs(ControlDescriptor()), 'ctrl'] as const
export const ControlOutputNames = useOutputs(ControlDescriptor())
