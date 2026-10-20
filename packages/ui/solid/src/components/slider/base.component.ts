import type { ISlider } from '@soldy-ui/core'
import type { SliderDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Slider (core + плагины), выведены из дескриптора автоматически. */
export type SliderEventProps = EventProps<typeof SliderDescriptor>

/**
 * Пропсы Slider. Атрибуты потребителя — корня: полей столько, сколько ручек,
 * и делить атрибуты между корнем и полем, как у CheckBox, не с кем.
 */
export type SliderProps = UseDomProps<typeof SliderDescriptor, ISlider, SliderEventProps>
