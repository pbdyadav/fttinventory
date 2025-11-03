import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export function useAuth() {
const [user, setUser] = useState(supabase.auth.getUser ? null : null);


useEffect(() => {
const get = async () => {
const { data } = await supabase.auth.getUser();
setUser(data?.user || null);
};
get();
const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
setUser(session?.user ?? null);
});
return () => {
listener?.subscription.unsubscribe();
};
}, []);


const signOut = async () => await supabase.auth.signOut();


return { user, signOut };
}