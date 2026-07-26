/**
 * Абстрактный класс TElevator — база для всех фреймворк-специфичных элеваторов.
 *
 * Кэширует строковые/symbol ключи в уникальные символы, чтобы
 * гарантировать одинаковый InjectionKey во всех вызовах provide/inject
 * (или их аналогах в React/Solid/Angular).
 *
 * Конкретные реализации:
 *   - TVueElevator extends TElevator (provide/inject)
 *   - ReactElevator extends TElevator (React.Context)
 */

import type { IContextElevator } from '@soldy/accessor'

/** Кэш: строковый ключ → уникальный символ */
const KEY_MAP = new Map<string | symbol, symbol>()

function resolveKey(key: string | symbol): symbol {
    let k = KEY_MAP.get(key)

    if (!k) {
        k = Symbol(key.toString())
        KEY_MAP.set(key, k)
    }

    return k
}

export abstract class TElevator<T = any> implements IContextElevator<T> {
    protected readonly _key: symbol

    constructor(key: string | symbol) {
        this._key = resolveKey(key)
    }

    abstract down(value: T): void
    abstract up(): T | undefined
}
