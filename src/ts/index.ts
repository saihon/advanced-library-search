import "../css/style.css";

import { Bookmark } from "./search/bookmark";
import { History } from "./search/history";
import { View } from "./search/view";

const form = (document.forms as any)['search'] as HTMLFormElement;
const input = form['search-input'] as HTMLInputElement;
const view = new View({
    result: document.getElementById('result-box') as HTMLElement,
    help: document.getElementById('help') as HTMLElement,
    error: document.getElementById('error') as HTMLElement,
});

const search = (type: string, query: string) => {
    try {
        view.invisible();
        switch (type) {
            case 'b':
            case 'bookmark':
                Bookmark.search(query, view);
                break;
            case 'h':
            case 'history':
                History.search(query, view);
                break;
            default:
                throw new Error('Invalid prefix (should start with b: or h:)');
        }
    } catch (error) {
        if (error instanceof Error) view.error(error.message);
        return;
    }

    history.pushState('', '');
}

const onSubmit = (e: Event): any => {
    e.preventDefault();
    const a = input.value.trim().split(/:\s*/);
    search(a[0], a[1]);
};
form.addEventListener('submit', onSubmit);

const onKeyup = () => {
    const v = input.value;
    const a = v.split(/:\s*/);
    const p: Params = { type: a[0], query: a[1] || '' };
    history.replaceState('', '', `/index.html?t=${p.type}&q=${p.query}`);
};
form.addEventListener('keyup', onKeyup);

type Params = {
    type: string
    query: string
}

const getParams = (): Params => {
    const p: Params = { type: 'b', query: '' };
    const u = new URL(location.href);

    if (u.searchParams.has('t')) {
        const t = u.searchParams.get('t');
        if (t) p.type = t;
    }
    if (u.searchParams.has('q')) {
        const q = u.searchParams.get('q');
        if (q) p.query = q;
    }
    return p;
}

const onLoaded = (e: Event): any => {
    const p = getParams();
    input.value = `${p.type}: ${p.query}`;
    const n = input.value.length;
    input.focus();
    input.setSelectionRange(n, n);

    if (e.type == 'DOMContentLoaded') {
        if (p.query != '') search(p.type, p.query);
    }
};
window.addEventListener('DOMContentLoaded', onLoaded);
window.addEventListener('popstate', onLoaded)
