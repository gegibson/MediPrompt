# MediPrompt HIPAA Safe Zone Checklist

## 1. What You **Can** Collect (Safe)
- Anonymous usage data (page views, clicks, category usage)
- Basic account info if needed for subscriptions:
  - Email (not tied to health data)
  - Password (hashed + salted)
- Payment info handled only by Stripe/PayPal (PCI compliant, not PHI processors)
- Generic symptom input (e.g., "fever, cough, chest pain") so long as it is not linked to identity
- Aggregated analytics (e.g., "40% of users searched 'fever' this month")

## 2. What You **Cannot** Collect (Avoid HIPAA Triggers)
- No PHI (personally identifiable + health together), e.g.:
  - Name + health condition
  - DOB + symptoms
  - Address + medications
  - Email stored together with medical history
- No medical record numbers, insurance IDs, or provider names
- No uploads of lab reports or documents with identifiers
- No integration with hospitals/EHRs (at least in Phase 1)

## 3. User Guidance (Disclaimers Everywhere)
- **Banner / footer:** "This tool is for educational purposes only. Do not enter personal identifiers (like your name, date of birth, or address). For diagnosis or treatment, consult your healthcare provider."
- **Prompts:** "Please describe your symptom without personal details."
- **Terms of service:**
  - Explicitly state you are not a covered entity
  - No medical advice, only educational support

## 4. Data Handling Rules
- Do not store raw health inputs unless necessary.
- If storage is required, make it session-only (deleted when users leave).
- If storing history for premium users:
  - Keep it under a pseudonymous ID (e.g., "User123"), not their email.
  - Allow easy deletion.
- Log activity safely:
  - "User ran chest pain prompt" → ✅ Okay
  - "User John Smith ran chest pain prompt at 2pm" → ❌ HIPAA risk

## 5. Tech / Hosting Setup
- Host on standard secure cloud (AWS, Vercel, Netlify)
- Use HTTPS/TLS encryption everywhere
- No PHI = no need for HIPAA-specific hosting (e.g., Aptible, Datica)
- Keep access logs anonymized

## 6. Marketing / Positioning
- Always say: "Educational health assistant" or "AI nurse triage guide"
- Never say: "We diagnose" or "We provide treatment"
- Do not claim HIPAA compliance if you are not; instead, emphasize privacy-first operations and no PHI storage

## 7. When HIPAA Will Kick In (Future)
- Be ready if you expand into:
  - White-labeling for hospitals, insurers, or telehealth companies
  - Accepting uploads of medical documents
  - Integrating with patient portals or EHRs
- At that point you would need:
  - HIPAA hosting environment
  - Business Associate Agreements (BAAs)
  - More formal compliance processes

## ✅ Bottom Line
You can launch MediPrompt safely without HIPAA obligations if you stick to anonymous use, strong disclaimers, and no PHI collection. This follows the model used by WebMD, Mayo Clinic symptom checkers, and other consumer health apps.
