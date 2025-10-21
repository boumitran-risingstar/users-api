const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const slugify = require('slugify');
const path = require('path');
const fs = require('fs');
const Joi = require('joi'); // Import Joi

const app = express();
const firestore = new Firestore();
const port = process.env.PORT || 8080;

app.use(express.json());

const openapiSpec = fs.readFileSync('openapi.yaml', 'utf8');

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.send(openapiSpec);
});

app.get('/openapi.yaml', (req, res) => {
    res.download('openapi.yaml');
});

// --- Joi Validation Schemas ---

const createUserSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    uid: Joi.string().required(),
});

const updateUserSchema = Joi.object({
    name: Joi.string().min(3).max(50),
    qualification: Joi.string(),
    profession: Joi.string(),
}).or('name', 'qualification', 'profession'); // Ensures at least one field is provided

// --- CRUD Operations ---

// Create
app.put('/users', async (req, res) => {
  // Validate the request body
  const { error, value } = createUserSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const { name, email, uid } = value;

  const userRef = firestore.collection('users').doc(uid);

  try {
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(200).send('Document already exists.');
    }

    const baseSlug = slugify(name, { lower: true, strict: true });
    const counterRef = firestore.collection('slug_counters').doc(baseSlug);
    let slugURL;

    await firestore.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount;

        if (!counterDoc.exists) {
            newCount = 1;
            slugURL = baseSlug;
        } else {
            newCount = counterDoc.data().count + 1;
            slugURL = `${baseSlug}-${newCount}`;
        }
        
        transaction.set(counterRef, { count: newCount }, { merge: true });

        transaction.set(userRef, {
            name,
            email,
            slugURL,
        });
    });

    return res.status(201).send({ id: uid, name, email, slugURL });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).send('Error creating user');
  }
});

// Read
app.get('/users/:uid', async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send('User not found');
    }
    res.status(200).send({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error('Error reading user:', error);
    res.status(500).send('Error reading user');
  }
});

// Update
app.patch('/users/:uid', async (req, res) => {
    const { uid } = req.params;
    
    // Validate the request body
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send('User not found');
    }

    await userRef.update(value); // Use the validated value object
    res.status(200).send('User updated');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Error updating user');
  }
});

// Delete
app.delete('/users/:uid', async (req, res) => {
    const { uid } = req.params;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send('User not found');
    }

    await userRef.delete();
    res.status(200).send('User deleted');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user');
  }
});

// Get user by slug
app.get('/users/slug/:slugURL', async (req, res) => {
    const { slugURL } = req.params;

    if (!slugURL) {
      return res.status(400).send('slugURL is required');
    }

    try {
      const usersRef = firestore.collection('users');
      const snapshot = await usersRef.where('slugURL', '==', slugURL).get();

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


// Start the server only if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// Export the app for testing
module.exports = app;
