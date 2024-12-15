// deno-lint-ignore-file

window._namespace_kjartann_se = {
    ajax: () => {
        // deno-fmt-ignore-line
        const site_base_url = `${window.location.protocol}//${window.location.host}`

        const parse_html = (html) => {
            let state = "STATE_HEAD";
            let title_offset = 0;
            let title_content = "";
            let body_offset = 0;
            let body_content = "";
            for (let i = 0; i < html.length; i++) {
                const char = html[i];

                switch (state) {
                    case "STATE_HEAD": {
                        if (
                            char === "<" && html[i + 1] === "b" &&
                            html[i + 2] === "o" && html[i + 3] === "d" &&
                            html[i + 4] === "y" && html[i + 5] === ">"
                        ) {
                            body_offset = i + 5;
                            state = "STATE_BODY";
                        }

                        if (
                            char === "<" && html[i + 1] === "t" &&
                            html[i + 2] === "i" && html[i + 3] === "t" &&
                            html[i + 4] === "l" && html[i + 5] === "e" &&
                            html[i + 6] === ">"
                        ) {
                            title_offset = i + 6;
                            state = "STATE_TITLE";
                        }

                        continue;
                    }

                    case "STATE_TITLE": {
                        if (
                            char === "<" && html[i + 1] === "/" &&
                            html[i + 2] === "t" &&
                            html[i + 3] === "i" && html[i + 4] === "t" &&
                            html[i + 5] === "l" && html[i + 6] === "e" &&
                            html[i + 7] === ">"
                        ) {
                            state = "STATE_HEAD";

                            continue;
                        }

                        if (i > title_offset) {
                            title_content += char;
                        }

                        continue;
                    }

                    case "STATE_BODY": {
                        if (
                            html[i + 1] === "<" && html[i + 2] === "/" &&
                            html[i + 3] === "b" && html[i + 4] === "o" &&
                            html[i + 5] === "d" && html[i + 6] === "y" &&
                            html[i + 7] === ">"
                        ) {
                            state = "STATE_END";
                        }

                        if (i > body_offset) {
                            body_content += char;
                        }
                    }
                }
            }

            return { title: title_content, body: body_content };
        };

        const fetch_page = async (url) => {
            let res;
            try {
                res = await fetch(url, {
                    signal: AbortSignal.timeout(5_000),
                });
            } catch {
                return null;
            }

            if (!res) {
                return null;
            }

            if (res.status !== 404 && !res.ok) {
                return null;
            }

            const content_type = res.headers.get("content-type");
            if (!content_type || content_type.trim() !== "text/html") {
                return null;
            }

            let html;
            try {
                html = await res.text();
            } catch {
                return null;
            }

            if (!html) {
                return null;
            }

            return {
                ...parse_html(html),
                location: res.url,
            };
        };

        const handle_local_anchor_click = async (event) => {
            const MIDDLE_MOUSE_BUTTON = 1;
            if (event.button === MIDDLE_MOUSE_BUTTON) {
                return;
            }

            event.preventDefault();

            if (event.currentTarget) {
                const href = event.currentTarget.href;

                NProgress.start();

                const data = await fetch_page(href);

                if (data) {
                    document.body.innerHTML = data.body;
                    document.title = data.title;
                    history.pushState({}, "", data.location);
                    hook_anchors();
                }

                NProgress.done();

                if (window.onload_turnstile_callback) {
                    window.onload_turnstile_callback();
                }
            }
        };

        const handle_history_navigation = async () => {
            const href = document.location;

            NProgress.start();

            const data = await fetch_page(href);
            if (data) {
                document.body.innerHTML = data.body;
                document.title = data.title;
                hook_anchors();
            }

            NProgress.done();

            if (window.onload_turnstile_callback) {
                window.onload_turnstile_callback();
            }
        };

        window.addEventListener("popstate", handle_history_navigation);

        const hook_anchors = () => {
            const anchors = document.querySelectorAll("a");
            for (let i = 0; i < anchors.length; i++) {
                const a = anchors[i];

                if (
                    !a.href || !a.href.startsWith(site_base_url) ||
                    a.href.split(".")[1]
                ) {
                    continue;
                }

                a.addEventListener("click", handle_local_anchor_click);
            }
        };

        hook_anchors();

        const handle_form_submission = async (event, form_element) => {
            event.preventDefault();

            form_element.dataset.loading = "true";

            const form_data = {};

            const inputs = event.currentTarget.querySelectorAll(
                "input, textarea",
            );
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];

                if (input.name && input.value) {
                    form_data[input.name] = input.value;
                }
            }

            let res;
            try {
                res = await fetch(event.currentTarget.action, {
                    method: event.currentTarget.method,
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "text/html",
                    },
                    body: JSON.stringify(form_data),
                });
            } catch {
                res = undefined;
            }

            if (!res) {
                return;
            }

            let data;
            try {
                data = await res.text();
            } catch {
                data = undefined;
            }

            if (!data) {
                return;
            }

            switch (form_element.dataset.replace) {
                case "innerHTML": {
                    form_element.innerHTML = data;
                    break;
                }

                case "outerHTML": {
                    form_element.outerHTML = data;
                    break;
                }
            }

            form_element.dataset.loading = "false";

            hook_forms();

            if (window.onload_turnstile_callback) {
                window.onload_turnstile_callback();
            }
        };

        const hook_forms = () => {
            const forms = document.querySelectorAll(
                `form[data-replace]`,
            );
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];

                if (
                    !form.dataset.replace ||
                    (form.dataset.replace !== "outerHTML" &&
                        form.dataset.replace !== "innerHTML")
                ) {
                    continue;
                }

                form.addEventListener(
                    "submit",
                    (event) => handle_form_submission(event, form),
                );
            }
        };

        hook_forms();
    },
};

window._namespace_kjartann_se.ajax();
