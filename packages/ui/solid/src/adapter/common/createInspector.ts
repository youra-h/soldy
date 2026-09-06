/**
 * Runtime: `createInspector(adapter.accessor)` — useAdapter.
 *
 * Статический режим (дескриптор) в Solid не нужен: имена пропов выводятся
 * из типов, а не из рантайм-объявлений.
 */

import { createInspectorFactory } from '@soldy/setup'
import { SolidNaming } from './naming'

export const createInspector = createInspectorFactory(SolidNaming)
