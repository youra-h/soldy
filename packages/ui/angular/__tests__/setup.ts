/**
 * Окружение спеков Angular (`setupFiles` цели `test` в `angular.json`): его
 * билдер выполняет перед файлами спеков, после TestBed.
 */

import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

/**
 * Пакет иконок подключает приложение — как тему. Спеки играют роль
 * приложения: без пакета иконка по роли рисует заглушку и предупреждает в
 * консоль о роли, которой нет. Тот же вызов — в настройке тестов React,
 * Svelte и Solid.
 */

setIcons(material)
