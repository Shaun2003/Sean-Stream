// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "echo-social-3sy67",
  "appId": "1:430527962222:web:f2c50cd3c24a7c880dda7f",
  "storageBucket": "echo-social-3sy67.appspot.com",
  "apiKey": "AIzaSyDDiyhGZZk8ytznBDzerQiD5h0wjf-Ilnc",
  "authDomain": "echo-social-3sy67.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "430527962222"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
