"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  createBrowserSupabaseClient,
  type SupabaseClient,
} from '@supabase/auth-helpers-nextjs';

import SupabaseListener from './SupabaseListener';
import { useAsyncMemo } from './useAsyncMemo';

type SupabaseContext = {
  supabase: SupabaseClient<any>;
  sb: SupabaseClient<any>;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// TODO: The reason we're having issues is because ReasonoteSDK is using a different supabase client.
// We can either:
// 1. Use the same client for both ReasonoteSDK and this app -- this suggests a <ReasonoteSDKProvider> component, analogous to this one, which may supercede it?
// 2. Use a different client for ReasonoteSDK and this app, and keep them synched.

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase, setSupabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      setSupabase(createBrowserSupabaseClient({ supabaseUrl: process.env.SUPABASE_URL, supabaseKey: process.env.SUPABASE_ANON_KEY }));
    }
  }, []);

  const session = useAsyncMemo(async () => {
    const ret = await supabase.auth.getSession();

    return ret?.data.session;
  }, []);

  return (
    <Context.Provider value={{ supabase, sb: supabase }}>
      <>
        <SupabaseListener serverAccessToken={session?.access_token} />
        {children}
      </>
    </Context.Provider>
  );
}

export const useSupabase = () => {
  let context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  } else {
    return context;
  }
};
