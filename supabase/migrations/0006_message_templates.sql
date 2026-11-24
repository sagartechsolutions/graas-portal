-- The messages GRAAS sends, one row per event and channel. Staff edit the email wording in Admin > Messages.
-- WhatsApp rows hold the exact text submitted to Meta for approval; {{1}}, {{2}} map to wa_params in order.
-- In email bodies: a blank line starts a new paragraph, **text** is bold, [Label](url) alone on a line is a button,
-- and {{code}} alone on a line is shown as a large code.

insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_category, wa_params, sort) values

-- Codes -----------------------------------------------------------------------------------------------------------
('code_verify_email', 'email', 'member', 'Email confirmation code', 'Sent right after sign-up and whenever a member asks to confirm their email.', true, true,
 '{{code}} is your GRAAS confirmation code',
 $t$Hi {{name}},

Use this code to confirm the email address for your GRAAS account:

{{code}}

The code works for {{minutes}} minutes. If you did not create a GRAAS account, you can ignore this email.$t$, null, null, '{}', 10),

('code_reset_password', 'email', 'member', 'Password reset code', 'Sent when someone asks to reset a password using an email address.', true, true,
 '{{code}} is your GRAAS password reset code',
 $t$Hi {{name}},

Someone asked to reset the password for your GRAAS account. Use this code to choose a new password:

{{code}}

The code works for {{minutes}} minutes. If this was not you, ignore this email and your password stays the same.$t$, null, null, '{}', 11),

('code_reset_password', 'whatsapp', 'member', 'Password reset code', 'Sent when someone asks to reset a password using their confirmed WhatsApp number.', true, true,
 null, '{{1}} is your verification code.', 'graas_code', 'AUTHENTICATION', '{code}', 11),

('code_change_email', 'email', 'member', 'New email confirmation code', 'Sent to the new address when a member changes their email.', true, true,
 '{{code}} is your code to change your GRAAS email',
 $t$Hi {{name}},

Use this code to make this address the email for your GRAAS account:

{{code}}

The code works for {{minutes}} minutes. If you did not ask for this, ignore this email.$t$, null, null, '{}', 12),

('code_verify_phone', 'whatsapp', 'member', 'WhatsApp number confirmation code', 'Sent when a member confirms their WhatsApp number.', true, true,
 null, '{{1}} is your verification code.', 'graas_code', 'AUTHENTICATION', '{code}', 13),

-- Account ---------------------------------------------------------------------------------------------------------
('welcome', 'email', 'member', 'Welcome', 'Sent once, when a new member confirms their email.', true, false,
 'Welcome to GRAAS',
 $t$Hi {{name}},

Your email is confirmed and your GRAAS account is ready.

From your account you can follow your application, pay your fee, download your member ID and certificate, and write to us for help.

[Open my account]({{link}})$t$, null, null, '{}', 20),

('password_changed', 'email', 'member', 'Password changed', 'Security notice whenever an account password changes.', true, true,
 'Your GRAAS password was changed',
 $t$Hi {{name}},

The password for your GRAAS account was changed on {{when}}.

If this was you, there is nothing more to do. If it was not, reset your password straight away and write to us at {{support_email}}.

[Reset my password]({{site}}/forgot)$t$, null, null, '{}', 21),

('password_changed', 'whatsapp', 'member', 'Password changed', 'Security notice on WhatsApp whenever an account password changes.', true, false,
 null, 'Hi {{1}}, the password for your GRAAS account was just changed. If this was not you, reset it now at graas.org.in/forgot', 'graas_password_changed', 'UTILITY', '{name}', 21),

('email_changed', 'email', 'member', 'Email changed', 'Sent to the old address when a member changes their email.', true, true,
 'Your GRAAS email was changed',
 $t$Hi {{name}},

The email for your GRAAS account was changed to {{new_email}} on {{when}}. From now on we write to the new address.

If you did not do this, write to us straight away at {{support_email}}.$t$, null, null, '{}', 22),

-- Membership ------------------------------------------------------------------------------------------------------
('application_received', 'email', 'member', 'Application received', 'Sent when an application needs approval by the membership desk.', true, false,
 'We have received your GRAAS membership application',
 $t$Hi {{name}},

Thank you for applying for {{plan}}. Our membership desk will review your application and write to you with the decision.

You can check its progress any time in your account.

[View my application]({{link}})$t$, null, null, '{}', 30),

('application_received', 'whatsapp', 'member', 'Application received', null, true, false,
 null, 'Hi {{1}}, we have received your application for {{2}}. Our membership desk will review it and keep you updated. You can track it at graas.org.in/account', 'graas_application_received', 'UTILITY', '{name,plan}', 30),

('payment_due', 'email', 'member', 'Ready for payment', 'Sent when an application is approved, or straight away for plans that need no approval.', true, false,
 'Your GRAAS application is ready for payment',
 $t$Hi {{name}},

Your application for {{plan}} is ready. Pay {{amount}} to activate your membership and get your member ID.

[Pay and activate]({{link}})$t$, null, null, '{}', 31),

('payment_due', 'whatsapp', 'member', 'Ready for payment', null, true, false,
 null, 'Hi {{1}}, your application for {{2}} is ready. Pay {{3}} from your account at graas.org.in/account to activate your membership.', 'graas_payment_due', 'UTILITY', '{name,plan,amount}', 31),

('membership_active', 'email', 'member', 'Membership active', 'Sent when a membership is activated after payment or by staff.', true, false,
 'Your GRAAS membership is active',
 $t$Hi {{name}},

Welcome aboard. Your {{plan}} is now active.

**Member number:** {{member_no}}
**Valid till:** {{valid_till}}

Your digital member ID and certificate are ready in your account.

[Get my member ID]({{link}})$t$, null, null, '{}', 32),

('membership_active', 'whatsapp', 'member', 'Membership active', null, true, false,
 null, 'Hi {{1}}, your GRAAS membership is now active. Member number: {{2}}. Valid till: {{3}}. Download your member ID at graas.org.in/account', 'graas_membership_active', 'UTILITY', '{name,member_no,valid_till}', 32),

('membership_renewed', 'email', 'member', 'Membership renewed or extended', 'Sent when the end date moves later, after a renewal payment or an extension by staff.', true, false,
 'Your GRAAS membership now runs till {{valid_till}}',
 $t$Hi {{name}},

Your {{plan}} is now valid till {{valid_till}}. Your member number stays {{member_no}}.

[View my membership]({{link}})$t$, null, null, '{}', 33),

('membership_renewed', 'whatsapp', 'member', 'Membership renewed or extended', null, true, false,
 null, 'Hi {{1}}, your GRAAS membership {{2}} is now valid till {{3}}. Thank you for staying with GRAAS.', 'graas_membership_renewed', 'UTILITY', '{name,member_no,valid_till}', 33),

('application_rejected', 'email', 'member', 'Application not accepted', 'Sent when the membership desk rejects an application. Includes the reason given.', true, false,
 'Update on your GRAAS membership application',
 $t$Hi {{name}},

We are sorry, but we cannot accept your application for {{plan}} at this time.

Reason: {{reason}}

If you have questions, reply to this email or write to us from your account.$t$, null, null, '{}', 34),

('application_rejected', 'whatsapp', 'member', 'Application not accepted', null, true, false,
 null, 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.', 'graas_account_update', 'UTILITY', '{name,topic}', 34),

('membership_suspended', 'email', 'member', 'Membership on hold', 'Sent when staff suspend a membership. Includes the reason given.', true, false,
 'Your GRAAS membership is on hold',
 $t$Hi {{name}},

Your membership {{member_no}} has been put on hold.

Reason: {{reason}}

Your member ID does not show as valid while the membership is on hold. If you think this is a mistake, reply to this email.$t$, null, null, '{}', 35),

('membership_suspended', 'whatsapp', 'member', 'Membership on hold', null, true, false,
 null, 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.', 'graas_account_update', 'UTILITY', '{name,topic}', 35),

('membership_reinstated', 'email', 'member', 'Membership active again', 'Sent when staff lift a hold.', true, false,
 'Your GRAAS membership is active again',
 $t$Hi {{name}},

Your membership {{member_no}} is active again and valid till {{valid_till}}.

[View my membership]({{link}})$t$, null, null, '{}', 36),

('membership_reinstated', 'whatsapp', 'member', 'Membership active again', null, true, false,
 null, 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.', 'graas_account_update', 'UTILITY', '{name,topic}', 36),

('membership_cancelled', 'email', 'member', 'Membership or application closed', 'Sent when a membership or application is cancelled, withdrawn or closed after a refund.', true, false,
 'Your GRAAS {{topic}} has been closed',
 $t$Hi {{name}},

Your GRAAS {{topic}} has been closed.

Reason: {{reason}}

If you have questions, reply to this email.$t$, null, null, '{}', 37),

('membership_cancelled', 'whatsapp', 'member', 'Membership or application closed', null, true, false,
 null, 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.', 'graas_account_update', 'UTILITY', '{name,topic}', 37),

('renewal_reminder', 'email', 'member', 'Renewal reminder', 'Sent before a membership ends, on the days set under Reminders.', true, false,
 'Your GRAAS membership ends {{days_text}}',
 $t$Hi {{name}},

Your {{plan}} ({{member_no}}) ends on {{valid_till}}. Renew from your account to keep your member benefits without a break.

[Renew my membership]({{link}})$t$, null, null, '{}', 38),

('renewal_reminder', 'whatsapp', 'member', 'Renewal reminder', null, true, false,
 null, 'Hi {{1}}, your GRAAS membership {{2}} ends on {{3}}. Renew from your account at graas.org.in/account to keep your benefits.', 'graas_renewal_reminder', 'UTILITY', '{name,member_no,valid_till}', 38),

('membership_expired', 'email', 'member', 'Membership ended', 'Sent the day after a membership ends.', true, false,
 'Your GRAAS membership has ended',
 $t$Hi {{name}},

Your {{plan}} ({{member_no}}) ended on {{valid_till}}. You can renew any time from your account to make it active again.

[Renew now]({{link}})$t$, null, null, '{}', 39),

('membership_expired', 'whatsapp', 'member', 'Membership ended', null, true, false,
 null, 'Hi {{1}}, your GRAAS membership {{2}} ended on {{3}}. You can renew it any time at graas.org.in/account', 'graas_membership_expired', 'UTILITY', '{name,member_no,valid_till}', 39),

-- Payments --------------------------------------------------------------------------------------------------------
('payment_received', 'email', 'member', 'Payment received', 'Sent with the receipt number when a payment succeeds.', true, false,
 'Payment received: {{amount}}, receipt {{receipt_no}}',
 $t$Hi {{name}},

We have received your payment of {{amount}} for {{plan}}.

**Receipt number:** {{receipt_no}}
**Paid on:** {{paid_on}}

You can download the receipt from the Payments section of your account.

[Download receipt]({{link}})$t$, null, null, '{}', 40),

('payment_received', 'whatsapp', 'member', 'Payment received', null, true, false,
 null, 'Hi {{1}}, we have received your payment of {{2}} for {{3}}. Receipt number: {{4}}. You can download the receipt at graas.org.in/account', 'graas_payment_received', 'UTILITY', '{name,amount,plan,receipt_no}', 40),

('payment_failed', 'email', 'member', 'Payment did not go through', 'Sent when Razorpay reports a failed payment.', true, false,
 'Your GRAAS payment did not go through',
 $t$Hi {{name}},

Your payment of {{amount}} for {{plan}} did not go through. If money left your account, your bank returns it automatically, usually within 5 to 7 working days.

You can try again from your account.

[Try again]({{link}})$t$, null, null, '{}', 41),

('refund_processed', 'email', 'member', 'Refund processed', 'Sent when a refund is sent through Razorpay.', true, false,
 'Refund of {{amount}} processed',
 $t$Hi {{name}},

We have refunded {{amount}} against receipt {{receipt_no}}. It reaches the account or card you paid from, usually within 5 to 7 working days.

Reason: {{reason}}$t$, null, null, '{}', 42),

('refund_processed', 'whatsapp', 'member', 'Refund processed', null, true, false,
 null, 'Hi {{1}}, we have refunded {{2}} against receipt {{3}}. It usually reaches your account within 5 to 7 working days.', 'graas_refund_processed', 'UTILITY', '{name,amount,receipt_no}', 42),

-- Help desk -------------------------------------------------------------------------------------------------------
('ticket_received', 'email', 'member', 'Help request received', 'Sent when a member writes to us from their account.', true, false,
 'We have your message: {{ticket_subject}}',
 $t$Hi {{name}},

Thank you for writing to us. We have received your message and will reply in your account, usually within two working days.

**Your message:** {{ticket_subject}}$t$, null, null, '{}', 50),

('ticket_replied', 'email', 'member', 'Reply to help request', 'Sent when staff reply to a help request.', true, false,
 'Reply to your message: {{ticket_subject}}',
 $t$Hi {{name}},

We have replied to your message "{{ticket_subject}}":

{{reply}}

[See it in my account]({{link}})$t$, null, null, '{}', 51),

('ticket_replied', 'whatsapp', 'member', 'Reply to help request', null, true, false,
 null, 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.', 'graas_account_update', 'UTILITY', '{name,topic}', 51),

-- News ------------------------------------------------------------------------------------------------------------
('broadcast', 'email', 'member', 'News and updates', 'Updates you send from Admin > Messages > Send an update. Members can switch these off.', true, false,
 '{{subject}}',
 $t${{body}}$t$, null, null, '{}', 60),

('broadcast', 'whatsapp', 'member', 'News and updates', 'Promotional. Costs about Rs 0.86 a message. Off by default.', false, false,
 null, 'Hi {{1}}, there is a new update from GRAAS: {{2}}. Read it at graas.org.in/updates', 'graas_news', 'MARKETING', '{name,subject}', 60),

-- Staff alerts ----------------------------------------------------------------------------------------------------
('staff_new_application', 'email', 'staff', 'New application', 'Tells the team about every new membership application.', true, false,
 'New membership application: {{applicant}}',
 $t${{applicant}} ({{applicant_email}}, {{applicant_phone}}) applied for {{plan}}. {{next_step}}

[Open Admin]({{site}}/admin)$t$, null, null, '{}', 70),

('staff_payment_received', 'email', 'staff', 'Payment received', 'Tells the team about every successful payment.', true, false,
 'Payment received: {{amount}} from {{applicant}}',
 $t${{applicant}} ({{applicant_email}}) paid {{amount}} for {{plan}} ({{kind}}). Receipt {{receipt_no}}.

[Open payments]({{site}}/admin)$t$, null, null, '{}', 71),

('staff_payment_review', 'email', 'staff', 'Payment needs checking', 'Sent when a payment arrives that the membership was not waiting for.', true, false,
 'A payment needs checking: {{receipt_no}}',
 $t${{amount}} from {{applicant}} needs checking.

{{note}}

[Open payments]({{site}}/admin)$t$, null, null, '{}', 72),

('staff_refund_request', 'email', 'staff', 'Refund requested', 'Sent when someone asks for a refund in Admin.', true, false,
 'Refund requested: {{amount}} on {{receipt_no}}',
 $t${{requested_by}} asked to refund {{amount}} to {{applicant}} on receipt {{receipt_no}}.

Reason: {{reason}}

If it is still waiting, a second finance person or a super admin must approve it in Admin, under Payments.

[Open payments]({{site}}/admin)$t$, null, null, '{}', 73),

('staff_new_ticket', 'email', 'staff', 'New help request', 'Sent when a member writes from their account.', true, false,
 'New help request: {{ticket_subject}}',
 $t${{applicant}} ({{applicant_email}}, {{applicant_phone}}) wrote:

**{{ticket_subject}}**

{{message}}

[Reply in Admin]({{site}}/admin)$t$, null, null, '{}', 74),

('staff_new_lead', 'email', 'staff', 'New enquiry', 'Sent when someone fills in the contact form on the website.', true, false,
 'New enquiry from {{lead_name}}',
 $t${{lead_name}} sent an enquiry.

**Phone:** {{lead_phone}}
**Email:** {{lead_email}}
**Interested as:** {{lead_kind}}
**City:** {{lead_city}}

{{message}}

[Open enquiries]({{site}}/admin)$t$, null, null, '{}', 75),

-- Test ------------------------------------------------------------------------------------------------------------
('test', 'email', 'staff', 'Test message', 'Used by the Send a test button.', true, true,
 'Test email from GRAAS',
 $t$Hi {{name}},

This is a test from the GRAAS website, sent on {{when}}. If you can read this, email sending works.$t$, null, null, '{}', 99)

on conflict (event, channel) do nothing;

-- Applied separately as `messaging_channels`: which ways of sending codes work, for the forgot-password page.
create or replace function public.messaging_channels() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'email', private.email_on(),
    'whatsapp', private.wa_codes_on()
      and exists (select 1 from public.message_templates where event = 'code_reset_password' and channel = 'whatsapp' and wa_status = 'APPROVED'))
$$;
revoke execute on function public.messaging_channels() from public;
grant execute on function public.messaging_channels() to anon, authenticated;
