import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TComponentAccessor, TDescriptorInspector, ICompiledProp } from '@soldy/accessor'

export interface ISyncOptions {
    /** Коллбэк перед записью значения из Vue во внутренний Core */
    onInput?: (prop: ICompiledProp, value: any) => any
    /** Коллбэк при обновлении значения из Core во Vue */
    onOutput?: (prop: ICompiledProp, value: any) => void
}

/**
 * Фабрика реактивности: связывает Core и Vue.
 *
 * Принимает accessor + inspector (всего 2 параметра),
 * возвращает { refs, bindOutput, bindInput, cleanup }.
 *
 * - bindOutput(): создаёт refs с начальными значениями и подписывается на триггеры
 * - bindInput(externalProps): вешает watchers на внешние props
 * - cleanup(): снимает все watchers (вызывается автоматически на onUnmounted)
 */
export function useSyncProps(
    accessor: TComponentAccessor,
    inspector: TDescriptorInspector,
    options: ISyncOptions = {},
) {
    const refs: Record<string, Ref<any>> = {}
    const cleanupFns: (() => void)[] = []

    // 1. Core → Vue (Output): создать refs, подписаться на триггеры
    function bindOutput() {
        for (const prop of accessor.getProps(true) as ICompiledProp[]) {
            const rawTriggers = inspector.getRawTriggers(prop)

            // Пропускаем свойства без триггеров — pass-through (ctrl, plugins)
            if (rawTriggers.length === 0) continue

            const formattedPropName = inspector.getExportPropName(prop)
            const initialValue = accessor.getValue(prop)

            const propRef = ref(initialValue)

			refs[formattedPropName] = propRef

            const eventSource = accessor.getEventSource(prop)

            if (eventSource) {
                for (const rawTrigger of rawTriggers) {
                    eventSource.on(rawTrigger, () => {
                        const val = accessor.getValue(prop)

                        // Плагины (TIconStylesPlugin, TSpinnerStylesPlugin и др.)
                        // мутируют свой объект _styles in-place и эмитят change:styles.
                        // accessor.getValue() возвращает ссылку на этот же объект.
                        // Если присвоить ту же ссылку в ref.value — Vue считает
                        // oldValue === newValue и НЕ триггерит watch/ререндер.
                        // Клонируем только plain-объекты (не Vue-компоненты, не массивы).
                        const isPlainObj = typeof val === 'object' && val !== null
                            && val.constructor === Object && !('__v_skip' in val) && !('render' in val)
                        propRef.value = isPlainObj ? { ...val } : val

                        options.onOutput?.(prop, val)
                    })
                }
            }
        }
    }

    // 2. Vue → Core (Input): watch внешних props
    function bindInput(externalProps: Record<string, any>) {
        for (const prop of accessor.getProps(false) as ICompiledProp[]) {
            const formattedPropName = inspector.getExportPropName(prop)

            const stopWatch = watch(
                () => externalProps[formattedPropName] ?? externalProps[prop.name],
                (newVal) => {
                    if (newVal !== undefined) {
                        const valueToSet = options.onInput
                            ? options.onInput(prop, newVal)
                            : newVal

                        accessor.setValue(prop, valueToSet)
                    }
                },
            )
            cleanupFns.push(stopWatch)
        }
    }

    function cleanup() {
        cleanupFns.forEach((fn) => fn())
    }

    onUnmounted(cleanup)

    return {
        refs,
        bindOutput,
        bindInput,
        cleanup,
    }
}
