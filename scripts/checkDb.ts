import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: users } = await supabase.from('users').select('*');
    const { data: profiles } = await supabase.from('profiles').select('*');

    console.log('Users:', users?.length);
    console.log('Profiles:', profiles?.length);

    if (users && profiles && users.length > profiles.length) {
        console.log('Fixing missing profiles...');
        for (const u of users) {
            const existing = profiles.find(p => p.id === u.id);
            if (!existing) {
                console.log(`Inserting profile for user: ${u.email}`);
                await supabase.from('profiles').insert({
                    id: u.id,
                    email: u.email,
                    username: u.name || 'Dev',
                });
            }
        }
    }
}
main();
