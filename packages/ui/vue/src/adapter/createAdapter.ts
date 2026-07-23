/**
 * Центральная фабрика Vue-адаптера: createVueAdapter.
 *
 * Собирает useProps, useEmits, useRuntime и useAdapter в единый «запечённый»
 * контекст с фиксированной стратегией именования. Заменяет разрозненные файлы
 * useProps.ts, useEmits.ts, useRuntime.ts, useAdapter.ts — теперь вся логика
 * форматирования делегируется TDescriptorInspector'у из @soldy/accessor.
 */

import { toRaw, ref, watch, onUnmounted, type Ref } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter, bindPlugins } from '@soldy/setup'
import type { TComponentAccessor, INamingStrategy, IComponentSchema, ICompiledProp } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { vueNaming } from './naming'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export function createVueAdapter(naming: INamingStrategy = vueNaming) {
    const getInspector = (target: any): TDescriptorInspector => {
        const schema: IComponentSchema = target.getSchema
            ? target.getSchema()
            : target
        return new TDescriptorInspector(schema, naming)
    }

    // --- USE PROPS ---
    function useProps(descriptor: IComponentDescriptor): Record<string, any> {
        const defaults = (descriptor.ctor as any)?.defaultValues ?? {}
        const inspector = getInspector(descriptor)

        return {
            ...inspector.getExportProps(defaults),
            ctrl: { type: Object, default: undefined },
            plugins: { type: Object, default: undefined },
        }
    }

    // --- USE EMITS ---
    function useEmits(descriptor: IComponentDescriptor): string[] {
        const inspector = getInspector(descriptor)
        const emits = inspector.getExportEvents()

        for (const prop of descriptor.props) {
            if (!prop.protected) {
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
    ) {
        const { instance, bundle, accessor } = createAdapter(descriptor, {
            ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
            plugins: props.plugins,
            props,
        })

        const { refs } = useRuntime(accessor, props, emit)

        const { bindElement } = bindPlugins(bundle, instance)

        const rootElement = ref<Element | null>(null)

        watch(rootElement, (el) => bindElement(el ?? null), { flush: 'post' })

        onUnmounted(() => bindElement(null))

        return { ctrl: instance, plugins: bundle, rootElement, ...refs }
    }

    return { useProps, useEmits, useRuntime, useAdapter }
}

export const { useProps, useEmits, useRuntime, useAdapter } = createVueAdapter(vueNaming)
