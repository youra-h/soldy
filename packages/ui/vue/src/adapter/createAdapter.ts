/**
 * Центральная фабрика Vue-адаптера: createVueAdapter.
 *
 * Собирает useProps, useEmits, useRuntime и useAdapter в единый «запечённый»
 * контекст с фиксированной стратегией именования. Заменяет разрозненные файлы
 * useProps.ts, useEmits.ts, useRuntime.ts, useAdapter.ts — теперь вся логика
 * форматирования делегируется TDescriptorInspector'у из @soldy/accessor.
 *
 * Поддерживает IContextElevator — кросс-фреймворковый механизм
 * родитель-ребёнок (замена provide/inject).
 */

import { toRaw, ref, watch, onUnmounted, type Ref } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter, bindPlugins } from '@soldy/setup'
import type {
	TComponentAccessor,
	INamingStrategy,
	IComponentSchema,
	ICompiledProp,
	IContextElevator,
} from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { vueNaming } from './naming'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

/** Конфигурация elevators для useAdapter */
export interface IElevatorConfig {
	elevators?: Record<string, IContextElevator>
}

export function createVueAdapter(naming: INamingStrategy = vueNaming) {
	const getInspector = (target: any): TDescriptorInspector => {
		const schema: IComponentSchema = target.getSchema ? target.getSchema() : target

		return new TDescriptorInspector(schema, naming)
	}

	// --- USE PROPS ---
	function useProps(descriptor: IComponentDescriptor): Record<string, any> {
		const defaults = (descriptor.ctor as any)?.defaultValues ?? {}
		const inspector = getInspector(descriptor)

		return inspector.getExportProps(defaults)
	}

	// --- USE EMITS ---
	function useEmits(descriptor: IComponentDescriptor): string[] {
		const inspector = getInspector(descriptor)
		const emits = inspector.getExportEvents()

		for (const prop of descriptor.props) {
			if (!prop.protected && prop.triggers.length > 0) {
				emits.push(`update:${inspector.getExportPropName(prop)}`)
			}
		}

		return Array.from(new Set(emits))
	}

	// --- USE RUNTIME ---
	function useRuntime(
		accessor: TComponentAccessor,
		externalProps: Record<string, any>,
		emit?: (event: string, ...args: any[]) => void,
	) {
		const inspector = getInspector(accessor)

		const { refs, bindOutput, bindInput } = useSyncProps(accessor, inspector)

		// Связать Core → Vue (Output)
		bindOutput()
		// Связать Vue → Core (Input)
		bindInput(externalProps)

		// Связать события Core → Vue (Emit)
		useSyncEvents(accessor, inspector, emit)

		return { refs }
	}

	// --- USE ADAPTER ---
	function useAdapter(
		descriptor: IComponentDescriptor,
		props: Record<string, any>,
		emit?: (event: string, ...args: any[]) => void,
		config?: IElevatorConfig,
	) {
		// 1. Подняться на лифте — получить родительский контекст
		const parentContexts: Record<string, any> = {}
		if (config?.elevators) {
			for (const [key, elevator] of Object.entries(config.elevators)) {
				parentContexts[key] = elevator.up()
			}
		}

		const { instance, bundle, accessor } = createAdapter(descriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})

		const { refs } = useRuntime(accessor, props, emit)

		const { bindElement } = bindPlugins(bundle, instance)

		// 2. Если есть родительская коллекция — зарегистрироваться в ней
		const parentCollection = parentContexts['collection'] as
			| { insertAt(item: any, index?: number): boolean; deleteItem(item: any): boolean }
			| undefined
		if (parentCollection && 'uid' in (instance as any)) {
			parentCollection.insertAt(instance)
		}

		// 3. Опуститься на лифте — передать себя детям
		if (config?.elevators) {
			for (const [, elevator] of Object.entries(config.elevators)) {
				elevator.down(instance)
			}
		}

		const rootElement = ref<Element | null>(null)

		watch(rootElement, (el) => bindElement(el ?? null), { flush: 'post' })

		onUnmounted(() => {
			bindElement(null)
			// 4. При размонтировании — удалиться из родительской коллекции
			if (parentCollection && 'uid' in (instance as any)) {
				parentCollection.deleteItem(instance)
			}
		})

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	}

	return { useProps, useEmits, useRuntime, useAdapter }
}

export const { useProps, useEmits, useRuntime, useAdapter } = createVueAdapter(vueNaming)
