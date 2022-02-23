/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Firestore } from "@google-cloud/firestore";
import path from "path";

export default {
  get: async (req, res) => {
    if (req.accepts("html")) {
      /**
       * It's a browser
       */
      res.status(200).sendFile(
        path.join(path.resolve() + "/static/search.html"),
      );
    } else if (req.accepts("json")) {
      /**
       * It's the JS
       */

      // Don't show removed posts
      let query = db.posts.where("removed", "==", false);

      // Allow/disallow NSFW
      if (req.query.nsfw == "true") {
        query = query.where("nsfw", "in", [true, false]);
      } else {
        query = query.where("nsfw", "==", false);
      }

      // Select Author
      if (!!req.query.author) {
        query = query.where("author", "==", db.users.doc(req.query.author));
      }

      // From before date-time
      if (!!req.query.before) {
        query = query.where(
          "created",
          "<",
          Firestore.Timestamp.fromDate(new Date(req.query.before)),
        );
      }

      // Limit query
      query = query.limit(req.query.limit ? parseInt(req.query.limit) : 30);

      // Order results
      query = query.orderBy("created", "desc");

      const result = await query.get();
      if (!result.empty) {
        res.status(200).json(
          await result.docs.map((doc) =>
            Object.assign({ id: doc.id }, doc.data())
          ),
        );
      } else {
        res.status(400).json({ error: "empty" });
      }
    } else {
      /**
       * The server can't give a response in an acceptable type
       */
      res.status(406);
    }
  },
};
