import type { IComponent } from '@soldy/core'

export type TInstancePluginEvents<T extends IComponent = IComponent> = {
	ready: (ctx: { instance: T }) => void
	removed: () => void
}
