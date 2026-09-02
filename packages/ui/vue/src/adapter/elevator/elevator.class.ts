/**
 * TVueElevator — реализация IContextElevator через Vue provide/inject.
 *
 * Наследует TElevator из @soldy/setup (кэширование ключей).
 * Ключевое ограничение: up()/down() должны вызываться синхронно
 * внутри setup() UI-компонента.
 */

import { provide, inject } from 'vue'
import { TElevator } from '@soldy/setup'

export class TVueElevator<T = any> extends TElevator<T> {
    down(value: T): void {
        provide(this._key, value)
    }

    up(): T | undefined {
        return inject<T>(this._key, undefined as any)
    }
}
