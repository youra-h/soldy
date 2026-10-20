/**
 * Провайдеры окружения спеков (`providersFile` цели `test` в `angular.json`):
 * билдер кладёт их в модуль, которым поднимает TestBed, как `appConfig`
 * приложения.
 *
 * `provideAttrs()` — рендерер адаптера: поле, элементы коллекций, ListBox,
 * Tabs и Table без него не собираются. Файл настройки (`setupFiles`) для этого
 * не годится: он выполняется уже после того, как TestBed поднят.
 */

import type { EnvironmentProviders } from '@angular/core'
import { provideAttrs } from '@soldy-ui/angular'

const providers: EnvironmentProviders[] = [provideAttrs()]

export default providers
