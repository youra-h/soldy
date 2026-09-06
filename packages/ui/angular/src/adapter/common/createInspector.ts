/**
 * - Static (build-time): `createInspector(descriptor)` — useInputs / useOutputs
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter
 */

import { createInspectorFactory } from '@soldy/setup'
import { AngularNaming } from './naming'

export const createInspector = createInspectorFactory(AngularNaming)
