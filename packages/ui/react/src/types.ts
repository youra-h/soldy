/**
 * Общие типы для React-адаптера @soldy/ui-react.
 */

import type { ReactNode } from 'react'
import type { IEntity } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'

/**
 * Базовые props React-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов (для обратной совместимости)
 * - `children` — содержимое слота (аналог default slot во Vue)
 */
export type TReactComponentProps<
	TCoreProps,
	TInstance extends IEntity = IEntity,
> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
	children?: ReactNode
}
