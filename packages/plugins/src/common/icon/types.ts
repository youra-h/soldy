export type TIconStylePluginEvents = {
    /** Вызывается при изменении набора стилей иконки */
    changeStyles: (styles: Record<string, string | number>) => void
}
