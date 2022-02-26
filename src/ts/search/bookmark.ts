
import {creator} from "./creator";
import {matcher} from "./matcher";
import * as option from "./option";

// option name
const ON_TITLE  = 't';
const ON_URL    = 'u';
const ON_PATH   = 'f';
const ON_DATE   = 'd';
const ON_REGEXP = 'r';
const ON_HELP   = 'h';

export class Bookmark {
    private options: option.Option[] = [
        new option.Option(
            ON_TITLE,
            option.Type.RequiredArgument,
            'Specifies a string that matches the title of the bookmark.',
            ),
        new option.Option(
            ON_URL,
            option.Type.RequiredArgument,
            'Specifies a string that matches the URL of the bookmark.',
            ),
        new option.Option(
            ON_REGEXP,
            option.Type.NoArgument,
            'Using the regular expressions with ignore-case.',
            ),
        new option.Option(
            ON_PATH,
            option.Type.RequiredArgument,
            'Specifies the path that matches to the path of the bookmark folder.',
            'Can be use "**", "*", "?", and "[]" patterns, like a "glob".',
            ),
        new option.Option(
            ON_DATE,
            option.Type.RequiredArgument,
            'Specifies the date that matches the date on which the bookmark was added.',
            '"-2022/1/1" Search the bookmarks added before that day.',
            '"2022/1/1" or "2022/1/1-" Search the bookmarks added after that day.',
            '"2022/1/1-2023/1/1" Search the bookmarks added within that period.',
            'About the date format, see IETF-Compliant RFC 2822 Timestamp',
            'https://datatracker.ietf.org/doc/html/rfc2822#page-14',
            ),
        new option.Option(
            ON_HELP,
            option.Type.NoArgument,
            'Show this help',
            ),
    ];

    private matchers: matcher.Matcher[] = [];

    private constructor(text: string, private creator: creator.Creator) {
        const [options, remain] =
            new option.Parser(...this.options).parse(text);

        if (options[ON_HELP].hasSpecified()) {
            this.creator.help(options);
            return;
        }

        const r = {enabled : false, flags : ''};
        if (options[ON_REGEXP].hasSpecified()) {
            r.enabled = true;
            r.flags   = 'i';
        }

        if (options[ON_TITLE].hasSpecified()) {
            this.matchers.push((new matcher.Title).init({
                text : options[ON_TITLE].value as string,
                regexp : r
            }));
        }

        if (options[ON_URL].hasSpecified()) {
            this.matchers.push((new matcher.Url).init({
                text : options[ON_URL].value as string,
                regexp : r
            }));
        }

        if (options[ON_PATH].hasSpecified()) {
            this.matchers.push((new matcher.Path).init({
                text : options[ON_PATH].value as string,
            }));
        }

        if (options[ON_DATE].hasSpecified()) {
            this.matchers.push((new matcher.Date).init({
                text : options[ON_DATE].value as string,
            }));
        }

        if (remain.length > 0) {
            this.matchers.push((new matcher.Query).init({
                text : remain.join(' '),
                regexp : r
            }));
        }

        this.walk();
    }

    public static search(text: string, creator: creator.Creator) {
        if (text.trim() == '') return;
        new Bookmark(text, creator);
    }

    private match(object: matcher.Object): boolean {
        if (this.matchers.length == 0) return false;
        for (const m of this.matchers) {
            if (!m.match(object)) return false;
        }
        return true;
    }

    private async walk(path: string = '', folderId: string = '') {
        // https://developer.chrome.com/docs/extensions/reference/bookmarks/#type-BookmarkTreeNode
        chrome.bookmarks.getChildren(folderId, children => {
            if (chrome.runtime.lastError) {
                return;
            }

            for (let c of children) {
                // if node have not URL property it is a folder.
                if (typeof c['url'] == 'undefined') {
                    this.walk(path + '/' + c.title, c.id);
                    continue;
                }

                this.walkFunc(path, c);
            }
        });
    }

    private async walkFunc(path: string,
                           node: chrome.bookmarks.BookmarkTreeNode) {
        const object: matcher.Object = {
            path : path,
            title : node.title,
            rawurl : node.url,
            dateTime : node.dateAdded,
        };

        if (this.match(object)) {
            this.creator.create(object);
        }
    };
}