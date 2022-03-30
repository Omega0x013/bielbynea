/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path from "path";
import { Firestore } from "@google-cloud/firestore";

export default {
  // if they are GETing /create then they are a browser wishing to display
  // the page to the user. Send it to them.
  get: (req, res) =>
    res.status(200).sendFile(path.join(path.resolve() + "/static/create.html")),
  // if they are POSTing /create then they are intending to create a new post
  post: async (req, res) => {
    res.type("application/json");
    // check that the body holds the requisite components
    if (req.body && req.body.title && req.body.body) {
      // check that the cookies holds the requisite components
      if (req.cookies.username && req.cookies.token) {
        // verify the user
        try {
          const data = await db.users.doc(req.cookies.username).get().then(
            (doc) => doc.data(),
          );
          // check that: they are logged in; they are not banned
          if (data.token == req.cookies.token && data.points > 0) {
            // take today's date
            const now = Firestore.Timestamp.fromDate(new Date());
            // add the row to the posts table, sanitising the title and body
            const doc = await db.posts.add({
              title: req.body.title
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace("\n", "<br>"),
              body: req.body.body
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace("\n", "<br>"),
              nsfw: !!req.body.nsfw,
              author: db.users.doc(req.cookies.username),
              created: now,
              revised: now,
              removed: false,
            });
            // tell the browser it succeeded
            res.status(200).json({ message: doc.id });
          }
        } catch (e) {
          console.error(e.message);
          res.status(401).json({ error: "invalid-credentials" });
        }
      } else {
        res.status(401).json({ error: "invalid-credentials" });
      }
    } else {
      res.status(400).json({ error: "invalid-details" });
    }
  },
};
