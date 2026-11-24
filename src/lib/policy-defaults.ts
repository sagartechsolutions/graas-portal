/**
 * Starting text for the GRAAS policies. Staff can edit each one in Admin, Policies; a saved version replaces the text here.
 * Format: "## Heading" starts a section, "- " starts a list item, any other line is a paragraph.
 */
export type Policy = { slug: string; title: string; summary: string; body: string; effective_on: string };

const EFFECTIVE = "2026-11-24";

export const POLICY_DEFAULTS: Policy[] = [
  {
    slug: "membership-rules",
    title: "Membership rules",
    summary: "Who can join, how membership starts, what it includes and how it can end.",
    effective_on: EFFECTIVE,
    body: `## 1. Who can be a member
- Student membership: a person aged 18 or older enrolled in a diploma, degree or postgraduate course.
- Professional membership: working engineers, technicians, faculty, researchers and others working in or entering the field.
- Institution membership: schools, colleges, universities and training institutes, represented by an authorised staff member.
- Industry membership: companies and firms, represented by an authorised employee.
- Students under 18 take part through their school, or with a parent's or guardian's written consent. They cannot open an account themselves.

## 2. Applying
- Apply on this website with true and complete details. One person, one account.
- Institution and industry applications are verified by GRAAS before payment is requested. GRAAS may ask for proof, such as an authorisation letter.
- GRAAS may decline an application. If a fee has already been paid for a declined application, it is refunded in full.

## 3. Fees and when membership starts
- The fee for each plan is the one shown on the Membership page on the day you pay. Taxes, if any, are shown before payment.
- Annual plans can be paid for 1 year, or paid once for a longer period at the discount shown before payment. "Lifetime" membership means 10 years from the day it becomes active.
- Fees are paid online through Razorpay. GRAAS staff and chapters do not collect membership fees in cash.
- Membership becomes active when the payment is confirmed. You then receive a member number, a digital member ID and a membership certificate.

## 4. Validity and renewal
- A membership is valid for the period paid for, counted from the day it becomes active. The end date is shown on the member ID and certificate.
- Renewal opens 60 days before the end date. A renewal paid before the end date adds the period paid for to the existing end date.
- A membership that is not renewed lapses. The member number is kept and is used again if the person renews.

## 5. What a member receives
- A verified digital member ID with a QR code that anyone can check on this website.
- A membership certificate for the current period.
- Access to members' sessions, and member pricing on paid events and courses where one is offered.
- Eligibility to join or start a chapter, take part in competitions, and respond to industry problems, under the rules of each programme.
- Benefits are for the member only and cannot be transferred or sold.

## 6. Using the GRAAS name
- A member may state that they are a "Member of GRAAS" while the membership is active.
- A member may not speak or sign on behalf of GRAAS, collect money in its name, or use the GRAAS logo on products, certificates or advertisements without written permission.

## 7. Conduct
- Every member follows the Code of conduct.

## 8. Suspension and ending of membership
- GRAAS may suspend or end a membership for false information in the application, a serious or repeated breach of the Code of conduct, misuse of the GRAAS name, or a payment that is reversed.
- The member is told the reason and may reply in writing within 15 days. The decision after that review is final.
- A member may end their membership at any time by writing to GRAAS. Fees are refunded only as set out in the Refund and cancellation policy.

## 9. Changes
- GRAAS may change these rules. The current version and its effective date are always on this page. A change in fees does not affect a membership period already paid for.`,
  },
  {
    slug: "code-of-conduct",
    title: "Code of conduct",
    summary: "How members, chapters and staff are expected to treat each other and the work.",
    effective_on: EFFECTIVE,
    body: `## Our standard
GRAAS is a place to learn and build. Everyone taking part, online or in person, is expected to act with honesty, respect and care for safety.

## Respect
- Treat every person with courtesy, whatever their gender, age, religion, caste, region, language, disability or level of skill.
- No harassment, bullying, threats, sexual remarks or unwelcome contact, in any form.
- Students under 18 are contacted only through their school or parent, and only for programme purposes.

## Honesty in work
- Present only your own work, or credit the people whose work you used.
- Do not copy designs, code or reports without permission. Do not falsify results, attendance or certificates.
- In competitions, follow the rulebook and accept the judges' decisions. Declare any conflict of interest.

## Safety
- Follow lab, workshop and site safety instructions. Use protective equipment where it is required.
- Do not operate machines, robots or electrical equipment you have not been trained on unless you are supervised.
- Report unsafe conditions and accidents to the organiser at once.

## Confidentiality and property
- Keep confidential what companies and institutions share for industry problems, as agreed with them.
- Respect intellectual property. Ownership of project work follows the terms agreed for that project.
- Take care of equipment and venues. Return what you borrow.

## Money and the GRAAS name
- Only the official GRAAS online payment page collects fees. Members and chapters do not collect money in the name of GRAAS without written approval.
- Do not use membership or a chapter role for personal gain, political campaigning or the promotion of unrelated products.

## Online behaviour
- No spam, abusive posts, or sharing of other people's personal details.
- Do not try to access accounts, data or systems that are not yours.

## Reporting a concern
- Tell the event organiser or chapter coordinator, or write to GRAAS from the Contact page or the Help section of your account. Reports are handled discreetly, and no one is penalised for reporting in good faith.

## What happens after a breach
- Depending on how serious it is: a warning, removal from an event, suspension, or the ending of membership as described in the Membership rules.`,
  },
  {
    slug: "refund-policy",
    title: "Refund and cancellation policy",
    summary: "When a membership fee is refunded, and how.",
    effective_on: EFFECTIVE,
    body: `## Membership fees
- A membership fee is not refundable once the membership is active, because the member ID, certificate and member access are issued immediately.

## When we refund in full
- Your application is declined or cancelled by GRAAS after you have paid.
- You were charged more than once for the same membership.
- Your payment was taken but the membership was not activated within 7 working days.

## Withdrawing before payment
- You can withdraw an application from your account at any time before paying. Nothing is charged.

## How to ask for a refund
- Write to us from the Help section of your account or the Contact page within 30 days of the payment, giving your registered email or mobile number and the payment reference.

## How refunds are paid
- Approved refunds are sent through Razorpay to the original payment method. We start them within 7 working days of approval. Your bank may take a further 5 to 7 working days to show the amount.
- Refunds are never paid in cash or to a different account.

## Failed payments
- If money leaves your account but the payment fails, the bank or Razorpay normally reverses it automatically within 5 to 7 working days. If it does not, write to us with the payment reference.

## Events and courses
- Paid events and courses have their own cancellation terms, shown on the event or course page before you pay.

## Ending your membership
- You may end your membership at any time. Ending it does not create a refund for the remaining period. This applies equally to memberships paid for several years at once.`,
  },
  {
    slug: "terms",
    title: "Terms of use",
    summary: "The terms on which this website and member accounts are offered.",
    effective_on: EFFECTIVE,
    body: `## About these terms
- This website is operated by the Global Robotics And Automation Society (GRAAS). By using it or opening an account you agree to these terms, the Membership rules, the Code of conduct, the Refund and cancellation policy and the Privacy policy.

## Your account
- Give accurate details and keep them up to date. Keep your password private. You are responsible for what is done through your account.
- You must be 18 or older to open an account. Tell us at once if you think someone else has used yours.
- We may suspend an account that is used to break these terms or the law.

## Payments
- Payments are processed by Razorpay. GRAAS does not receive or store your card, UPI or bank login details.
- A payment is complete only when we receive confirmation from Razorpay. Receipts are available in your account.

## Content on this website
- The text, designs, and the GRAAS name and logo belong to GRAAS or are used with permission. You may share pages and quote short passages with credit. You may not copy the site, or use the name or logo to suggest endorsement.
- Photographs captioned as general robotics images are licensed stock photographs and do not show GRAAS events.

## Acceptable use
- Do not misuse the site: no attempts to break in, overload it, collect other people's personal data, or submit false or unlawful content.

## Information on the site
- We work to keep programme details, dates and fees accurate, but they can change. The fee shown at the time of payment is the one that applies.
- Lectures, courses and demonstrations are for learning. Apply engineering and safety judgement before using anything from them on real equipment.

## Liability
- To the extent the law allows, GRAAS is not liable for indirect or consequential loss arising from use of the site or participation in programmes, and its total liability to a member is limited to the membership fee paid for the current period. Nothing here limits liability that cannot be limited by law.

## Law and disputes
- These terms are governed by the laws of India. Please write to us first so we can try to settle any dispute. Failing that, the courts at the place of GRAAS's registered office have jurisdiction.

## Changes
- We may update these terms. The current version and its effective date are on this page.`,
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What we collect, why, who sees it and the choices you have.",
    effective_on: EFFECTIVE,
    body: `## What we collect
- Account and application details: name, email, mobile number, date of birth (to confirm you are 18 or older), city and state, your college, institution or company, and your course or role.
- Membership records: plan, status, member number, dates, and messages you send to our help desk.
- Payment records: amount, date, Razorpay order and payment references, and the type of payment method. Card numbers, UPI PINs and bank passwords are entered on Razorpay's page and never reach GRAAS.
- Enquiries: what you type into the contact form.
- Technical details: the page you came from and a scrambled form of your network address, used to stop spam and abuse.

## Why we use it
- To create your account, process your application and payment, issue your member ID and certificate, and run the programmes you join.
- To tell you about your membership and renewals, and about GRAAS lectures, chapters and events, by WhatsApp, phone or email.
- To keep the account, payment and activity records that the law and good governance require.

## Who can see it
- GRAAS staff, limited by role: for example, the membership desk sees applications and finance sees payments.
- Service providers that run the site for us: Supabase (database and sign-in, hosted in Mumbai, India), Netlify (website hosting) and Razorpay (payments).
- Anyone who scans the QR code on your member ID sees only your name, membership type, status and validity, and the organisation's name for institution and industry members.
- We do not sell personal data or share it with advertisers.

## How long we keep it
- Account and membership details: while you have an account, and for as long afterwards as records require.
- Payment records: as long as accounting and tax rules require, even if the account is deleted.
- Enquiries: up to 24 months.

## Your choices
- See and correct most details in your account. Ask us to correct anything else.
- Ask us to delete your account. We remove your profile and membership and keep only the payment records we must.
- Stop promotional messages at any time by replying to one or writing to us. Messages about your own membership and payments will still reach you.

## Children
- Accounts are for people aged 18 or older. Students under 18 take part through a school or parent, who give consent and contact details.

## Security
- Access is controlled by sign-in and by role. Staff actions on memberships, fees and settings are recorded in an activity log. Data travels over encrypted connections.
- No system is perfectly secure. If a breach affects your data, we will tell you and the authorities as the law requires.

## Questions and complaints
- Write to us from the Contact page or the Help section of your account. We reply within 15 working days.`,
  },
];
