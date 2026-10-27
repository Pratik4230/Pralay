"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type CreateComposerCaretContextValue = {
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  getCaretIndex: () => number;
  subscribeCaretMove: (listener: () => void) => () => void;
  notifyCaretMove: () => void;
  /** Set caret once after the next composer `text` update (mention pick). */
  queueCaretAfterEdit: (index: number) => void;
  consumeQueuedCaret: () => number | null;
};

const CreateComposerCaretContext =
  createContext<CreateComposerCaretContextValue | null>(null);

export function CreateComposerCaretProvider({
  children,
}: {
  children: ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretListenersRef = useRef(new Set<() => void>());
  const queuedCaretRef = useRef<number | null>(null);
  const lastNotifiedCaretRef = useRef<number | null>(null);

  const registerTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    lastNotifiedCaretRef.current = null;
  }, []);

  const getCaretIndex = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return 0;
    return el.selectionStart ?? el.value.length;
  }, []);

  const notifyCaretMove = useCallback(() => {
    const caretIndex = getCaretIndex();
    if (caretIndex === lastNotifiedCaretRef.current) return;
    lastNotifiedCaretRef.current = caretIndex;

    for (const listener of caretListenersRef.current) {
      listener();
    }
  }, [getCaretIndex]);

  const subscribeCaretMove = useCallback((listener: () => void) => {
    caretListenersRef.current.add(listener);
    return () => {
      caretListenersRef.current.delete(listener);
    };
  }, []);

  const queueCaretAfterEdit = useCallback((index: number) => {
    queuedCaretRef.current = Math.max(0, index);
  }, []);

  const consumeQueuedCaret = useCallback(() => {
    const queued = queuedCaretRef.current;
    queuedCaretRef.current = null;
    return queued;
  }, []);

  const value = useMemo(
    () => ({
      registerTextarea,
      getCaretIndex,
      subscribeCaretMove,
      notifyCaretMove,
      queueCaretAfterEdit,
      consumeQueuedCaret,
    }),
    [
      consumeQueuedCaret,
      getCaretIndex,
      notifyCaretMove,
      queueCaretAfterEdit,
      registerTextarea,
      subscribeCaretMove,
    ],
  );

  return (
    <CreateComposerCaretContext.Provider value={value}>
      {children}
    </CreateComposerCaretContext.Provider>
  );
}

export function useCreateComposerCaret() {
  const ctx = useContext(CreateComposerCaretContext);
  if (!ctx) {
    throw new Error(
      "useCreateComposerCaret must be used within CreateComposerCaretProvider",
    );
  }
  return ctx;
}
