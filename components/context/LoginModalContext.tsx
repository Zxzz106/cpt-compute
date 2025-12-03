"use client";
import React, { createContext, useContext, useState } from "react";

type LoginModalContextValue = {
  showLogin: boolean;
  openLogin: () => void;
  closeLogin: () => void;
};

const LoginModalContext = createContext<LoginModalContextValue | undefined>(undefined);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);

  const openLogin = () => setShowLogin(true);
  const closeLogin = () => setShowLogin(false);

  return (
    <LoginModalContext.Provider value={{ showLogin, openLogin, closeLogin }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used within LoginModalProvider');
  return ctx;
}

export default LoginModalContext;
