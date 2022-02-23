/**
 * renderpost.js
 * Take the post list from a fetch and append them to a container
 * For e.g. /search
 */

/**
 * @param {Array<Object>} docs QuerySnapshot Documents
 * @param {Umbrella} container Umbrella object to append posts into
 */
const renderPosts = (docs, container) =>
  container.append(
    (doc) => `
<a href="/view/${doc.id}" style="color:inherit">
    <article class="card">
        <header style="font-weight:normal">
            <strong>${doc.title}</strong>
        </header>
        <footer style="font-size:0.75rem">
            <span>${doc.author._path.segments[1]}</span>
            <strong class="label ${doc.nsfw ? "error" : "success"}">${
      doc.nsfw ? "NSFW" : "SFW"
    }</strong>
            <i>${new Date(doc.revised._seconds * 1000).toUTCString()}</i>
    </article>
</a>`,
    docs,
  );
