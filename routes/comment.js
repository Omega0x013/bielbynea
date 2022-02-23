/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  get: async (req, res) => {
    try {
      const query = await db.comments.where(
        "post",
        "==",
        db.posts.doc(req.params.id),
      ).orderBy("created", "desc").get();
      if (!query.empty) {
        res.status(200).json(query.docs.map((doc) => doc.data()));
      } else {
        res.status(400).json({ error: "result-empty" });
      }
    } catch (e) {
      console.error(e.message);
      res.status(400).json({ error: "invalid-target" });
    }
  },
};
