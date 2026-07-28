import { SAML } from "@node-saml/node-saml";
import { env } from "../../config/env.js";

/**
 * InstaSafe SSO (SAML 2.0). Enabled only when all SAML_* env vars are present.
 * Validation is strict by design: IdP signature, audience, InResponseTo (replay),
 * and clock skew are all enforced — see PLANNING.md §2.3.
 */
export function createSaml(): SAML | null {
  if (!env.samlEnabled) return null;

  return new SAML({
    callbackUrl: `${env.API_BASE_URL}/api/v1/auth/callback`,
    entryPoint: env.SAML_IDP_SSO_URL!,
    issuer: env.SAML_SP_ENTITY_ID!,
    idpCert: normalizeCert(env.SAML_IDP_CERT!),
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    validateInResponseTo: "always" as never,
    acceptedClockSkewMs: 120_000,
    audience: env.SAML_SP_ENTITY_ID!,
    disableRequestedAuthnContext: true,
  });
}

/** Accepts raw PEM or base64-encoded PEM from env. */
function normalizeCert(value: string): string {
  if (value.includes("BEGIN CERTIFICATE")) return value;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    if (decoded.includes("BEGIN CERTIFICATE")) return decoded;
  } catch {
    /* fall through — treat as bare base64 cert body */
  }
  return value;
}
