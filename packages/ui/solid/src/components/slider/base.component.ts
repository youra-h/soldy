import type { ISlider } from '@soldy-ui/core'
import type { SliderDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Slider (core + плагины), выведены из дескриптора автоматически. */
export type SliderEventProps = EventProps<typeof SliderDescriptor>

/** Атрибуты потребителя — корню: полей столько, сколько ручек. */
export type SliderProps = UseDomProps<typeof SliderDescriptor, ISlider, SliderEventProps>
