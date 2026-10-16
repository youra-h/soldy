import type { JSX } from 'solid-js'
import type { IButton } from '@soldy-ui/core'
import type { ButtonDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Button (core + плагины), выведены из дескриптора автоматически. */
export type ButtonEventProps = EventProps<typeof ButtonDescriptor>

/**
 * Пропсы Button. Атрибуты — кнопки (`type`, `form`, `name`, `value`): корень
 * по умолчанию — `<button>`. Элемент — `HTMLElement`: `tag` свободен.
 */
export type ButtonProps = UseDomProps<
	typeof ButtonDescriptor,
	IButton,
	ButtonEventProps,
	JSX.ButtonHTMLAttributes<HTMLElement>
>
