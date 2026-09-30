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
  getCaretIndex: () => number;
  setCaretIndex: (index: number) => void;
  /** Subscribe when caret moves (mention menu only; avoids composer re-renders). */
  subscribeCaret: (listener: () => void) => () => void;
};

const CreateComposerCaretContext =
  createContext<CreateComposerCaretContextValue | null>(null);

export function CreateComposerCaretProvider({
  children,
}: {
  children: ReactNode;
}) {
  const caretRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  const getCaretIndex = useCallback(() => caretRef.current, []);

  const setCaretIndex = useCallback(
    (index: number) => {
      const next = Math.max(0, index);
      caretRef.current = next;
      notify();
    },
    [notify],
  );

  const subscribeCaret = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ getCaretIndex, setCaretIndex, subscribeCaret }),
    [getCaretIndex, setCaretIndex, subscribeCaret],
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
