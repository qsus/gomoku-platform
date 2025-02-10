import { writable } from 'svelte/store';

export const userData = writable<{ displayName: string, id: string} | null>(null);
