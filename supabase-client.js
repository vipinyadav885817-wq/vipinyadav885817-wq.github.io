(function () {
    const config = window.CYBERSHIELD_SUPABASE_CONFIG || {};
    const sdk = window.supabase;
    const url = typeof config.url === "string" ? config.url.trim() : "";
    const key = typeof config.publishableKey === "string" ? config.publishableKey.trim() : "";
    const isConfigured = Boolean(
        sdk && typeof sdk.createClient === "function" &&
        /^https:\/\//i.test(url) && key &&
        !/YOUR_|REPLACE_ME|PASTE_/i.test(url + key)
    );

    window.cyberShieldAuthConfigured = isConfigured;
    window.cyberShieldAuth = isConfigured
        ? sdk.createClient(url, key, {
            auth: {
                autoRefreshToken: true,
                detectSessionInUrl: true,
                persistSession: true
            }
        })
        : null;
})();
