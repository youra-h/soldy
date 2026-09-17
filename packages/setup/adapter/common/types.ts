/**
 * Контракты общих функций адаптеров: инспектор, проброс событий, источник пропсов корня.
 */

import type { IEventSource } from '@soldy/core'
import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'
import type { IComponentDescriptor } from '../../define'

/** Инспектор по дескриптору (build-time) или по аксессору (runtime). */
export type TCreateInspector = (source: IComponentDescriptor | IAccessor) => TDescriptorInspector

export interface IEventBinding {
	/** Источник событий: instance.events компонента или плагина. */
	source: IEventSource
	/** Имя события для подписки на источник. */
	rawName: string
	/** Имя события для проброса наружу (по naming-стратегии фреймворка). */
	exportName: string
}

/** Что компонент съедает из пропсов: объявленное в аксессоре и слоты дескриптора. */
export interface IForwardPropsSource {
	readonly accessor: IAccessor
	readonly descriptor: IComponentDescriptor
}
