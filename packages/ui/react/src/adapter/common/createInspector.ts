/**
 * Runtime: `createInspector(adapter.accessor)` — useAdapter.ts
 *
 * Статический режим (дескриптор) в React не используется: имена пропов
 * выводятся из типов, а не из рантайм-объявлений.
 */

import { createInspectorFactory } from '@soldy/setup'
import { ReactNaming } from './naming'

export const createInspector = createInspectorFactory(ReactNaming)
