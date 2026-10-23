import type { ButtonHTMLAttributes } from 'react'
import type { IButton } from '@soldy-ui/core'
import type { ButtonDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type ButtonEventProps = EventProps<typeof ButtonDescriptor>

/** Атрибуты — кнопки (корень по умолчанию `<button>`), элемент — `HTMLElement`: `tag` свободен. */
export type ButtonProps = UseDomProps<
	typeof ButtonDescriptor,
	IButton,
	ButtonEventProps,
	ButtonHTMLAttributes<HTMLElement>
>
