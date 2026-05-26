export const MSG_OPEN_PANEL = 'TFI_OPEN_PANEL';
export const MSG_GET_PENDING_IMAGE = 'TFI_GET_PENDING_IMAGE';
export const MSG_CLEAR_PENDING_IMAGE = 'TFI_CLEAR_PENDING_IMAGE';

export type TfiMessage =
  | { type: typeof MSG_OPEN_PANEL }
  | { type: typeof MSG_GET_PENDING_IMAGE }
  | { type: typeof MSG_CLEAR_PENDING_IMAGE };
