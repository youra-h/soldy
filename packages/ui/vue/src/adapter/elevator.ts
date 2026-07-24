/**
 * VueElevator — реализация IContextElevator через Vue provide/inject.
 *
 * Ключевое ограничение: up()/down() должны вызываться синхронно
 * внутри setup() UI-компонента.
 */

import { provide, inject, type InjectionKey } from 'vue'
import type { IContextElevator } from '@soldy/accessor'

const KEY_MAP = new Map<string | symbol, InjectionKey<any>>()

function getKey(key: string | symbol): InjectionKey<any> {
    let k = KEY_MAP.get(key)
    if (!k) {
        k = Symbol(key.toString())
        KEY_MAP.set(key, k)
    }
    return k
}

export class VueElevator<T> implements IContextElevator<T> {
    private _key: InjectionKey<T>

    constructor(key: string | symbol) {
        this._key = getKey(key)
    }

    down(value: T): void {
        provide(this._key, value)
    }

    up(): T | undefined {
        return inject<T>(this._key, undefined as any)
    }
}
