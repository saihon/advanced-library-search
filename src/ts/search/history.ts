/*
 * https://developer.chrome.com/docs/extensions/reference/history/
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history
 *
 */

import {creator} from "./creator";
import {epochTime, matcher} from "./matcher";
import * as option from "./option";

// option name
const ON_TITLE      = 't';
const ON_URL        = 'u';
const ON_DATE       = 'd';
const ON_VISITS     = 'c';
const ON_REGEXP     = 'r';
const ON_MAXRESULTS = 'm';
const ON_HELP       = 'h';

export class History {
    private options: option.Option[] = [
        new option.Option(
            ON_TITLE,
            option.Type.RequiredArgument,
            'Specifies a string that matches the title of the history item.',
            ),
        new option.Option(
            ON_URL,
            option.Type.RequiredArgument,
            'Specifies a string that matches the URL of the history item.',
            ),
        new option.Option(
            ON_REGEXP,
            option.Type.NoArgument,
            'Using the regular expressions with ignore-case.',
            ),
        new option.Option(
            ON_VISITS,
            option.Type.RequiredArgument,
            'Search for history of visits higher than specified.',
            'If specify a negative number(that is the absolute value),',
            'search the history of visits count is less than or equal to that number.',
            ),
        new option.Option(
            ON_DATE,
            option.Type.RequiredArgument,
            'Specifies the date that matches for the date the historical item was visited.',
            '"-2022/1/1" Search the history visited before that day.',
            '"2022/1/1" or "2022/1/1-" Search the history visited after that day.',
            '"2022/1/1-2023/1/1" Search the history visited within that period.',
            'About the date format, see IETF-Compliant RFC 2822 Timestamp',
            'https://datatracker.ietf.org/doc/html/rfc2822#page-14',
            ),
        new option.Option(
            ON_MAXRESULTS,
            option.Type.RequiredArgument,
            'Specifies the maximum number of results to retrieve. Defaults to 500.',
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

        const query: chrome.history.HistoryQuery = {
            text : remain.join(' '), // Leave empty to retrieve all pages.
            maxResults : 500,        // Default 100.
        };

        const r = {enabled : false, flags : ''};
        if (options[ON_REGEXP].hasSpecified()) {
            r.enabled = true;
            r.flags   = 'i';
        }

        if (options[ON_MAXRESULTS].hasSpecified()) {
            query.maxResults = parseInt(options[ON_MAXRESULTS].value as string);
        }

        if (options[ON_DATE].hasSpecified()) {
            const o = epochTime.parse(options[ON_DATE].value as string);
            switch (o.type) {
            case epochTime.Type.BEFORE:
                query.endTime = o.end;
                break;
            case epochTime.Type.AFTER:
                query.startTime = o.start;
                break;
            case epochTime.Type.BETWEEN:
                query.startTime = o.start;
                query.endTime   = o.end;
                break;
            }
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

        if (options[ON_VISITS].hasSpecified()) {
            this.matchers.push((new matcher.Visits).init({
                text : options[ON_VISITS].value as string,
            }));
        }

        chrome.history.search(query, this.callback.bind(this));
    }

    public static search(text: string, creator: creator.Creator) {
        new History(text, creator);
    }

    private async matching(historyItem: chrome.history.HistoryItem) {
        const object: matcher.Object = {
            title : historyItem.title,
            rawurl : historyItem.url,
            dateTime : historyItem.lastVisitTime,
            visitCount : historyItem.visitCount,
        }

        for (const m of this.matchers) {
            if (!m.match(object)) return;
        }

        this.creator.create(object);

        // Transition types
        // https://developer.chrome.com/docs/extensions/reference/history/#method-getVisits
    }

    private callback(historyItems: chrome.history.HistoryItem[]) {
        for (const v of historyItems) {
            this.matching.bind(this)(v);
        }
    }
}
