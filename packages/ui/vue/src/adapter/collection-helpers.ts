/**
 * Vue-обертки для фреймворк-агностик адаптеров коллекций.
 *
 * useCollectionAdapter — для родительской коллекции (Tabs, Collapse, ListBox).
 * useCollectionItemAdapter — для элемента коллекции (TabItem, CollapseItem, ListBoxItem).
 *
 * Используют createCollectionAdapter / createCollectionItemAdapter для создания
 * instance/bundle с элеваторами, затем делегируют Vue-биндинг в useAdapter.
 */

import { toRaw, onUnmounted } from 'vue'
import {
    createCollectionAdapter,
    createCollectionItemAdapter,
} from '@soldy/setup'
import type { IComponentDescriptor, TElevatorFactory } from '@soldy/setup'
import { VueElevator } from './elevator'
import { useAdapter } from './createAdapter'

const vueElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
    new VueElevator<T>(key)

export function useCollectionAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle } = createCollectionAdapter(
        descriptor,
        {
            ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
            plugins: props.plugins,
            props,
        },
        vueElevatorFactory,
    )

    return useAdapter(descriptor, { ...props, ctrl: instance, plugins: bundle }, emit)
}

export function useCollectionItemAdapter(
    descriptor: IComponentDescriptor,
    props: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const { instance, bundle } = createCollectionItemAdapter(
        descriptor,
        {
            ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
            plugins: props.plugins,
            props,
        },
        vueElevatorFactory,
        onUnmounted,
    )

    return useAdapter(descriptor, { ...props, ctrl: instance, plugins: bundle }, emit)
}
