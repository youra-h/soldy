/**
 * Профиль Web Components: имена поверхности.
 *
 * Поверхность нужна элементу дважды: при объявлении класса (атрибуты в
 * `observedAttributes`, свойства на прототипе) и на монтировании (связка
 * `adapter.connect()`). Один профиль — одна поверхность на оба случая.
 */

import type { IAdapterProfile } from '@soldy/setup'
import { WebcNaming } from './naming'

export const WebcProfile: IAdapterProfile = { naming: WebcNaming }
