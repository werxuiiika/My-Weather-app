import React, { createContext } from 'react';

export const LoadingContext = createContext({ isLoading: true, setLoading: () => {} });
