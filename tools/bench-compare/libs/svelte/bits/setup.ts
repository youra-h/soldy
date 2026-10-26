/**
 * Bits UI is headless and needs no wrapper: no styles, no provider at the
 * root. shadcn-svelte builds on it by copying components into the
 * application with Tailwind classes; the stand takes Bits as it is, without
 * classes and Tailwind — it measures the work of the components, not CSS (as
 * the table stand does, `tools/bench-table/libs/svelte/shadcn.svelte`). The
 * tooltip provider wraps the tooltip page itself, so the other pages do not
 * carry it.
 */
export {}
