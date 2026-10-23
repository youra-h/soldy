import type { IField } from '@soldy-ui/core'
import type { FieldDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type FieldEventProps = EventProps<typeof FieldDescriptor>

export type FieldProps = UseDomProps<typeof FieldDescriptor, IField, FieldEventProps>
