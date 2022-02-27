# advanced-library-search

Provides an advanced search for browser bookmarks and histories.   

<br/>

# Install

Installation via Mozilla ADD-ONS  
https://addons.mozilla.org/en-US/firefox/addon/advanced-library-search/

<br/>

# Usage

If you want to search for bookmarks, start with `b:` or `bookmark:` and you want to search for history, start with `h:` or `history:`. Also, can be show each search options by appending `-h` after these prefixes.

<br/>

### Bookmark

* Help
    ```
    b: -h
    ```

* Default search. Attempts match to the Title and URL.
    ```
    b: something
    ```

* Words containing apostrophes must be enclosed in double quotes.
    ```
    b: "It's show time!"
    ```

* When don't use the regular expression, can use an asterisk as a wildcard. Will probably match to `www.example.com` and `blog.example.com`
    ```
    b: *.example.com
    ```

* Fuzzy-search. If the words are separated by a space, fuzzy search.
    ```
    b: hello world
    b: 'hello world'
    ```

* AND-Search. Use an asterisk or regular expression instead of a space.
    ```
    b: hello*world
    b: hello\sworld -r
    ```

* Search by Title
    ```
    b: -t 'hello world'
    ```

* Search by URL
    ```
    b: -u example.com
    ```

* Use different search terms for title and URL
    ```
    b: -t hello -u example.com
    ```

* Regular expression
    ```
    b: -r ^hello-[0-9]
    b: -r -t ^hello-[0-9]
    b: -r -t ^hello-[0-9] -u [^.]+\.example\.com
    ```

* Date added
    ```
    Before
    b: -d -2021

    After
    b: -d 2021/10/1

    Between
    b: -d 2021/12/1-2022/1/1
    ```

* Folder path. Can use like a 'glob' pattern. `**`, `*`, `?`, `[]`
    ```
    b: -f /foo/*/baz/**
    ```

<br/>

### History

Almost the same as the example of bookmark. so, the differences are indicate.

* Help
    ```
    h: -h
    ```

* Visit count
    ```
    Visited more than 5 times.
    h: -c 5

    Visited less than 5 times.
    h: -c -5
    ```

* The maximum number of results to retrieve. The default is set to 500.
    ```
    h: -m 1000
    ```

<br/>

# Development

<br/>

### Build procedure

1. Download dependencies
    ```
    npm i
    ```

3. Run webpack
    ```
    npm run webpack
    ```

2. Build addons/extensions
    ```
    npm run build-all
    ```

<br/>

### Debug procedure

1. Download dependencies
    ```
    npm i
    ```

2. Run webpack(watch)
    ```
    npm run webpack-watch
    ```

3. Debugging
    ```
    npm run debug
    ```

4. Test
    ```
    npm test
    ```
