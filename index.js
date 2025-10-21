const functions = require('firebase-functions');
const {Firestore} = require('@google-cloud/firestore');

const firestore = new Firestore();

exports.addUser = functions.https.onRequest(async (req, res) => {
  const {name, email} = req.body;

  try {
    const userRef = await firestore.collection('users').add({
      name,
      email,
    });
    res.status(200).send(`User added with ID: ${userRef.id}`);
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Error adding user');
  }
});
