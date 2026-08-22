function run(argv) {
  const rawLink = argv.shift().trim();
  let link = rawLink;
  if (link.startsWith("//")) {
    link = `https:${link}`;
  } else if (link && !/^[a-z][a-z0-9+.-]*:/i.test(link)) {
    link = `https://${link}`;
  }

  const items = [];
  for (let index = 0; index < argv.length; index += 2) {
    const browserName = argv[index];
    const browserPath = argv[index + 1];
    items.push({
      uid: browserPath,
      title: rawLink ? `Open in ${browserName}` : `Open link in ${browserName}`,
      subtitle: rawLink ? link : "Type or paste a link",
      arg: link,
      valid: Boolean(rawLink),
      icon: {type: "fileicon", path: browserPath},
      variables: {browser_path: browserPath}
    });
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
