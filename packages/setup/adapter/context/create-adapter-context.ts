/**
 * createAdapterContext — контекст адаптера: собранный компонент и его расширения.
 *
 * Инстанс, состав, набор и аксессор собирает `assemble/`; контекст держит
 * собранное и расширения адаптера (`TAdapterContext`).
 */

import { assembleComponent } from '../../assemble'
import type { IComponentDescriptor, IPluginContract } from '../../define'
import { TAdapterContext } from './adapter-context.class'
import type {
	IAdapterContext,
	IAdapterContextConfig,
	IAdapterContextOptions,
	TContextContract,
} from './types'

/**
 * Тип контекста выводится из дескриптора, дженерики адаптер не пишет.
 *
 * Инстанс сводится из двух источников — `ctor` дескриптора и `ctrl`. Адаптер
 * объявляет `ctrl` интерфейсом ядра (`IButton`), класс дескриптора
 * (`TButton`) его реализует, и контекст обещает интерфейс: под `ctrl` приходит
 * любая его реализация. `ctrl` чужого компонента не компилируется — класс
 * дескриптора его тип не реализует.
 */
export function createAdapterContext<TInstance extends object, TPlugins extends IPluginContract>(
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TContextContract<TInstance, TPlugins>> {
	const component = assembleComponent(descriptor, { ...options, bundle: config.bundle })

	return new TAdapterContext<TContextContract<TInstance, TPlugins>>(
		descriptor,
		component,
		options.props ?? {},
	)
}
