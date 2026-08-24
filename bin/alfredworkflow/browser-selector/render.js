ObjC.import("Foundation");

const builtIns = [
  ["google", "google", "Google", "https://www.google.com/search?q={query}"],
  ["lucky", "lucky", "Google I'm Feeling Lucky", "https://www.google.com/search?btnI=I%27m+Feeling+Lucky&q={query}"],
  ["images", "images", "Google Images", "https://www.google.com/search?q={query}&tbm=isch"],
  ["maps", "maps", "Google Maps", "https://www.google.com/maps?q={query}"],
  ["applemaps", "maps", "Apple Maps", "https://maps.apple.com/?q={query}"],
  ["gtranslate", "translate", "Google Translate", "https://translate.google.com/?text={query}"],
  ["gmailsearch", "gmail", "Gmail", "https://mail.google.com/mail/u/0/#search/{query}"],
  ["drivesearch", "drive", "Google Drive", "https://drive.google.com/drive/u/0/search?q={query}"],
  ["twittersearch", "x||twitter", "X", "https://x.com/search?q={query}"],
  ["twitteruser", "@", "X user", "https://x.com/{query}"],
  ["wiki", "wiki", "Wikipedia", "https://en.wikipedia.org/wiki/Special:Search/{query}"],
  ["amazon", "amazon", "Amazon", "https://www.amazon.com/s?k={query}"],
  ["imdb", "imdb", "IMDB", "https://www.imdb.com/find?s=all&q={query}"],
  ["ebay", "ebay", "eBay", "https://www.ebay.com/sch/i.html?_nkw={query}"],
  ["bing", "bing", "Bing", "https://www.bing.com/search?q={query}"],
  ["yahoo", "yahoo", "Yahoo", "https://search.yahoo.com/search?p={query}"],
  ["ask", "ask", "Ask", "https://www.ask.com/web?q={query}"],
  ["linkedin", "linkedin", "LinkedIn", "https://www.linkedin.com/search/results/all/?keywords={query}"],
  ["youtube", "youtube", "YouTube", "https://www.youtube.com/results?search_query={query}"],
  ["facebook", "facebook", "Facebook", "https://www.facebook.com/search/top/?q={query}"],
  ["flickr", "flickr", "Flickr", "https://www.flickr.com/search/?q={query}&w=all"],
  ["wolfram", "wolfram", "Wolfram Alpha", "https://www.wolframalpha.com/input/?i={query}"],
  ["yubnub", "yubnub", "YubNub", "https://www.yubnub.org/parser/parse?command={query}"],
  ["duckduckgo", "duck", "DuckDuckGo", "https://duckduckgo.com/?q={query}"],
  ["weather", "weather", "Google Weather", "https://www.google.com/search?q=weather+{query}"],
  ["rottentomatoes", "rotten", "Rotten Tomatoes", "https://www.rottentomatoes.com/search/?search={query}"],
  ["pinterest", "pinterest", "Pinterest", "https://www.pinterest.com/search/pins/?q={query}"],
  ["help", "help", "Alfred Help", "https://www.alfredapp.com/search/?q={query}"]
];

function plist(path) {
  const value = $.NSDictionary.dictionaryWithContentsOfFile($(path));
  return ObjC.deepUnwrap(value) || {};
}

function keywords(value) {
  return String(value || "").toLowerCase().split("||").map(value => value.trim()).filter(Boolean);
}

function searches(websearchPath, keyword) {
  const matches = [];
  for (const [id, defaultKeyword, name, url] of builtIns) {
    const settings = plist(`${websearchPath}/${id}/prefs.plist`);
    if (!settings.disabled && keywords(settings.keyword || defaultKeyword).includes(keyword)) {
      matches.push({id, title: `${name} for “{query}”`, url, utf8: true, plusSpaces: false});
    }
  }

  const custom = plist(`${websearchPath}/prefs.plist`).customSites || {};
  for (const id of Object.keys(custom)) {
    const search = custom[id];
    if (search.enabled !== false && keywords(search.keyword).includes(keyword)) {
      matches.push({
        id,
        title: search.text || "Web search for “{query}”",
        url: search.url,
        utf8: search.utf8 !== false,
        plusSpaces: Boolean(search.plusSpaces)
      });
    }
  }
  return matches;
}

function searchURL(search, query) {
  let encoded = search.utf8 ? encodeURIComponent(query) : query;
  if (search.plusSpaces) encoded = encoded.replace(/%20/g, "+");
  return String(search.url).replace(/\{query\}/g, encoded);
}

function directURL(query) {
  if (/^\/\//.test(query)) return `https:${query}`;
  if (/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#]|$)/i.test(query)) return `http://${query}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(query)) return query;
  if (!/\s/.test(query) && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:[/?#]|$)/i.test(query)) return `https://${query}`;
  return "";
}

function run(argv) {
  const query = argv.shift().trim();
  const websearchPath = argv.shift();
  const keywordQuery = query.match(/^(\S+)\s+(.+)$/);
  const matchedSearches = keywordQuery ? searches(websearchPath, keywordQuery[1].toLowerCase()) : [];
  const url = matchedSearches.length ? "" : directURL(query);
  const targets = matchedSearches.length
    ? matchedSearches.map(search => ({
        id: search.id,
        title: String(search.title).replace(/\{query\}/g, keywordQuery[2]),
        url: searchURL(search, keywordQuery[2])
      }))
    : [{
        id: url ? "url" : "google",
        title: url ? query : `Google for “${query}”`,
        url: url || `https://www.google.com/search?q=${encodeURIComponent(query)}`
      }];

  const items = [];
  for (let index = 0; index < argv.length; index += 2) {
    const browserName = argv[index];
    const browserPath = argv[index + 1];
    for (const target of targets) {
      items.push({
        uid: `${browserPath}:${target.id}`,
        title: query ? `${target.title} in ${browserName}` : `Open URL or search in ${browserName}`,
        subtitle: query ? target.url : "Type a URL, search, or Alfred web-search keyword",
        arg: target.url,
        valid: Boolean(query),
        icon: {type: "fileicon", path: browserPath},
        variables: {browser_path: browserPath}
      });
    }
  }

  if (!items.length) {
    items.push({
      title: "No browsers found in Alfred results",
      subtitle: "Open browser once, then run selector keyword again",
      valid: false
    });
  }
  return JSON.stringify({items});
}
