import { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { StatusCode } from "@std/http/status";
import { render as render_view } from "@/lib/views.ts";
// @deno-types="@types/nodemailer"
import nodemailer from "nodemailer";

const details = {
    UNPROCESSABLE_CONTENT: {
        en: "The form data is either missing or the server is unable to parse it.",
        is: "Annað hvort vantar gögnin úr forminu eða þjónninn getur ekki skilið þau.",
    },
    VALIDATION_ERRORS: {
        en: "The following fields are missing or contain validation errors:",
        is: "Eftirfarandi reiti vantar eða eru ógildir:",
    },
    CF_TURNSTILE_TOKEN_MISSING: {
        en: "The 'I am not a robot' challange has not been completed.",
        is: "'Ég er ekki vélmenni' prófið hefur ekki verið klárað.",
    },
    CF_TURNSTILE_VALIDATION_ERRORED: {
        en: "The 'I am not a robot' challange could not be verified. Please try again.",
        is: "Ekki náðist að sannprófa 'Ég er ekki vélmenni' prófið. Vinsamlegast reyndu aftur.",
    },
    CF_TURNSTILE_RESPONSE_INVALID: {
        en: "You failed the 'I am not a robot' challange. Please try again.",
        is: "Þú stóðst ekki 'Ég er ekki vélmenni' prófið. Vinsamlegast reyndu aftur.",
    },
};

const is_email_valid = (email: string) => {
    if (!email || typeof email !== "string") {
        return false;
    }

    const [user, domain] = email.split("@");
    if (!user || user.trim() === "" || !domain || domain.trim() === "") {
        return false;
    }

    const [sld, tld] = domain.split(".");
    if (!sld || sld.trim() === "" || !tld || tld.trim() === "") {
        return false;
    }

    return true;
};

const AWS_SES_USER = Deno.env.get("AWS_SES_USER");
const AWS_SES_PASS = Deno.env.get("AWS_SES_PASS");
if (!AWS_SES_USER || !AWS_SES_PASS) {
    throw new Error(
        "Missing required environment variables `AWS_SES_USER` and `AWS_SES_PASS`.",
    );
}

const smtp = nodemailer.createTransport({
    port: 587,
    host: "email-smtp.eu-north-1.amazonaws.com",
    auth: {
        user: AWS_SES_USER,
        pass: AWS_SES_PASS,
    },
});

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    const lang = req.query.get("lang");

    const render = (template: string, data?: Record<string, unknown>) => {
        return render_view(template, {
            ...data,
            language: lang,
            pathname: req.pathname,
        });
    };

    const respond = (
        { status, headers, body }: {
            status: StatusCode;
            headers?: Record<string, string>;
            body?: object;
        },
    ) => {
        return req.respond({
            status,
            headers: { ...headers, content_type: "application/json" },
            body: JSON.stringify(body),
        });
    };

    const SEND_HTML = req.headers.accept.toLowerCase() === "text/html";
    const CAN_SEND_HTML = SEND_HTML && lang && (lang === "is" || lang === "en");

    const TURNSTILE_SK = Deno.env.get("TURNSTILE_SK");
    if (!TURNSTILE_SK) {
        return respond({
            status: 500,
            body: {
                error: "INTERNAL_SERVER_ERROR",
                detail: "An unexpected server error has ocurred.",
            },
        });
    }

    if (req.method !== "POST") {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 405,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: "405 Method Not Allowed",
                }),
            });
        }

        return respond({
            status: 405,
            body: {
                error: "METHOD_NOT_ALLOWED",
                detail: "You must POST to this endpoint.",
            },
        });
    }

    if (!req.body?.parsed) {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 422,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: details.UNPROCESSABLE_CONTENT[lang],
                }),
            });
        }

        return respond({
            status: 422,
            body: {
                error: "UNPROCESSABLE_CONTENT",
                detail:
                    "The request body is either missing or the server is unable to parse it.",
            },
        });
    }

    const missing: string[] = [];
    const invalid: string[] = [];
    const name = req.body.parsed.name;
    if (!name || name.trim() === "") {
        missing.push("name");
    }

    const email = req.body.parsed.email;
    if (!email || email.trim() === "") {
        missing.push("email");
    }

    if (!is_email_valid(email)) {
        invalid.push("email");
    }

    const subject = req.body.parsed.subject;
    if (!subject || subject.trim() === "") {
        missing.push("subject");
    }

    const message = req.body.parsed.message;
    if (!message || message.trim() === "") {
        missing.push("message");
    }

    const cf_turnstile_response = req.body.parsed["cf-turnstile-response"];
    if (!cf_turnstile_response || cf_turnstile_response.trim() === "") {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 422,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: details.VALIDATION_ERRORS[lang],
                    name_value: name,
                    email_value: email,
                    subject_value: subject,
                    message_value: message,
                }),
            });
        }

        return respond({
            status: 422,
            body: {
                error: "CF_TURNSTILE_TOKEN_MISSING",
                detail:
                    `The 'I am not a robot' challange has not been completed.`,
            },
        });
    }

    if (missing.length > 0 || invalid.length > 0) {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 422,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: `${details.VALIDATION_ERRORS[lang]} ${
                        missing.join(", ")
                    }${invalid.join(", ")}`,
                    name_value: name,
                    email_value: email,
                    subject_value: subject,
                    message_value: message,
                }),
            });
        }

        return respond({
            status: 422,
            body: {
                error: "VALIDATION_ERRORS",
                detail:
                    `The following fields in the request are missing or empty: ${
                        missing.join(", ")
                    }. The following fields in the request contain validation errors: ${
                        invalid.join(", ")
                    }`,
            },
        });
    }

    const cft_form_data = new FormData();
    cft_form_data.append("secret", TURNSTILE_SK);
    cft_form_data.append("response", cf_turnstile_response);
    const cft_res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            body: cft_form_data,
        },
    );

    if (!cft_res || !cft_res.ok) {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 500,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: details.CF_TURNSTILE_VALIDATION_ERRORED[lang],
                    name_value: name,
                    email_value: email,
                    subject_value: subject,
                    message_value: message,
                }),
            });
        }

        return respond({
            status: 500,
            body: {
                error: "CF_TURNSTILE_VALIDATION_ERRORED",
                detail:
                    "Cloudflare turnstile validation resulted in a non-OK response code from Cloudflare.",
            },
        });
    }

    const cft_result = await cft_res.json();
    if (!cft_result?.success) {
        if (CAN_SEND_HTML) {
            return req.respond({
                status: 500,
                headers: { content_type: "text/html" },
                body: await render("partials/contact-form.vto", {
                    error: details.CF_TURNSTILE_RESPONSE_INVALID[lang],
                    name_value: name,
                    email_value: email,
                    subject_value: subject,
                    message_value: message,
                }),
            });
        }

        return respond({
            status: 500,
            body: {
                error: "CF_TURNSTILE_RESPONSE_INVALID",
                detail:
                    "Cloudflare turnstile validation returned unsuccessful result.",
            },
        });
    }

    await smtp.sendMail({
        from: "webmaster@kjartann.is",
        to: "kjartan@kjartann.is",
        replyTo: `${email}`,
        subject: `${subject}`,
        text: `${message}\n\nSent by ${name} (${email}) to server at ${
            new Date().toISOString()
        }`,
    });

    smtp.close();

    return req.respond({
        status: 200,
        headers: { content_type: "text/html" },
        body: await render("partials/contact-form.vto", { success: true }),
    });
}
