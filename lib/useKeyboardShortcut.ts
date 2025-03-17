import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardOptions {
  disableOnInput?: boolean;
  preventDefault?: boolean;
  keyEvent?: 'keydown' | 'keyup';
}

/**
 * A hook to handle keyboard shortcuts
 * @param keys A string or array of strings representing keys or key combinations (e.g., 'a', 'Alt+a')
 * @param callback Function to call when the key combination is pressed
 * @param options Configuration options
 */
export function useKeyboardShortcut(
  keys: string | string[],
  callback: KeyHandler,
  options: KeyboardOptions = {}
) {
  const {
    disableOnInput = true,
    preventDefault = true,
    keyEvent = 'keydown',
  } = options;

  // Normalize keys to array
  const keysArray = Array.isArray(keys) ? keys : [keys];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore shortcuts in input fields if disableOnInput is true
      if (
        disableOnInput &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement ||
          (event.target as HTMLElement)?.isContentEditable)
      ) {
        return;
      }

      // Check for key combinations
      const keyPressed = event.key.toLowerCase();
      const modifiers = {
        alt: event.altKey,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      };

      // Check each defined shortcut
      for (const shortcut of keysArray) {
        // Parse the shortcut string
        const parts = shortcut.split('+').map(part => part.trim().toLowerCase());
        const key = parts.pop() || '';
        const requiredModifiers = {
          alt: parts.includes('alt'),
          ctrl: parts.includes('ctrl') || parts.includes('control'),
          shift: parts.includes('shift'),
          meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
        };

        // Check if this shortcut matches
        const keyMatches = keyPressed === key;
        const modifiersMatch =
          modifiers.alt === requiredModifiers.alt &&
          modifiers.ctrl === requiredModifiers.ctrl &&
          modifiers.shift === requiredModifiers.shift &&
          modifiers.meta === requiredModifiers.meta;

        if (keyMatches && modifiersMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback(event);
          return;
        }
      }
    },
    [keysArray, callback, disableOnInput, preventDefault]
  );

  useEffect(() => {
    window.addEventListener(keyEvent, handleKeyDown);
    return () => {
      window.removeEventListener(keyEvent, handleKeyDown);
    };
  }, [handleKeyDown, keyEvent]);
} 