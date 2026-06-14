import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd9_bwvI0PFeAo-TiZRAUiVRtwdOiOwEc",
  authDomain: "sound-record-2253b.firebaseapp.com",
  projectId: "sound-record-2253b",
  storageBucket: "sound-record-2253b.firebasestorage.app",
  messagingSenderId: "175685125624",
  appId: "1:175685125624:web:ffd9023a42b4ccdb71820d",
  measurementId: "G-8VX5V2NT51"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
