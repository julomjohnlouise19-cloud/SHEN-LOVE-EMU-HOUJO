export const TERMS_VERSION = "1.0";
export interface SignupAgreement {
  version: string;
  acceptedAt: string;
}
export const agreementKey = (id: string) => `csl:agreement:${id}`;
