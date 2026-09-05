/**
 * useInputs — возвращает массив имён Angular-инпутов для дескриптора.
 *
 * Аналог useProps (Vue) / useProps (React), но для Angular @Component({ inputs: [...] }).
 * Включает только не-protected props в формате AngularNaming.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from './../common'

export function useInputs(descriptor: IComponentDescriptor): string[] {
	return Object.keys(createInspector(descriptor).getExportProps())
}
