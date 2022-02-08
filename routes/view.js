/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default "/static/view.html";

/*
// Mnemonic for verifying the user
if (req.cookies.username && req.cookies.token) {
const query = await db.users.where("username", "==", req.cookies.username).get();
if (!query.empty) {
  const doc = query.docs[0];
  if (doc.data().token == req.cookies.token) {
    /**
     * User is validated
     * /
   }
  }
}
res.status(401).json({error: "credentials-invalid"})
*/
