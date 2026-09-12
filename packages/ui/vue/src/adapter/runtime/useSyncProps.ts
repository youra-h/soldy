import { getCurrentInstance, ref, watch, onUnmounted, type Ref } from 'vue'
import type { IAccessor, TDescriptorInspector, IAccessorProp } from '@soldy/accessor'

export interface ISyncOptions {
	/** Коллбэк перед записью значения из Vue во внутренний Core */
	onInput?: (prop: IAccessorProp, value: any) => any
	/** Коллбэк при обновлении значения из Core во Vue */
	onOutput?: (prop: IAccessorProp, value: any) => void
}

/** `some-prop` → `someProp`: в разметке проп могли написать через дефис. */
function camelize(name: string): string {
	return name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

export function useSyncProps(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	options: ISyncOptions = {},
) {
	const refs: Record<string, Ref<any>> = {}
	const cleanupFns: Array<() => void> = []

	// 1. Core → Vue (Output): создать refs, подписаться на триггеры
	function bindOutput(): () => void {
		const offs: Array<() => void> = []

		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const rawTriggers = inspector.getRawTriggers(prop)

			// Свойства без триггеров — pass-through (ctrl)
			if (rawTriggers.length === 0) continue

			const propRef = ref(accessor.getValue(prop))

			refs[inspector.getExportPropName(prop)] = propRef

			const eventSource = accessor.getEventSource(prop)

			if (!eventSource) continue

			for (const rawTrigger of rawTriggers) {
				const handler = () => {
					// Свежесть значения — ответственность ядра: составные props
					// отдают снимок через valueOf() (см. TClasses, драйвер коллекции)
					// либо заменяются целиком (layout-плагины). Адаптер не угадывает.
					const value = accessor.getValue(prop)

					propRef.value = value
					options.onOutput?.(prop, value)
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		cleanupFns.push(...offs)

		return () => offs.forEach((off) => off())
	}

	/**
	 * Имена, под которыми проп реально написан в разметке.
	 *
	 * `vnode.props` — то, что автор передал, без подставленных Vue значений по
	 * умолчанию. Разница видна только при внешнем `ctrl`: сам компонент строит
	 * инстанс из props и стартовые значения уже получил, а чужому инстансу
	 * стартовые значения не доезжали вовсе — `watch` без `immediate` молчит,
	 * пока проп не сменится. Отсюда и `<Select :ctrl="x" placeholder="…">` без
	 * плейсхолдера.
	 *
	 * Подставленные Vue значения по умолчанию писать нельзя: у пропа ядра
	 * `default` берётся из `defaultValues`, и отсутствующий в разметке
	 * `editable` пришёл бы как `false` — то есть монтирование затирало бы
	 * состояние чужого инстанса своими умолчаниями. Ровно то, ради чего этот
	 * инстанс и передают.
	 */
	function passedNames(): Set<string> {
		const raw = getCurrentInstance()?.vnode.props ?? {}

		return new Set(Object.keys(raw).map((name) => camelize(name)))
	}

	// 2. Vue → Core (Input): watch внешних props
	function bindInput(props: Record<string, any>): void {
		const passed = passedNames()

		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const formattedPropName = inspector.getExportPropName(prop)
			const read = () => props[formattedPropName] ?? props[prop.name.name]

			const write = (newVal: any) => {
				if (newVal === undefined) return

				accessor.setValue(prop, options.onInput ? options.onInput(prop, newVal) : newVal)
			}

			// Стартовое значение — только для написанного в разметке
			if (passed.has(formattedPropName) || passed.has(prop.name.name)) write(read())

			const stopWatch = watch(read, write)

			cleanupFns.push(stopWatch)
		}
	}

	function cleanup(): void {
		cleanupFns.forEach((fn) => fn())
		cleanupFns.length = 0
	}

	onUnmounted(cleanup)

	return { refs, bindOutput, bindInput, cleanup }
}
