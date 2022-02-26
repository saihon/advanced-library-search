import "../css/style.css";

import {Bookmark} from "./search/bookmark";
import {History} from "./search/history";
import {View} from "./search/view";

const form  = (document.forms as any)['search'] as HTMLFormElement;
const input = form['search-input'] as HTMLInputElement;
const view  = new View({
    result : document.getElementById('result-box') as HTMLElement,
    help : document.getElementById('help') as HTMLElement,
    error : document.getElementById('error') as HTMLElement,
});

const onSubmit = (e: Event): any => {
    e.preventDefault();
    const a = input.value.trim().split(': ');

    try {
        view.invisible();
        switch (a[0]) {
        case 'b':
        case 'bookmark':
            Bookmark.search(a[1], view);
            break;
        case 'h':
        case 'history':
            History.search(a[1], view);
            break;
        default:
            throw new Error('Invalid prefix (should start with b: or h:)');
        }
    } catch (error) {
        if (error instanceof Error) view.error(error.message);
    }
};
form.addEventListener('submit', onSubmit);

const onLoaded = (e: Event): any => {
    input.value = 'b: ';
    const n     = input.value.length;
    input.focus();
    input.setSelectionRange(n, n);
};
addEventListener('DOMContentLoaded', onLoaded);