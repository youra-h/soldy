// composables/useInstanceBinding.ts (если хотим отдельно)
import { type Reactive, toRaw } from 'vue'
import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins/base'
import { TInstancePlugin } from '@soldy/plugins/common/instance'

/**
 * Утилита для привязки реактивного инстанса к `TInstancePlugin` внутри бандла.
 * Позволяет легко синхронизировать реактивный инстанс с `TInstancePlugin` в бандле.
 * @param bundle - бандл, содержащий `TInstancePlugin`, который будет синхронизирован с реактивным инстансом.
 * @param instance - реактивный инстанс, который будет привязан к `TInstancePlugin`.
 */
export function useInstanceBinding(bundle: IPluginBundle, instance: Reactive<IComponent>) {
	bundle.get(TInstancePlugin)!.instance = toRaw(instance) as IComponent
}
