import { useState } from 'react';

export function useLocalStorage<T>(_key: string, initialValue: T) {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);
        } catch (error) {
            console.warn(`Error setting memory state:`, error);
        }
    };

    return [storedValue, setValue] as const;
}
