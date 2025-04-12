import { STATUS_TEXT, StatusCode } from "@std/http/status";

/**
 * Generate minimal HTML to be sent with a status code such as 405 Method Not Allowed.
 *
 * @param status - the status code being returned.
 * @returns markup with the status text in the document title and body.
 */
export function min_status_response(status: StatusCode) {
    const status_text = STATUS_TEXT[status];

    return `<!DOCTYPE html><html><head><title>${status_text}</title></head><body><h1>${status_text}</h1><hr /><p>catboy-maid</p></body></html>`;
}
