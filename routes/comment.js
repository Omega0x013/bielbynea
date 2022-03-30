/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  get: async (req, res) => {
    try {
      // SELECT * FROM comments WHERE post == "?";
      const query = await db.comments.where(
        "post",
        "==",
        db.posts.doc(req.params.id),
      ).orderBy("created", "desc").get();

      if (!query.empty) {
        // Valid result, send it on
        res.status(200).json(query.docs.map((doc) => doc.data()));
      } else {
        // No result, send error
        res.status(400).json({ error: "result-empty" });
      }
    } catch (e) {
      // Invalid parameters, send error
      console.error(e.message);
      res.status(400).json({ error: "invalid-target" });
    }
  },
};
