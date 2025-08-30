'use client';

import React, { FC, ReactNode } from 'react';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Simplified provider without wallet adapters since we're using simple auth
  return <>{children}</>;
};