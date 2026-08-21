# HMSI NGO Website Standards Audit

**Status:** Implemented working baseline — review before formal certification or policy reliance.

## Purpose and scope

This audit reviews the HMSI public website and repository against practical standards for a donor-facing humanitarian NGO platform. It covers public navigation, organizational identity, claims, fundraising, support intake, safeguarding, privacy, accessibility, security, metadata, document handling, and donor due diligence. The audit is an implementation review, not legal advice, an audit opinion, a statutory filing, or an independent certification.

## Standards baseline

The website uses the **Core Humanitarian Standard (CHS) 2024** as a practical accountability reference. The relevant commitments are dignity and participation, timely and appropriate support, resilience, do-no-harm, safe complaints, coordination, learning, competent and managed people, and ethical resource management. The public implementation therefore emphasizes consented storytelling, clear information, safe feedback, responsible use of funds, evidence-qualified claims, and referral to appropriate expertise.

The website uses **WCAG 2.2** as its accessibility baseline. The implementation focuses on keyboard access, visible focus, landmarks, skip navigation, meaningful alternative text, readable contrast, responsive reflow, labelled form controls, status messaging, and target sizes. This does not constitute a WCAG conformance claim without a complete assistive-technology test.

For privacy, the site references Nigeria’s current national framework, the **Nigeria Data Protection Act 2023**, and the Nigeria Data Protection Commission. HMSI should obtain qualified privacy advice to confirm its controller/processor obligations, lawful bases, retention schedule, breach process, and any applicable registration or filing duties.

## Completed corrections

| Audit area | Correction implemented | Evidence or limitation |
|---|---|---|
| Legal identity | Standardized the public name, CAC identifier, incorporation date, trustees, President, TIN, Benin City headquarters, and registered-office information. | Based on HMSI-supplied CAC and FIRS scans; current records should be rechecked periodically. |
| Claims governance | Removed unsupported percentage claims and stale dates; qualified meals, personnel, income, and award statements as HMSI-reported where supporting records are not available. | Methodology, period, and supporting records remain required for independent verification. |
| Trust and policy navigation | Added direct `/transparency`, `/safeguarding`, `/privacy`, and `/terms` routes and linked them through the footer and Trust Center. | Safeguarding and privacy pages are working public notices, not approved policy certificates. |
| Support intake | Distinguished Get Help from fundraiser creation, removed the unsupported 24-hour publication promise, and added privacy/safeguarding acknowledgements. | The underlying database and workflow still require HMSI to maintain review, referral, and access procedures. |
| Donation flow | Added privacy and safeguarding acknowledgement before Paystack checkout; retained anonymous-donation handling and payment-provider disclosure. | Paystack terms, transaction verification, receipts, and refund/chargeback procedures should remain current. |
| Accessibility | Added a global skip link, main-content landmark, active navigation context, logout label, optimized story/news images, and descriptive alt text. | Full WCAG testing with keyboard-only use, screen readers, zoom, mobile devices, and low-bandwidth conditions remains recommended. |
| Security | Removed `.env.local` from the Git index, kept it ignored, added baseline HTTP security headers, and documented credential-rotation guidance. | Historical repository review and rotation are required if any secret was ever present in the file. |
| Metadata | Removed placeholder search-engine verification tokens and enriched organization structured data with legal name, founding date, CAC identifier, TIN, and Benin City/Edo address. | Real search-engine verification tokens may be added only when HMSI controls the relevant accounts and values. |
| Document handling | Kept raw scans out of the public app and repository because they contain signatures, personal contacts, partially legible data, and unrelated private-company records. | Public document publication should use redacted, approved copies only. |

## Evidence status

The supplied scans support the existence and wording of key registration and constitutional records. They support the CAC legal name, CAC/IT/NO 125103, the 21 February 2019 incorporation date, named trustees, the registered office shown on the CAC application, broad organizational objects, TIN 21249981 in an FIRS taxpayer-results record, and constitutional provisions concerning mission-use of funds, record keeping, annual independent-audit processes, non-distribution, and charitable dissolution.

The scans do **not** by themselves prove that every annual audit, annual return, policy approval, safeguarding training, programme result, award record, or current tax-compliance certificate exists. These should not be described as completed or independently verified until HMSI supplies the relevant records.

## Remaining organizational actions

HMSI should approve and maintain formal safeguarding and child-protection, anti-fraud, conflict-of-interest, complaints, privacy/data-protection, information-security, procurement, finance, and monitoring-and-evaluation documents. It should also retain annual reports, audited or reviewed financial statements, programme and outcome evidence, award evidence, partnership references, referral arrangements, staff and volunteer training records, and consent documentation for photographs and stories.

A qualified Nigerian lawyer or privacy professional should review the Terms, Privacy, and Safeguarding pages. Authorized HMSI leadership should review every public claim and confirm the reporting period and methodology for the meals-per-dollar, personnel, income, and award statements. A redacted institutional document pack can be added later once HMSI approves the exact versions for public disclosure.

## References

[1]: https://handbook.hspstandards.org/en/chs/2024/ "Core Humanitarian Standard 2024 Interactive Handbook"

[2]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"

[3]: https://ndpc.gov.ng/about-us/ "Nigeria Data Protection Commission — About Us"
