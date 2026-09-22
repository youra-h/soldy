/**
 * Профиль Angular: имена поверхности.
 *
 * Поверхность нужна дважды: кодогенерации (статические inputs/outputs в
 * `generated/*.metadata.ts` — AOT требует литеральных массивов) и связке
 * монтирования (`adapter.connect()`). Один профиль — одна поверхность на оба.
 */

import type { IAdapterProfile } from '@soldy-ui/setup'
import { AngularNaming } from './naming'

export const AngularProfile: IAdapterProfile = { naming: AngularNaming }
