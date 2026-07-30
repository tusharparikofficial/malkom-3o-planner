// InstaSafe SAML 2.0 SSO — service provider implemented as a Supabase Edge
// Function, so the portal needs no server of its own.
//
//   GET  /sso            → health/config check (never echoes secrets)
//   GET  /sso/login      → builds the AuthnRequest, redirects to InstaSafe
//   POST /sso/acs        → validates the signed assertion, JIT-provisions the
//                          user, mints a one-time token, redirects to the app
//   GET  /sso/metadata   → SP metadata XML for the IdP administrator
//
// Deploy:  supabase functions deploy sso --no-verify-jwt
// Secrets: SSO_ENABLED, APP_BASE_URL, SSO_IDP_SSO_URL, SSO_IDP_ISSUER,
//          SSO_IDP_CERT, SSO_SP_ENTITY_ID, SSO_ALLOWED_EMAIL_DOMAINS,
//          SSO_JIT_PROVISION, SSO_LOGIN_LABEL, SSO_WANT_RESPONSE_SIGNED
import { SAML } from "npm:@node-saml/node-saml@5";
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const bool = (k: string, d = false) => {
  const v = env(k).trim().toLowerCase();
  return v === "" ? d : v === "true" || v === "1";
};

const SSO_ENABLED = bool("SSO_ENABLED", false);
const APP_BASE_URL = env("APP_BASE_URL", "https://malkom3.shipping-wns.app").replace(/\/$/, "");
const IDP_SSO_URL = env("SSO_IDP_SSO_URL");
const IDP_ISSUER = env("SSO_IDP_ISSUER");
const IDP_CERT = env("SSO_IDP_CERT");
const SP_ENTITY_ID = env("SSO_SP_ENTITY_ID");
const ALLOWED_DOMAINS = env("SSO_ALLOWED_EMAIL_DOMAINS")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
const JIT = bool("SSO_JIT_PROVISION", true);
const WANT_RESPONSE_SIGNED = bool("SSO_WANT_RESPONSE_SIGNED", false);
const LOGIN_LABEL = env("SSO_LOGIN_LABEL", "Sign in with InstaSafe SSO");

const ACS_URL = `${env("SUPABASE_URL")}/functions/v1/sso/acs`;

/** Accepts a certificate as raw PEM, base64-wrapped PEM, or a bare body. */
function normalizeCert(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (v.includes("BEGIN CERTIFICATE")) return v;
  try {
    const decoded = atob(v.replace(/\s+/g, ""));
    if (decoded.includes("BEGIN CERTIFICATE")) return decoded;
  } catch {
    /* not base64-wrapped PEM — treat as a bare cert body */
  }
  return v;
}

function samlClient() {
  return new SAML({
    callbackUrl: ACS_URL,
    entryPoint: IDP_SSO_URL,
    issuer: SP_ENTITY_ID,
    idpCert: normalizeCert(IDP_CERT),
    audience: SP_ENTITY_ID,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: WANT_RESPONSE_SIGNED,
    // Stateless function: there is no store for outstanding request IDs, so
    // replay protection rests on the XML signature plus the assertion's
    // NotBefore/NotOnOrAfter window (2-minute skew).
    validateInResponseTo: "never" as never,
    acceptedClockSkewMs: 120_000,
    disableRequestedAuthnContext: true,
    forceAuthn: false,
    signatureAlgorithm: "sha256",
  });
}

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>${title}</title>
     <div style="font:16px/1.6 system-ui;max-width:34rem;margin:15vh auto;padding:0 1rem">
       <h1 style="font-size:1.25rem">${title}</h1>${body}
       <p><a href="${APP_BASE_URL}/login" style="color:#0070AD">Back to sign-in</a></p>
     </div>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

/** Detail stays in the function logs; the user gets an actionable code. */
function fail(reason: string, detail?: string) {
  console.error("SSO failure:", reason, detail ?? "");
  return Response.redirect(`${APP_BASE_URL}/login?error=${encodeURIComponent(reason)}`, 302);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/sso/, "").replace(/\/$/, "") || "/";

  if (route === "/" && req.method === "GET") {
    return Response.json({
      ok: true,
      enabled: SSO_ENABLED,
      loginLabel: LOGIN_LABEL,
      acsUrl: ACS_URL,
      spEntityId: SP_ENTITY_ID || null,
      idpConfigured: Boolean(IDP_SSO_URL && IDP_ISSUER),
      certConfigured: Boolean(IDP_CERT),
      allowedDomains: ALLOWED_DOMAINS,
      jitProvision: JIT,
      wantResponseSigned: WANT_RESPONSE_SIGNED,
      appBaseUrl: APP_BASE_URL,
    });
  }

  if (!SSO_ENABLED) {
    return page("SSO is disabled", "<p>Set the <code>SSO_ENABLED</code> secret to <code>true</code>.</p>", 503);
  }
  if (!IDP_SSO_URL || !SP_ENTITY_ID || !IDP_CERT) {
    return page(
      "SSO is not fully configured",
      "<p>The IdP URL, SP entity ID, or signing certificate secret is missing.</p>",
      503,
    );
  }

  if (route === "/metadata") {
    return new Response(samlClient().generateServiceProviderMetadata(null, null), {
      headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8" },
    });
  }

  if (route === "/login") {
    try {
      const relay = url.searchParams.get("next") ?? "/";
      return Response.redirect(await samlClient().getAuthorizeUrlAsync(relay, undefined, {}), 302);
    } catch (e) {
      return fail("sso_init_failed", e instanceof Error ? e.message : String(e));
    }
  }

  if (route === "/acs" && req.method === "POST") {
    try {
      const form = await req.formData();
      const samlResponse = String(form.get("SAMLResponse") ?? "");
      const relayState = String(form.get("RelayState") ?? "/");
      if (!samlResponse) return fail("sso_no_response");

      const { profile } = await samlClient().validatePostResponseAsync({
        SAMLResponse: samlResponse,
        RelayState: relayState,
      });
      if (!profile) return fail("sso_no_profile");

      const attrs = profile as unknown as Record<string, unknown>;
      const email = String(
        attrs.nameID ??
          attrs.email ??
          attrs["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
          "",
      )
        .trim()
        .toLowerCase();
      if (!email.includes("@")) return fail("sso_no_email");

      if (ALLOWED_DOMAINS.length > 0) {
        const domain = email.split("@")[1] ?? "";
        if (!ALLOWED_DOMAINS.includes(domain)) {
          console.warn("SSO domain rejected:", domain);
          return fail("sso_domain_not_allowed");
        }
      }

      const fullName =
        (attrs.displayName as string) ??
        (attrs.name as string) ??
        (attrs["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ??
        undefined;

      const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find or (with JIT on) create the auth user. The database trigger on
      // auth.users assigns the app role — VIEWER, or SUPER_ADMIN when the
      // address is allow-listed in AppSetting.
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let user = existing?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

      if (!user) {
        if (!JIT) return fail("sso_user_not_provisioned");
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName, provider: "instasafe-saml" },
        });
        if (createError || !created.user) return fail("sso_provision_failed", createError?.message);
        user = created.user;
      }

      // Mint a single-use token the browser exchanges for a session.
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkError || !link?.properties?.hashed_token) {
        return fail("sso_session_failed", linkError?.message);
      }

      const target = new URL(`${APP_BASE_URL}/sso/callback`);
      target.searchParams.set("token_hash", link.properties.hashed_token);
      target.searchParams.set("next", relayState.startsWith("/") ? relayState : "/");
      return Response.redirect(target.toString(), 302);
    } catch (e) {
      return fail("sso_auth_failed", e instanceof Error ? e.message : String(e));
    }
  }

  return page("Not found", `<p>Unknown SSO route <code>${route}</code>.</p>`, 404);
});
