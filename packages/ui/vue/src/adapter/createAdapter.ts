/**
 * Центральная фабрика Vue-адаптера: createVueAdapter.
 *
 * Собирает useProps, useEmits, useRuntime и useAdapter в единый «запечённый»
 * контекст с фиксированной стратегией именования. Заменяет разрозненные файлы
 * useProps.ts, useEmits.ts, useRuntime.ts, useAdapter.ts — теперь вся логика
 * форматирования делегируется DescriptorInspector'у из @soldy/accessor.
 */

import { toRaw, ref, watch, onUnmounted, type Ref } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter, bindPlugins } from '@soldy/setup'
import type { TComponentAccessor, INamingStrategy, IComponentSchema, ICompiledProp } from '@soldy/accessor'
import { DescriptorInspector } from '@soldy/accessor'
import { useRefs } from './useRefs'
import { vueNaming } from './naming'

export function createVueAdapter(naming: INamingStrategy = vueNaming) {
    const getInspector = (target: any): DescriptorInspector => {
        const schema: IComponentSchema = target.getSchema
            ? target.getSchema()
            : target
        return new DescriptorInspector(schema, naming)
    }

    // --- USE PROPS ---
    // Взято из useProps.ts: TDescriptorInspector → DescriptorInspector
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
    // Взято из useEmits.ts: TDescriptorInspector → DescriptorInspector
    function useEmits(descriptor: IComponentDescriptor): string[] {
        const inspector = getInspector(descriptor)
        const emits = inspector.getExportEvents()

        // Добавляем update:* для v-model (специфика Vue)
        for (const prop of descriptor.props) {
            if (!prop.protected) {
                emits.push(`update:${inspector.getExportPropName(prop)}`)
            }
        }

        return Array.from(new Set(emits))
    }

    // --- USE RUNTIME ---
    // Взято из useRuntime.ts: accessor.getExportName → inspector.getExportPropName
    function useRuntime(
        accessor: TComponentAccessor,
        externalProps: Record<string, any>,
        emit?: (event: string, ...args: any[]) => void,
    ) {
        const inspector = getInspector(accessor)
        const refs: Record<string, Ref<any>> = {}

        // 1. Создаем реактивные refs и пробрасываем события их триггеров в emit
        for (const prop of accessor.getProps(true) as ICompiledProp[]) {
            const formattedPropName = inspector.getExportPropName(prop)
            const eventSource = accessor.getEventSource(prop)
            const triggers = accessor.getTriggers(prop)

            refs[formattedPropName] = useRefs(
                eventSource,
                () => accessor.getValue(prop),
                triggers,
            )

            // Пробрасываем триггеры в emit при срабатывании
            if (eventSource && emit) {
                for (const trigger of prop.triggers) {
                    // Извлекаем чистое имя события без namespace для подписки на eventSource
                    const rawEventName = prop.namespace
                        ? trigger.replace(`${prop.namespace}:`, '')
                        : trigger

                    const eventName = inspector.getExportEventName({
                        name: trigger,
                        namespace: prop.namespace,
                    })

                    eventSource.on(rawEventName, (val: any) => {
                        emit(eventName, val)
                    })
                }
            }
        }

        // 2. Пробрасываем явные события компонентов и плагинов
        for (const evt of accessor.getEvents()) {
            const eventName = inspector.getExportEventName(evt)
            const eventSource = accessor.getEventSource(evt)

            if (eventSource && emit) {
                eventSource.on(evt.name, (...args: any[]) => {
                    emit(eventName, ...args)
                })
            }
        }

        // 3. Синхронизируем Vue Props → Accessor
        const stopWatches: (() => void)[] = []

        for (const prop of accessor.getProps(false) as ICompiledProp[]) {
            const formattedPropName = inspector.getExportPropName(prop)

            stopWatches.push(
                watch(
                    () => externalProps[formattedPropName] ?? externalProps[prop.name],
                    (newVal) => {
                        if (newVal !== undefined) {
                            accessor.setValue(prop, newVal)
                        }
                    },
                ),
            )
        }

        // 4. Cleanup
        onUnmounted(() => {
            stopWatches.forEach((fn) => fn())
        })

        return { refs }
    }

    // --- USE ADAPTER ---
    // Взято из useAdapter.ts
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

// Экспортируем дефолтные готовые функции для мгновенного импорта
export const { useProps, useEmits, useRuntime, useAdapter } = createVueAdapter(vueNaming)
