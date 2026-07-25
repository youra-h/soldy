/**
 * Vue-обертки с пайплайном: createAdapter → decorate* → useVueRuntime.
 *
 * useCollectionAdapter — для родительской коллекции (Tabs, Collapse, ListBox).
 * useCollectionItemAdapter — для элемента коллекции (TabItem, CollapseItem, ListBoxItem).
 */

import { toRaw, onUnmounted } from 'vue'
import { createAdapter } from '@soldy/setup'
import { decorateCollection, decorateCollectionItem } from '@soldy/setup'
import type { IComponentDescriptor, TElevatorFactory } from '@soldy/setup'
import { VueElevator } from './elevator'
import { useVueRuntime } from './createAdapter'

const vueElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
    new VueElevator<T>(key)

export function useCollectionAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle, accessor } = createAdapter(descriptor, {
        ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
        plugins: props.plugins,
        props,
    })

    decorateCollection({ instance, bundle }, vueElevatorFactory)

    return useVueRuntime({ instance, bundle, accessor }, props, emit)
}

export function useCollectionItemAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle, accessor } = createAdapter(descriptor, {
        ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
        plugins: props.plugins,
        props,
    })

    decorateCollectionItem({ instance, bundle }, vueElevatorFactory, onUnmounted)

    return useVueRuntime({ instance, bundle, accessor }, props, emit)
}
