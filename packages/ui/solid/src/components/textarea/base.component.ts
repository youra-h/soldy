import type { ITextarea } from '@soldy-ui/core'
import type { TextareaDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TTextareaAttributes, UseDomProps } from '../../types'

/** События слоя Textarea (core + плагины), выведены из дескриптора автоматически. */
export type TextareaEventProps = EventProps<typeof TextareaDescriptor>

/** Атрибуты Textarea: класс и стиль — корню, остальное — полю `<textarea>`. */
export type TextareaAttributes = TDomAttributes<
	typeof TextareaDescriptor,
	TextareaEventProps,
	TTextareaAttributes
>

export type TextareaProps = UseDomProps<
	typeof TextareaDescriptor,
	ITextarea,
	TextareaEventProps,
	TTextareaAttributes
>
