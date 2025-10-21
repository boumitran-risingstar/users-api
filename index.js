const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const slugify = require('slugify');
const path = require('path');

const app = express();
const firestore = new Firestore();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// --- CRUD Operations ---

// Create
app.put('/users', async (req, res) => {
  const { name, email, uid } = req.body;

  if (!name || !email || !uid) {
    return res.status(400).send('Name, email, and uid are required');
  }

  const itemRef = firestore.collection('items').doc(uid);

  try {
    const itemDoc = await itemRef.get();

    if (itemDoc.exists) {
      return res.status(200).send('Document already exists.');
    } else {
      const slugURL = slugify(name) + '-' + uid;
      await itemRef.set({
        name,
        email,
        slugURL,
      });
      return res.status(201).send({ id: uid, name, email, slugURL });
    }
  } catch (error) {
    console.error('Error creating item:', error);
    return res.status(500).send('Error creating item');
  }
});

// Read
app.get('/users/:uid', async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const itemDoc = await firestore.collection('items').doc(uid).get();
    if (!itemDoc.exists) {
      return res.status(404).send('Item not found');
    }
    res.status(200).send({ id: itemDoc.id, ...itemDoc.data() });
  } catch (error) {
    console.error('Error reading item:', error);
    res.status(500).send('Error reading item');
  }
});

// Update
app.patch('/users/:uid', async (req, res) => {
    const { uid } = req.params;
    const { name, qualification, profession } = req.body;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const itemRef = firestore.collection('items').doc(uid);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return res.status(404).send('Item not found');
    }

    const updateData = {};
    if (name) {
        updateData.name = name;
    }
    if (qualification) {
        updateData.qualification = qualification;
    }
    if (profession) {
        updateData.profession = profession;
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).send('At least one field to update is required');
    }

    await itemRef.update(updateData);
    res.status(200).send('Item updated');
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).send('Error updating item');
  }
});

// Delete
app.delete('/users/:uid', async (req, res) => {
    const { uid } = req.params;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const itemRef = firestore.collection('items').doc(uid);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return res.status(404).send('Item not found');
    }

    await itemRef.delete();
    res.status(200).send('Item deleted');
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).send('Error deleting item');
  }
});

// Get user by slug
app.get('/users/slug/:slugURL', async (req, res) => {
    const { slugURL } = req.params;

    if (!slugURL) {
      return res.status(400).send('slugURL is required');
    }

    try {
      const itemsRef = firestore.collection('items');
      const snapshot = await itemsRef.where('slugURL', '==', slugURL).get();

      if (snapshot.empty) {
        return res.status(404).send('User not found');
      }

      const user = snapshot.docs[0];
      res.status(200).send({ id: user.id, ...user.data() });
    } catch (error) {
      console.error('Error getting user by slugURL:', error);
      res.status(500).send('Error getting user by slugURL');
    }
  });


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});