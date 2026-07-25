/**
 * Vue-обертки для фреймворк-агностик адаптеров коллекций.
 *
 * useCollectionAdapter — для родительской коллекции (Tabs, Collapse, ListBox).
 * useCollectionItemAdapter — для элемента коллекции (TabItem, CollapseItem, ListBoxItem).
 *
 * Вся бизнес-логика связи родитель-ребёнок живёт в @soldy/setup
 * (createCollectionAdapter / createCollectionItemAdapter).
 * Здесь — только Vue-специфика: VueElevator, onUnmounted, реактивность.
 */

import { toRaw, ref, watch, onUnmounted } from 'vue'
import {
    createCollectionAdapter,
    createCollectionItemAdapter,
    bindPlugins,
} from '@soldy/setup'
import type { IComponentDescriptor, TElevatorFactory } from '@soldy/setup'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueElevator } from './elevator'
import { vueNaming } from './naming'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'
import type { IComponentSchema } from '@soldy/accessor'

// --- Фабрика элеваторов для Vue ---

const vueElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
    new VueElevator<T>(key)

// --- Вспомогательные утилиты (общие с useAdapter) ---

function getInspector(target: any): TDescriptorInspector {
    const schema: IComponentSchema = target.getSchema ? target.getSchema() : target
    return new TDescriptorInspector(schema, vueNaming)
}

function bindVueRuntime(
    instance: any,
    bundle: any,
    accessor: any,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const inspector = getInspector(accessor)

    const { refs, bindOutput, bindInput } = useSyncProps(accessor, inspector)
    bindOutput()
    bindInput(props)
    useSyncEvents(accessor, inspector, emit)

    const { bindElement } = bindPlugins(bundle, instance)

    const rootElement = ref<Element | null>(null)
    watch(rootElement, (el) => bindElement(el ?? null), { flush: 'post' })

    onUnmounted(() => {
        bindElement(null)
    })

    return { ctrl: instance, plugins: bundle, rootElement, ...refs }
}

// --- Публичные composables ---

/**
 * Vue-composable для родительской коллекции.
 *
 * Создаёт адаптер коллекции (instance + bundle + accessor),
 * настраивает elevators для связи с детьми, и привязывает
 * Vue-реактивность (props, events, DOM-элемент).
 */
export function useCollectionAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle, accessor } = createCollectionAdapter(
        descriptor,
        {
            ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
            plugins: props.plugins,
            props,
        },
        vueElevatorFactory,
    )

    return bindVueRuntime(instance, bundle, accessor, props, emit)
}

/**
 * Vue-composable для элемента коллекции.
 *
 * Создаёт адаптер элемента (instance + bundle + accessor),
 * регистрируется в родительской коллекции через elevators,
 * и привязывает Vue-реактивность.
 */
export function useCollectionItemAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle, accessor } = createCollectionItemAdapter(
        descriptor,
        {
            ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
            plugins: props.plugins,
            props,
        },
        vueElevatorFactory,
        onUnmounted,
    )

    return bindVueRuntime(instance, bundle, accessor, props, emit)
}
