// src/email/email.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { htmlToText } from 'html-to-text';
import SMTPTransport from 'nodemailer/lib/smtp-transport';


type MailPayload = {
    to: string;
    subject: string;
    template?: string; // template file name (without path)
    context?: Record<string, any>;
    html?: string;
    text?: string;
    from?: string;
};

Handlebars.registerHelper('year', () => new Date().getFullYear());
Handlebars.registerHelper('companyName', () => process.env.APP_NAME ?? 'Fugu-Smock');

@Injectable()
export class EmailService {
    private logger = new Logger('EmailService');
    private transporter: nodemailer.Transporter;
    private templateCache = new Map<string, Handlebars.TemplateDelegate>();
    private templatesDir = path.join(process.cwd(), 'src', 'email', 'templates');
    private fromAddress = process.env.FROM_EMAIL ?? `no-reply@${process.env.APP_DOMAIN ?? 'localhost'}`;

    constructor() {
        // Build transporter (deferred to onModuleInit to allow env to be set)
        // but create a safe default here
        this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }

    async onModuleInit() {
        const host = process.env.SMTP_HOST;
        if (host) {
            const port = Number(process.env.SMTP_PORT ?? 587);
            const secure = (process.env.SMTP_SECURE ?? 'false') === 'true';
            const authUser = process.env.SMTP_USER;
            const authPass = process.env.SMTP_PASS;

            const config: SMTPTransport.Options = { host, port, secure };
            if (authUser && authPass) {
                (config as any).auth = { user: authUser, pass: authPass };
            }

            this.transporter = nodemailer.createTransport(config);

            try {
                await this.transporter.verify();
                this.logger.log(`SMTP transporter ready (${host}:${port})`);
            } catch (err) {
                // SendGrid verify can fail even when credentials are correct —
                // log the warning but keep the transporter rather than falling back
                this.logger.warn(
                    `SMTP verify returned an error — transporter kept anyway. ` +
                    `If emails fail, check SMTP_USER/SMTP_PASS. Error: ${(err as Error).message}`,
                );
            }
        } else {
            this.logger.warn(
                'SMTP not configured — using JSON transport (emails will not be delivered). ' +
                'Set SMTP_HOST/SMTP_USER/SMTP_PASS to enable real emails.',
            );
            this.transporter = nodemailer.createTransport({ jsonTransport: true });
        }
    }

    async sendMail(payload: MailPayload) {
        const from = payload.from ?? this.fromAddress;
        let html = payload.html;
        let text = payload.text;

        if (payload.template) {
            html = await this.renderTemplate(payload.template, payload.context ?? {});
            text = htmlToText(html, { wordwrap: 130 });
        } else {
            if (html && !text) text = htmlToText(html, { wordwrap: 130 });
        }

        const msg: nodemailer.SendMailOptions = {
            from,
            to: payload.to,
            subject: payload.subject,
            html,
            text,
        };

        // If using JSON transport, also log a short preview
        if ((this.transporter as any).transporter && (this.transporter as any).transporter.name === 'JSON') {
            this.logger.debug(`(email json) to=${payload.to} subject=${payload.subject}`);
        }

        const res = await this.transporter.sendMail(msg);
        this.logger.log(`Email sent to ${payload.to} (subject="${payload.subject}")`);
        return res;
    }

    // Render MJML template with Handlebars
    private async renderTemplate(templateName: string, context: Record<string, any>) {
        const tpl = await this.loadTemplate(templateName);
        const mjmlString = tpl(context); // Handlebars -> MJML string
        const rendered = mjml2html(mjmlString, { validationLevel: 'strict' });

        if (rendered.errors && rendered.errors.length) {
            // log mjml errors but still return html
            this.logger.warn(`MJML compilation warnings: ${JSON.stringify(rendered.errors)}`);
        }

        return rendered.html;
    }

    // Load and compile template (caches compiled Handlebars function)
    private async loadTemplate(name: string) {
        const key = name;
        if (this.templateCache.has(key)) return this.templateCache.get(key)!;

        const filePath = path.join(this.templatesDir, `${name}.mjml`);
        const raw = await fs.readFile(filePath, 'utf-8');
        const compiled = Handlebars.compile(raw);
        this.templateCache.set(key, compiled);
        return compiled;
    }

    // Convenience / domain-specific methods
    async sendSignupEmail(to: string, data: { name?: string; verifyLink: string }) {
        return this.sendMail({
            to,
            subject: 'Welcome — Verify your email',
            template: 'signup',
            context: data,
        });
    }

    async sendResetPasswordEmail(to: string, data: { name?: string; resetLink: string }) {
        return this.sendMail({
            to,
            subject: 'Reset your password',
            template: 'reset-password',
            context: data,
        });
    }

    async sendOrderConfirmation(to: string, data: { name?: string; orderId: string; orderTotal: string; items: Array<{ title: string, qty: number, price: number }>; orderLink?: string }) {
        return this.sendMail({
            to,
            subject: `Order received — ${data.orderId}`,
            template: 'order-confirmation',
            context: data,
        });
    }

    async sendPaymentSuccess(to: string, data: { name?: string; orderId: string; amount: string; receiptLink?: string }) {
        return this.sendMail({
            to,
            subject: `Payment confirmed — ${data.orderId}`,
            template: 'payment-success',
            context: data,
        });
    }

    async sendFulfillmentUpdate(
        to: string,
        data: {
            name?: string;
            orderId: string;
            orderTotal: string;
            statusLabel: string;
            statusMessage: string;
            statusColor: string;
            orderLink?: string;
        },
    ) {
        return this.sendMail({
            to,
            subject: `Order update — ${data.statusLabel} (#${data.orderId.slice(0, 8).toUpperCase()})`,
            template: 'fulfillment-update',
            context: data,
        });
    }
}
