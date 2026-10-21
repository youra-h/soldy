import type { IToasts } from '@soldy-ui/core'
import type { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Toasts — свои (ядро и плагины) и фасада коллекции: состав,
 * `engine:create`, закрытие тоста. Контекстов у менеджера два, и колбэки
 * обоих — пропсы одного компонента.
 */
export type ToastsEventProps = EventProps<typeof ToastsDescriptor> &
	EventProps<typeof ToastsCollectionDescriptor>

/**
 * Пропсы Toasts. Движок снаружи (`engine`) отдельно не перечислен: он входит
 * в интерфейс пропсов ядра (`IToastsProps`), и тип его несёт дескриптор
 * компонента. Атрибуты — региона: корень менеджера — он, а приложение в
 * `children` своей разметки вокруг не получает.
 */
export type ToastsProps = UseDomProps<typeof ToastsDescriptor, IToasts, ToastsEventProps>
