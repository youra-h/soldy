import type { IAdapterProfile } from '@soldy-ui/setup'
import { WebcNaming } from './naming'

/** Одна поверхность на класс элемента (атрибуты, свойства) и на связку. */
export const WebcProfile: IAdapterProfile = { naming: WebcNaming }
