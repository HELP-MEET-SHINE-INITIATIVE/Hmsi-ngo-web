# HMSI TIN and Tax-Status Reconciliation Record

**Organisation:** The Incorporated Trustees of HELP-MEET SHINE INITIATIVE  
**CAC registration:** CAC/IT/NO 125103  
**Prepared:** 21 August 2026  
**Purpose:** Resolve the inconsistent HMSI TIN reference and establish accurate public wording for donor and Google Ads destinations.

> **Tax disclaimer:** I am an AI, not a tax professional — verify anything consequential with a CPA or tax professional before filing or relying on it for a regulatory or advertising submission.

## Decision record

The correct TIN supported by the supplied source image is **21249981**. The original uploaded image `/home/ubuntu/upload/21008f12-5bcf-4324-994a-7e97aae2eccc.jpg` is headed **CORPORATE TAXPAYERS RESULT** and visibly shows:

| Field | Transcription |
|---|---|
| TIN | **21249981** |
| JTB TIN | N/A |
| Business line | 00 |
| Company name | HELP-MEET SHINE INITIATIVE |
| Tax office | MTO Abuja |

The alternate number **21249921** is not visible on that supplied FIRS taxpayer-result image. The conflict is therefore resolved for HMSI’s public organizational record in favour of **21249981**.

A separate file named `08_FIRS_Corporate_Taxpayers_Result_compressed.jpg` was also checked. Despite its filename, it is a CAC public-notice page and not an FIRS taxpayer-result page. It must not be used as FIRS evidence and must not be used to support either TIN number.

## What the evidence proves and does not prove

The supplied FIRS taxpayer-result printout supports the transcription of TIN 21249981 against HELP-MEET SHINE INITIATIVE and identifies MTO Abuja as the tax office. It does **not**, by itself, prove current tax-clearance status, tax-exemption status, tax-deductibility of donations, or continuing validity without confirmation through the relevant official channel.

The supplied CAC materials support the legal name and CAC/IT/NO 125103. A CAC registration number is not automatically a tax-exemption certificate. HMSI must not describe donations as tax-exempt or tax-deductible unless that status is separately confirmed by the applicable authority and approved for public use.

## Public website correction applied

The public HMSI pages now use the verified TIN **21249981** and qualify it as a **FIRS taxpayer-results record**, not a tax-exemption certificate. The donation and fundraising destinations disclose the legal name and CAC registration number and state that HMSI does not describe donations as tax-exempt or tax-deductible unless the applicable authority confirms that status.

The former unsupported fundraising trust claims **“0% Platform Fees”** and **“24h Verification”** were replaced on the fundraising page with non-numerical, factual wording: **“Approved causes”** and **“Official donation channels.”** The page now tells supporters to review current campaign information before giving.

The affected production routes are:

| Route | Correction |
|---|---|
| `/donate` | Legal name, CAC/IT/NO 125103, TIN 21249981, and non-exemption qualification are shown beside the Paystack donation flow. |
| `/fundraise` | Legal name, CAC/IT/NO 125103, TIN 21249981, and non-exemption qualification are shown in the donor trust section; unsupported numerical claims were removed. |
| `/about` | TIN label now states that it is an FIRS taxpayer-results record and not a tax-exemption certificate. |
| `/transparency` | TIN label and evidence limitation are stated clearly. |
| `/partnerships` | FIRS identification is qualified as a tax identifier and not a tax-exemption certificate. |
| Sitewide JSON-LD | `taxID` remains `21249981`, matching the supplied taxpayer-result record; no tax-exempt or tax-deductible property is asserted. |

## Google Ads decision

Google’s current Solicitation of funds policy requires donation advertising to be on behalf of an eligible organisation and says the destination must clearly state tax-exempt status or disclose a charity number or tax-exemption number.[1] The revised HMSI pages disclose the legal identity and CAC registration number and avoid an unsupported tax-exemption claim. This is a **defensible factual correction**, but Google may still request additional advertiser verification or evidence during ad review.

The donation campaign should remain paused until HMSI confirms, through the appropriate tax adviser or authority, whether the CAC registration disclosure is sufficient for the intended account and whether any additional charity or tax-exemption evidence must be displayed. The volunteer and Get Help campaigns do not solicit donations and can be reviewed separately, subject to normal Google Ads policies.

## Required HMSI confirmation before donation launch

HMSI should obtain a current FIRS record or qualified tax-professional confirmation that the organization’s TIN remains correct. It should also confirm the precise public legal-status wording that may be used for donations. No one should add “tax-exempt,” “tax-deductible,” or a tax-exemption number to the site without supporting evidence.

After that confirmation, the authorised HMSI reviewer should check the `/donate` and `/fundraise` pages on mobile, verify that the Paystack route and privacy links work, and submit the paused ad for Google’s policy review before enabling it. Any Google request for supporting documents should be answered with approved, redacted evidence only.

## References

[1]: https://support.google.com/adspolicy/answer/13528345?hl=en "Google Ads — Solicitation of funds"

[2]: https://support.google.com/adspolicy/answer/6368661?hl=en "Google Ads — Destination requirements"

[3]: https://support.google.com/adspolicy/answer/6020955?hl=en "Google Ads — Misrepresentation"

[4]: https://www.hmsi.org.ng/about "HMSI — About"

[5]: https://www.hmsi.org.ng/transparency "HMSI — Transparency and accountability"
