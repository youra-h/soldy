import type { TClosedComponent } from '../../adapter'
import SliderComponent from './Slider.vue'

export { default as BaseSlider, emitsSlider, propsSlider } from './base.component'

export const Slider: TClosedComponent<typeof SliderComponent> = SliderComponent
