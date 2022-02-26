# advanced-library-search

Provides an advanced search for browser bookmarks and histories.   

<br/>
<br/>

# Usage

If you want to search for bookmarks, start with `b:` or `bookmark:` and you want to search for history, start with `h:` or `history:`. Also, can be show each search options by appending `-h` after these prefixes.

<br/>

### Bookmark

<br/>

#### Help
```
b: -h
```

<br/>

#### Default Search
Attempts match to the Title and URL.
```
b: something
```

<br/>

#### Apostrophes
Words containing apostrophes must be enclosed in double quotes.
```
b: "It's show time!"
```

<br/>

#### Wildcard
When don't use the regular expression, can use an asterisk as a wildcard. Will probably match to `www.example.com` and `blog.example.com`
```
b: *.example.com
```

<br/>

#### Fuzzy-search
If the words are separated by a space, fuzzy search.
```
b: hello world
b: 'hello world'
```

AND-Search. Use an asterisk or regular expression instead of a space.
```
b: hello*world
b: hello\sworld -r
```

<br/>

#### Title
```
b: -t 'hello world'
```

<br/>

#### URL
```
b: -u example.com
```

<br/>

#### Use different search terms for title and URL
```
b: -t hello -u example.com
```

<br/>

#### Regular expression
```
b: -r ^hello-[0-9]
b: -r -t ^hello-[0-9]
b: -r -t ^hello-[0-9] -u [^.]+\.example\.com
```

<br/>

#### Date added
```
Before
b: -d -2021

After
b: -d 2021/10/1

Between
b: -d 2021/12/1-2022/1/1
```

<br/>

#### Folder path
Can use like a 'glob' pattern. `**`, `*`, `?`, `[]`
```
b: -f /foo/*/baz/**
```

<br/>
<br/>

### History

<br/>

Almost the same as the example of bookmark. so, the differences are indicate.

<br/>

#### Help
```
h: -h
```

<br/>

#### Visit count
```
Visited more than 5 times.
h: -c 5

Visited less than 5 times.
h: -c -5
```

<br/>

#### Max results
The maximum number of results to retrieve. The default is set to 500.
```
h: -m 1000
```
