import type { Component } from 'solid-js'
import type { IToastsItem } from '@soldy-ui/core'

/** Своё содержимое тоста (`render`): компонент с пропом `toast`, чтобы закрыть его. */
export type TToastRender = Component<{ toast: IToastsItem }>
