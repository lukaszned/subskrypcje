import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log("SUPABASE_URL:", supabaseUrl);
console.log(
    "SUPABASE_ANON_KEY starts with:",
    supabaseAnonKey ? supabaseAnonKey.slice(0, 20) : "missing"
);

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const email = "testflowpay@gmail.com";
    const password = "TwojeTestoweHaslo123!";

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login error:", error.message);
        process.exit(1);
    }

    console.log("Access token:");
    console.log(data.session?.access_token);

    console.log("\nUser:");
    console.log(data.user);
}

main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
});